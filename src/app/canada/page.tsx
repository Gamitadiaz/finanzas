"use client";

import Link from "next/link";

import { Pagina } from "@/components/navegacion";
import { ConSesion, useConsulta } from "@/components/sesion";
import { Aviso, Barra, Encabezado, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { formatoPesos, proyectarMeta } from "@/lib/calculos";
import type { Recurrente } from "@/lib/plan";
import { aFecha, deFecha } from "@/lib/quincenas";
import { aNumero, type Deuda, type Meta } from "@/lib/tipos";

// Rendimiento anual supuesto (caja de ahorro o Cetes). Es una estimación, no una promesa.
const TASA_SUPUESTA = 6;

// La meta y el ahorro del plan se reconocen por nombre: lo que diga "Canadá".
const esCanada = (nombre: string) => /canad[aá]/i.test(nombre);

export default function PaginaCanada() {
  return (
    <ConSesion>
      <PlanCanada />
    </ConSesion>
  );
}

function fechaLarga(fecha: string) {
  return deFecha(fecha).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function restarMeses(fecha: string, meses: number) {
  const d = deFecha(fecha);
  return aFecha(new Date(d.getFullYear(), d.getMonth() - meses, 1));
}

function PlanCanada() {
  const metas = useConsulta<Meta[]>((sb) => sb.from("metas").select("*").order("created_at"), []);
  const recurrentes = useConsulta<Recurrente[]>((sb) => sb.from("recurrentes").select("*"), []);
  const deudas = useConsulta<Deuda[]>((sb) => sb.from("deudas").select("*").order("saldo"), []);

  const error = metas.error || recurrentes.error || deudas.error;
  if (!metas.datos || !recurrentes.datos || !deudas.datos) {
    return (
      <Pagina>
        <Encabezado titulo="Plan Canadá" />
        {error ? <Aviso tono="mal">No se pudo cargar: {error}</Aviso> : <p className="text-tinta-2">Cargando…</p>}
      </Pagina>
    );
  }

  const meta = metas.datos.find((m) => esCanada(m.nombre));
  if (!meta || !meta.fecha_limite) {
    return (
      <Pagina>
        <Encabezado titulo="Plan Canadá" />
        <Vacio>
          Crea en <Link className="text-acento" href="/metas">Metas</Link> una meta con “Canadá” en el nombre y con fecha
          límite, y aquí verás tu plan.
        </Vacio>
      </Pagina>
    );
  }

  const hoy = aFecha(new Date());
  const objetivo = aNumero(meta.objetivo);
  const ahorrado = aNumero(meta.ahorrado);
  const fechaLimite = meta.fecha_limite;

  const vigentes = recurrentes.datos
    .map((r) => ({ ...r, monto: aNumero(r.monto) }))
    .filter((r) => r.hasta === null || r.hasta >= hoy);
  const porQuincena = (r: { monto: number; frecuencia: string }) => (r.frecuencia === "quincenal" ? r.monto : r.monto / 2);
  const ahorro = vigentes.find((r) => r.tipo === "gasto" && esCanada(r.nombre));
  const apartados = vigentes.filter((r) => r.tipo === "gasto" && r !== ahorro);
  const sueldo = vigentes.filter((r) => r.tipo === "ingreso").reduce((s, r) => s + porQuincena(r), 0);
  const libre = sueldo - apartados.reduce((s, r) => s + porQuincena(r), 0) - (ahorro ? porQuincena(ahorro) : 0);

  const inicioAhorro = ahorro && ahorro.desde > hoy ? ahorro.desde : hoy;
  const aporteMensual = ahorro ? porQuincena(ahorro) * 2 : 0;
  const proyeccion = proyectarMeta({ ahorrado, aporteMensual, tasaAnual: TASA_SUPUESTA, hoy, inicioAportes: inicioAhorro, fechaLimite });
  const necesario = proyeccion.aporteNecesario(objetivo);
  const vaATiempo = proyeccion.estimado >= objetivo;

  const pendientes = deudas.datos.map((d) => ({ ...d, saldo: aNumero(d.saldo) })).filter((d) => d.saldo > 0);
  const totalDeudas = pendientes.reduce((s, d) => s + d.saldo, 0);
  const enFaseDeudas = inicioAhorro > hoy || pendientes.length > 0;

  const hitos = [
    { fecha: hoy, texto: pendientes.length > 0 ? "Liquidar tus deudas" : "Deudas en cero ✓", hecho: pendientes.length === 0 },
    { fecha: inicioAhorro, texto: "Arranca el ahorro de cada quincena", hecho: inicioAhorro <= hoy && aporteMensual > 0 },
    { fecha: restarMeses(fechaLimite, 12), texto: "Juntar todo en una cuenta de banco a tu nombre, sin deudas", hecho: false },
    { fecha: fechaLimite, texto: "Aplicar a Express Entry", hecho: false },
  ];

  return (
    <Pagina>
      <Encabezado descripcion={meta.nombre} titulo="Plan Canadá" />

      <Tarjeta className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="cifra">
            <span className="font-semibold text-3xl">{formatoPesos(ahorrado)}</span>
            <span className="text-sm text-tinta-2"> de {formatoPesos(objetivo)}</span>
          </p>
          <p className="cifra text-sm text-tinta-2">{Math.floor((ahorrado / objetivo) * 100)} %</p>
        </div>
        <Barra maximo={objetivo} tono={ahorrado >= objetivo ? "bien" : "acento"} valor={ahorrado} />
        <p className="text-sm text-tinta-2">
          Fecha límite: {fechaLarga(fechaLimite)}. Abona lo que juntes en{" "}
          <Link className="text-acento" href="/metas">Metas</Link>.
        </p>
      </Tarjeta>

      <Tarjeta className="space-y-3">
        <Titulo>¿Vas a tiempo?</Titulo>
        {aporteMensual > 0 ? (
          <p className="text-sm text-tinta-2">
            Ahorrando <span className="cifra font-medium text-tinta">{formatoPesos(aporteMensual)}</span> al mes desde{" "}
            {fechaLarga(inicioAhorro)} ({proyeccion.mesesAportando} meses), con un rendimiento de ~{TASA_SUPUESTA} % al año,
            llegarías a <span className="cifra font-semibold text-tinta">{formatoPesos(proyeccion.estimado)}</span>.
          </p>
        ) : (
          <p className="text-sm text-tinta-2">
            Agrega en <Link className="text-acento" href="/fijos">Fijos</Link> un gasto quincenal llamado “Ahorro Canadá”
            para calcular tu proyección.
          </p>
        )}
        {aporteMensual > 0 ? (
          vaATiempo ? (
            <Aviso tono="bien">Vas bien: con ese ritmo alcanzas la meta.</Aviso>
          ) : (
            <Aviso tono="alerta">Te quedarías corto por {formatoPesos(objetivo - proyeccion.estimado)}.</Aviso>
          )
        ) : null}
        {necesario !== null ? (
          <p className="text-sm text-tinta-2">
            El mínimo para llegar justo serían{" "}
            <span className="cifra font-medium text-tinta">{formatoPesos(necesario)}</span> al mes.
          </p>
        ) : null}
      </Tarjeta>

      {enFaseDeudas && pendientes.length > 0 ? (
        <Tarjeta className="space-y-3">
          <Titulo accion={<Link className="text-acento text-sm" href="/deudas">Ver deudas</Link>}>Paso 1: cero deudas</Titulo>
          <p className="text-sm text-tinta-2">
            Antes de ahorrar, liquida lo que debes: lo prestado no cuenta como tus fondos para aplicar. Te faltan{" "}
            <span className="cifra font-medium text-tinta">{formatoPesos(totalDeudas)}</span>.
          </p>
          <ul className="space-y-1 text-sm">
            {pendientes.map((d) => (
              <li className="flex justify-between gap-2" key={d.id}>
                <span>{d.nombre}</span>
                <span className="cifra text-tinta-2">{formatoPesos(d.saldo)}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      ) : null}

      <Tarjeta className="space-y-3">
        <Titulo accion={<Link className="text-acento text-sm" href="/fijos">Editar</Link>}>Rutina de cada quincena</Titulo>
        <ol className="list-decimal space-y-3 pl-5 text-sm">
          <li>
            {ahorro ? (
              <>
                Día de pago: <strong>primero</strong> aparta{" "}
                <span className="cifra font-semibold">{formatoPesos(porQuincena(ahorro))}</span> para Canadá
                {ahorro.desde > hoy ? ` (desde ${fechaLarga(ahorro.desde)})` : ""}.
              </>
            ) : (
              "Día de pago: lo primero es el ahorro para Canadá."
            )}
          </li>
          {apartados.length > 0 ? (
            <li>
              Aparta los fijos:
              <ul className="mt-1 space-y-0.5 text-tinta-2">
                {apartados.map((r) => (
                  <li className="flex justify-between gap-2" key={r.id}>
                    <span>{r.nombre}</span>
                    <span className="cifra">{formatoPesos(porQuincena(r))}</span>
                  </li>
                ))}
              </ul>
            </li>
          ) : null}
          <li>
            {sueldo > 0 ? (
              <>
                Lo que queda, <span className="cifra font-semibold">{formatoPesos(libre)}</span>, es tu día a día.{" "}
              </>
            ) : (
              "Lo que queda es tu día a día. "
            )}
            Si te pasas, se ajusta de salidas o gastos hormiga, <strong>nunca</strong> de Canadá.
          </li>
        </ol>
      </Tarjeta>

      <Tarjeta>
        <Titulo>Camino</Titulo>
        <ol className="space-y-3 border-borde border-l pl-4">
          {hitos.map((h) => (
            <li className="relative text-sm" key={h.texto}>
              <span
                aria-hidden="true"
                className={`-left-[21px] absolute top-1.5 size-2.5 rounded-full ${h.hecho ? "bg-bien" : "bg-acento"}`}
              />
              <p className="text-tinta-3 text-xs">{h.fecha <= hoy ? "Ahora" : fechaLarga(h.fecha)}</p>
              <p className={h.hecho ? "text-tinta-2 line-through" : ""}>{h.texto}</p>
            </li>
          ))}
        </ol>
      </Tarjeta>

      <Tarjeta>
        <Titulo>Ingresos extra</Titulo>
        <ul className="space-y-1.5 text-sm text-tinta-2">
          <li><strong className="text-tinta">Aguinaldo:</strong> emergencias y francés.</li>
          <li><strong className="text-tinta">Fondo de ahorro:</strong> gastos del trámite; lo que sobre, a Canadá.</li>
          <li><strong className="text-tinta">Horas extra:</strong> emergencias y luego Canadá.</li>
          <li><strong className="text-tinta">Prima vacacional:</strong> para disfrutar.</li>
          <li><strong className="text-tinta">Vales:</strong> súper o despensa de casa.</li>
        </ul>
      </Tarjeta>

      <Tarjeta>
        <Titulo>Dónde guardarlo</Titulo>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-tinta-2">
          <li>Una caja de ahorro por el acceso a préstamos; el grueso en Cetesdirecto si la caja no da mejor tasa.</li>
          <li>Compara tasa, requisitos y CAT, y verifica que esté autorizada por la CNBV.</li>
          <li>El seguro de una caja cubre hasta 25,000 UDIS: no lo tengas todo en una sola.</li>
          <li>Préstamos solo si de verdad hacen falta, y saldados meses antes de aplicar.</li>
        </ul>
      </Tarjeta>
    </Pagina>
  );
}
