"use client";

import Link from "next/link";

import { Pagina } from "@/components/navegacion";
import { PlanQuincena } from "@/components/plan-quincena";
import { ConSesion, useConsulta, useSesion } from "@/components/sesion";
import { Barra, Boton, Encabezado, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { formatoPesos, mesActual, rangoDelMes } from "@/lib/calculos";
import { estadoPresupuesto } from "@/lib/presupuesto";
import { calcularMesResico, fechaLimitePago } from "@/lib/resico";
import { aNumero, type Categoria, type Meta, type Movimiento } from "@/lib/tipos";

export default function Inicio() {
  return (
    <ConSesion>
      <Resumen />
    </ConSesion>
  );
}

function Resumen() {
  const { sb, usuario } = useSesion();
  const mes = mesActual();
  const { desde, hasta } = rangoDelMes(mes);

  const movimientos = useConsulta<Pick<Movimiento, "tipo" | "monto" | "categoria_id" | "iva" | "con_factura">[]>(
    (sb) => sb.from("movimientos").select("tipo, monto, categoria_id, iva, con_factura").gte("fecha", desde).lte("fecha", hasta),
    [desde, hasta],
  );
  const categorias = useConsulta<Categoria[]>((sb) => sb.from("categorias").select("*").eq("tipo", "gasto"), []);
  const metas = useConsulta<Meta[]>((sb) => sb.from("metas").select("*").order("created_at"), []);

  const lista = (movimientos.datos ?? []).map((m) => ({ ...m, monto: aNumero(m.monto), iva: aNumero(m.iva) }));
  const impuestos = calcularMesResico(lista);

  const gastadoPor = new Map<string, number>();
  for (const m of lista) {
    if (m.tipo === "gasto" && m.categoria_id) {
      gastadoPor.set(m.categoria_id, (gastadoPor.get(m.categoria_id) ?? 0) + m.monto);
    }
  }
  // Solo las categorías que ya van en alerta o pasadas, de la más pasada a la menos.
  const alertas = (categorias.datos ?? [])
    .filter((c) => c.presupuesto !== null)
    .map((c) => ({ ...c, gastado: gastadoPor.get(c.id) ?? 0, limite: aNumero(c.presupuesto) }))
    .map((c) => ({ ...c, estado: estadoPresupuesto(c.gastado, c.limite) }))
    .filter((c) => c.estado.tono !== "bien")
    .sort((a, b) => b.estado.proporcion - a.estado.proporcion);


  return (
    <Pagina>
      <Encabezado
        accion={
          <Boton className="text-xs" onClick={() => void sb.auth.signOut()} variante="fantasma">
            Salir
          </Boton>
        }
        descripcion={usuario.email}
        titulo="Inicio"
      />

      <PlanQuincena onCambio={movimientos.recargar} />

      {impuestos.total > 0 ? (
        <Tarjeta>
          <Titulo accion={<Link className="text-acento text-sm" href="/resico">Ver detalle</Link>}>Impuestos RESICO</Titulo>
          <p className="text-sm text-tinta-2">
            De lo que facturaste este mes, aparta{" "}
            <span className="cifra font-semibold text-lg text-tinta">{formatoPesos(impuestos.total)}</span> para el SAT
            (ISR {formatoPesos(impuestos.isr)} + IVA {formatoPesos(impuestos.iva)}). Vence el{" "}
            {fechaLimitePago(mes).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}.
          </p>
        </Tarjeta>
      ) : null}

      {alertas.length > 0 ? (
        <Tarjeta>
          <Titulo accion={<Link className="text-acento text-sm" href="/presupuesto">Ver todo</Link>}>Presupuesto</Titulo>
          <ul className="space-y-3">
            {alertas.map((c) => (
              <li className="space-y-1" key={c.id}>
                <div className="flex justify-between text-sm">
                  <span>{c.nombre}</span>
                  <span className={c.estado.tono === "mal" ? "font-medium text-mal" : "font-medium text-alerta"}>
                    {c.estado.tono === "mal" ? "⚠ " : "! "}
                    {c.estado.texto} <span className="cifra">{formatoPesos(c.estado.cantidad)}</span>
                  </span>
                </div>
                <Barra maximo={c.limite} tono={c.estado.tono} valor={c.gastado} />
              </li>
            ))}
          </ul>
        </Tarjeta>
      ) : null}

      <Tarjeta>
        <Titulo accion={<Link className="text-acento text-sm" href="/metas">Ver metas</Link>}>Metas de ahorro</Titulo>
        {metas.datos && metas.datos.length === 0 ? <Vacio>Crea tu primera meta, como un fondo de emergencia.</Vacio> : null}
        <ul className="space-y-3">
          {(metas.datos ?? []).slice(0, 3).map((m) => {
            const objetivo = aNumero(m.objetivo);
            const ahorrado = aNumero(m.ahorrado);
            return (
              <li className="space-y-1" key={m.id}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{m.nombre}</span>
                  <span className="cifra text-tinta-2">
                    {formatoPesos(ahorrado)} / {formatoPesos(objetivo)}
                  </span>
                </div>
                <Barra maximo={objetivo} tono={ahorrado >= objetivo ? "bien" : "acento"} valor={ahorrado} />
              </li>
            );
          })}
        </ul>
      </Tarjeta>


      <Link className="text-center text-acento text-sm hover:underline" href="/calculadora">
        Calcular cuánto crecerían tus ahorros con interés compuesto →
      </Link>
    </Pagina>
  );
}
