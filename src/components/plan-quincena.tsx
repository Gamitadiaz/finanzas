"use client";

import Link from "next/link";
import { useState } from "react";

import { formatoPesos } from "@/lib/calculos";
import { pagarDeuda } from "@/lib/datos";
import { type Compromiso, calcularPlan, type DeudaPlan, type MovimientoPlan, type Recurrente } from "@/lib/plan";
import { aFecha, deFecha, describirPeriodo, diasEntre, periodoDe, periodoSiguiente } from "@/lib/quincenas";
import { aNumero } from "@/lib/tipos";

import { useConsulta, useSesion } from "./sesion";
import { Aviso, Barra, Boton, Tarjeta, Titulo } from "./ui";

export function PlanQuincena({ onCambio }: { onCambio?: () => void }) {
  const { sb } = useSesion();
  const hoy = aFecha(new Date());
  const actual = periodoDe(hoy);
  const siguiente = periodoSiguiente(actual);
  const [error, setError] = useState("");
  const [pagando, setPagando] = useState<string | null>(null);

  const recurrentes = useConsulta<Recurrente[]>((sb) => sb.from("recurrentes").select("*"), []);
  const deudas = useConsulta<DeudaPlan[]>((sb) => sb.from("deudas").select("id, nombre, saldo, pago_mensual, dia_pago"), []);
  const movimientos = useConsulta<MovimientoPlan[]>(
    (sb) =>
      sb
        .from("movimientos")
        .select("tipo, monto, fecha, categoria_id, deuda_id, recurrente_id")
        .gte("fecha", actual.inicio)
        .lte("fecha", siguiente.fin),
    [actual.inicio, siguiente.fin],
  );

  if (!recurrentes.datos || !deudas.datos || !movimientos.datos) {
    return <Tarjeta className="h-48 animate-pulse" />;
  }

  const listaRecurrentes = recurrentes.datos.map((r) => ({ ...r, monto: aNumero(r.monto) }));
  const listaDeudas = deudas.datos.map((d) => ({ ...d, saldo: aNumero(d.saldo), pago_mensual: aNumero(d.pago_mensual) }));
  const listaMovimientos = movimientos.datos.map((m) => ({ ...m, monto: aNumero(m.monto) }));
  const plan = calcularPlan(actual, listaRecurrentes, listaDeudas, listaMovimientos);
  const proximo = calcularPlan(siguiente, listaRecurrentes, listaDeudas, listaMovimientos);
  const diasRestantes = diasEntre(hoy, actual.fin) + 1;
  const sinSueldo = !listaRecurrentes.some((r) => r.tipo === "ingreso");

  const recargar = () => {
    deudas.recargar();
    movimientos.recargar();
    onCambio?.();
  };

  const pagar = async (c: Compromiso) => {
    const falta = Math.round((c.planeado - c.usado) * 100) / 100;
    if (!window.confirm(`¿Registrar hoy el pago de ${c.nombre} por ${formatoPesos(falta)}?`)) {
      return;
    }
    setPagando(c.clave);
    setError("");
    try {
      if (c.origen.tipo === "deuda") {
        await pagarDeuda(sb, c.origen.deuda, falta);
      } else {
        const { error } = await sb.from("movimientos").insert({
          tipo: "gasto",
          monto: falta,
          fecha: hoy,
          categoria_id: c.origen.recurrente.categoria_id,
          nota: c.nombre,
        });
        if (error) {
          throw new Error(error.message);
        }
      }
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el pago.");
    }
    setPagando(null);
  };

  return (
    <>
      <Tarjeta>
        <p className="text-sm text-tinta-2">Quincena del {describirPeriodo(actual)}</p>
        <p className="mt-1 text-sm text-tinta-2">Te quedan libres</p>
        <p className={`cifra font-semibold text-4xl ${plan.libre < 0 ? "text-mal" : ""}`}>{formatoPesos(plan.libre)}</p>
        {plan.libre > 0 ? (
          <p className="text-sm text-tinta-2">
            Unos <span className="cifra font-medium text-tinta">{formatoPesos(plan.libre / diasRestantes)}</span> por día durante{" "}
            {diasRestantes} {diasRestantes === 1 ? "día" : "días"}.
          </p>
        ) : plan.libre < 0 ? (
          <p className="text-mal text-sm">⚠ Esta quincena no alcanza para todo lo comprometido.</p>
        ) : null}

        <dl className="mt-4 space-y-1 border-borde border-t pt-3 text-sm">
          <Linea texto={plan.ingresosPorLlegar > 0 ? "Llegó + por llegar" : "Llegó"} valor={plan.ingresos} />
          {plan.ingresosExtra > 0 ? <Linea suave texto="  de eso, ingresos extra" valor={plan.ingresosExtra} /> : null}
          <Linea texto="Fijos y deudas de esta quincena" valor={-plan.comprometido} />
          <Linea texto="Otros gastos que ya hiciste" valor={-plan.gastoLibre} />
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="inline-flex min-h-10 items-center rounded-xl bg-acento px-4 font-medium text-acento-tinta text-sm" href="/movimientos">
            + Gasto o ingreso extra
          </Link>
          <Link className="inline-flex min-h-10 items-center rounded-xl border border-borde px-4 text-sm" href="/fijos">
            Editar fijos
          </Link>
        </div>
        {sinSueldo ? (
          <div className="mt-3">
            <Aviso tono="alerta">
              ! Agrega tu sueldo en <Link className="underline" href="/fijos">Editar fijos</Link> para que el plan sepa cuánto te llega.
            </Aviso>
          </div>
        ) : null}
      </Tarjeta>

      {plan.compromisos.length > 0 ? (
        <Tarjeta>
          <Titulo>Pagos de esta quincena</Titulo>
          {error ? <Aviso tono="mal">{error}</Aviso> : null}
          <ul className="divide-y divide-borde">
            {plan.compromisos.map((c) => (
              <FilaCompromiso
                compromiso={c}
                hoy={hoy}
                key={c.clave}
                onPagar={() => void pagar(c)}
                pagando={pagando === c.clave}
              />
            ))}
          </ul>
          {plan.pendiente > 0 ? (
            <p className="cifra mt-2 text-right text-tinta-2 text-xs">Falta por pagar: {formatoPesos(plan.pendiente)}</p>
          ) : null}
        </Tarjeta>
      ) : null}

      <Tarjeta>
        <Titulo>Próxima quincena · {deFecha(siguiente.inicio).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</Titulo>
        <dl className="space-y-1 text-sm">
          <Linea texto="Te llega" valor={proximo.ingresos} />
          <Linea texto="Fijos y deudas" valor={-proximo.comprometido} />
          <Linea fuerte texto="Te quedarían libres" valor={proximo.ingresos - proximo.comprometido} />
        </dl>
        {proximo.compromisos.length > 0 ? (
          <p className="mt-2 text-tinta-3 text-xs">
            {proximo.compromisos.map((c) => `${c.nombre} ${formatoPesos(c.planeado)}`).join(" · ")}
          </p>
        ) : null}
      </Tarjeta>
    </>
  );
}

function FilaCompromiso({
  compromiso: c,
  hoy,
  pagando,
  onPagar,
}: {
  compromiso: Compromiso;
  hoy: string;
  pagando: boolean;
  onPagar: () => void;
}) {
  const pagado = c.usado >= c.planeado - 0.005;
  // Lo que se reparte en la quincena (ej. gasolina) se va gastando; no se "paga" de una vez.
  const esApartado = c.fecha === null && c.origen.tipo === "fijo";
  const vencido = c.fecha !== null && c.fecha < hoy && !pagado;
  const fechaTexto = c.fecha
    ? deFecha(c.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
    : "toda la quincena";

  return (
    <li className="space-y-1.5 py-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{c.nombre}</p>
          <p className={`text-xs ${vencido ? "font-medium text-mal" : "text-tinta-3"}`}>
            {vencido ? "⚠ Venció el " : c.fecha ? "Vence el " : ""}
            {fechaTexto}
          </p>
        </div>
        {pagado ? (
          <span className="font-medium text-bien text-sm">✓ {esApartado ? "Completo" : "Pagado"}</span>
        ) : esApartado ? (
          <span className="cifra text-sm text-tinta-2">
            {formatoPesos(c.usado)} / {formatoPesos(c.planeado)}
          </span>
        ) : (
          <Boton className="min-h-9 px-3" disabled={pagando} onClick={onPagar} variante="secundario">
            Pagar {formatoPesos(c.planeado - c.usado)}
          </Boton>
        )}
      </div>
      {esApartado ? <Barra maximo={c.planeado} tono={c.usado > c.planeado ? "mal" : "acento"} valor={c.usado} /> : null}
      {esApartado && c.usado > c.planeado ? (
        <p className="text-mal text-xs">⚠ Te pasaste por {formatoPesos(c.usado - c.planeado)}.</p>
      ) : null}
    </li>
  );
}

function Linea({ texto, valor, fuerte, suave }: { texto: string; valor: number; fuerte?: boolean; suave?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${fuerte ? "border-borde border-t pt-1 font-semibold" : suave ? "text-tinta-3 text-xs" : "text-tinta-2"}`}>
      <dt className="whitespace-pre">{texto}</dt>
      <dd className={`cifra ${fuerte || suave ? "" : "text-tinta"}`}>{formatoPesos(valor)}</dd>
    </div>
  );
}
