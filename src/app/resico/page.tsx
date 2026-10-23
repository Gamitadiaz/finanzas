"use client";

import Link from "next/link";
import { useState } from "react";

import { Pagina } from "@/components/navegacion";
import { SelectorMes } from "@/components/selector-mes";
import { ConSesion, useConsulta } from "@/components/sesion";
import { Aviso, Barra, Encabezado, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { formatoPesos, mesActual, nombreDelMes, rangoDelMes } from "@/lib/calculos";
import { calcularMesResico, fechaLimitePago, type MovimientoFiscal, TOPE_ANUAL_RESICO } from "@/lib/resico";
import { aNumero } from "@/lib/tipos";

export default function PaginaResico() {
  return (
    <ConSesion>
      <Resico />
    </ConSesion>
  );
}

function aFiscal(filas: MovimientoFiscal[] | null) {
  return (filas ?? []).map((m) => ({ ...m, monto: aNumero(m.monto), iva: aNumero(m.iva) }));
}

function Resico() {
  const [mes, setMes] = useState(mesActual());
  const { desde, hasta } = rangoDelMes(mes);
  const inicioAnio = `${mes.slice(0, 4)}-01-01`;

  const delMes = useConsulta<MovimientoFiscal[]>(
    (sb) => sb.from("movimientos").select("tipo, monto, iva, con_factura").eq("con_factura", true).gte("fecha", desde).lte("fecha", hasta),
    [desde, hasta],
  );
  // Ingresos facturados desde enero hasta el mes elegido, para vigilar el tope anual.
  const delAnio = useConsulta<MovimientoFiscal[]>(
    (sb) =>
      sb
        .from("movimientos")
        .select("tipo, monto, iva, con_factura")
        .eq("con_factura", true)
        .eq("tipo", "ingreso")
        .gte("fecha", inicioAnio)
        .lte("fecha", hasta),
    [inicioAnio, hasta],
  );

  const calculo = calcularMesResico(aFiscal(delMes.datos));
  const acumulado = aFiscal(delAnio.datos).reduce((s, m) => s + m.monto - m.iva, 0);
  const proporcionTope = acumulado / TOPE_ANUAL_RESICO;
  const limite = fechaLimitePago(mes);
  const hoy = new Date();
  const diasParaPagar = Math.ceil((limite.getTime() - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()) / 86_400_000);
  const sinMovimientos = delMes.datos !== null && delMes.datos.length === 0;

  return (
    <Pagina>
      <Encabezado
        accion={<SelectorMes mes={mes} onCambio={setMes} />}
        descripcion="Estimado de tu pago mensual de ISR e IVA en el Régimen Simplificado de Confianza."
        titulo="Impuestos RESICO"
      />

      {delMes.error ? <Aviso tono="mal">No se pudieron cargar: {delMes.error}</Aviso> : null}

      <Tarjeta>
        <p className="text-sm text-tinta-2">Pago estimado de {nombreDelMes(mes).toLowerCase()}</p>
        <p className="cifra font-semibold text-4xl">{formatoPesos(calculo.total)}</p>
        <p className="mt-1 text-sm text-tinta-2">
          Vence el{" "}
          <span className="font-medium text-tinta">
            {limite.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          {diasParaPagar >= 0 && diasParaPagar <= 31 ? (
            <span className={diasParaPagar <= 3 ? "font-medium text-mal" : ""}>
              {" "}
              ({diasParaPagar === 0 ? "hoy" : diasParaPagar === 1 ? "mañana" : `en ${diasParaPagar} días`})
            </span>
          ) : null}
          .
        </p>
        {calculo.total > 0 ? (
          <p className="mt-3 rounded-xl bg-fondo px-3 py-2 text-sm">
            Aparta esta cantidad desde ya para que el día del pago no te falte.
          </p>
        ) : null}
      </Tarjeta>

      {sinMovimientos ? (
        <Vacio>
          No hay movimientos con factura este mes. Al registrar un ingreso o gasto en{" "}
          <Link className="text-acento hover:underline" href="/movimientos">
            Movimientos
          </Link>
          , marca “Lo facturé” o “Tengo factura” para que cuente aquí.
        </Vacio>
      ) : null}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Tarjeta className="space-y-2">
          <Titulo>ISR</Titulo>
          <Fila texto="Ingresos facturados (sin IVA)" valor={calculo.ingresoSinIva} />
          <Fila texto="Tasa que te toca" textoValor={`${Number((calculo.tasa * 100).toFixed(2))} %`} />
          <Fila fuerte texto="ISR a pagar" valor={calculo.isr} />
          <p className="text-tinta-3 text-xs">
            En RESICO no hay deducciones: la tasa se aplica a todo lo que cobraste en el mes.
          </p>
        </Tarjeta>
        <Tarjeta className="space-y-2">
          <Titulo>IVA</Titulo>
          <Fila texto="IVA que cobraste" valor={calculo.ivaCobrado} />
          <Fila texto="IVA de tus gastos con factura" valor={-calculo.ivaAcreditable} />
          <Fila fuerte texto="IVA a pagar" valor={calculo.iva} />
          {calculo.ivaAFavor > 0 ? (
            <p className="text-bien text-xs">
              ✓ Te quedan {formatoPesos(calculo.ivaAFavor)} de IVA a favor. Pregúntale a tu contador cómo aplicarlo en los
              siguientes meses.
            </p>
          ) : null}
        </Tarjeta>
      </section>

      <Tarjeta className="space-y-2">
        <Titulo>Tope anual de RESICO</Titulo>
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-tinta-2">Facturado en {mes.slice(0, 4)}</span>
          <span className="cifra">
            <span className="font-semibold">{formatoPesos(acumulado)}</span> de {formatoPesos(TOPE_ANUAL_RESICO)}
          </span>
        </div>
        <Barra maximo={TOPE_ANUAL_RESICO} tono={proporcionTope >= 1 ? "mal" : proporcionTope >= 0.8 ? "alerta" : "bien"} valor={acumulado} />
        {proporcionTope >= 0.8 ? (
          <Aviso tono={proporcionTope >= 1 ? "mal" : "alerta"}>
            {proporcionTope >= 1
              ? "⚠ Rebasaste el tope: ya no puedes seguir en RESICO este año. Habla con tu contador."
              : "! Te estás acercando al tope de $3.5 millones. Si lo rebasas, sales de RESICO."}
          </Aviso>
        ) : (
          <p className="text-tinta-3 text-xs">Si en el año facturas más de $3.5 millones, sales de RESICO.</p>
        )}
      </Tarjeta>

      <Tarjeta className="space-y-2 text-sm text-tinta-2">
        <Titulo>Fechas que no se te pueden pasar</Titulo>
        <p>
          <span className="font-medium text-tinta">Cada mes, a más tardar el día 17:</span> pago de ISR e IVA del mes anterior en el
          portal del SAT. Si cae en fin de semana, se recorre al lunes.
        </p>
        <p>
          <span className="font-medium text-tinta">En abril:</span> declaración anual del año anterior.
        </p>
      </Tarjeta>

      <p className="text-center text-tinta-3 text-xs">
        Es un estimado con la tabla del art. 113-E de la Ley del ISR (sin cambios para 2026). Lo que vale es el cálculo de tu
        declaración en el SAT o el de tu contador. No incluye retenciones por facturar a empresas.
      </p>
    </Pagina>
  );
}

function Fila({ texto, valor, textoValor, fuerte }: { texto: string; valor?: number; textoValor?: string; fuerte?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 text-sm ${fuerte ? "border-borde border-t pt-2 font-semibold" : "text-tinta-2"}`}>
      <span>{texto}</span>
      <span className={`cifra ${fuerte ? "" : "text-tinta"}`}>{textoValor ?? formatoPesos(valor ?? 0)}</span>
    </div>
  );
}
