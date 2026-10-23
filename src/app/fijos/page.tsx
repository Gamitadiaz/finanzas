"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import { Pagina } from "@/components/navegacion";
import { ConSesion, useConsulta, useSesion } from "@/components/sesion";
import { Aviso, Boton, Campo, Encabezado, Entrada, EntradaPesos, Selector, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { formatoPesos } from "@/lib/calculos";
import { categoriaPorNombre, registrarIngresosFijos } from "@/lib/datos";
import type { Recurrente } from "@/lib/plan";
import { aFecha, deFecha, periodoDe } from "@/lib/quincenas";
import { aNumero } from "@/lib/tipos";

export default function PaginaFijos() {
  return (
    <ConSesion>
      <Fijos />
    </ConSesion>
  );
}

function describirFrecuencia(r: Recurrente) {
  const cuando = r.frecuencia === "quincenal" ? "cada quincena" : `cada mes, el día ${r.dia_mes}`;
  const termina = r.hasta
    ? ` · termina ${deFecha(r.hasta).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}`
    : "";
  return cuando + termina;
}

function Fijos() {
  const { sb } = useSesion();
  const recurrentes = useConsulta<Recurrente[]>((sb) => sb.from("recurrentes").select("*").order("created_at"), []);
  const lista = (recurrentes.datos ?? []).map((r) => ({ ...r, monto: aNumero(r.monto) }));
  const ingresos = lista.filter((r) => r.tipo === "ingreso");
  const gastos = lista.filter((r) => r.tipo === "gasto");
  const [error, setError] = useState("");

  const cambiarMonto = async (r: Recurrente) => {
    const texto = window.prompt(`Nuevo monto para "${r.nombre}":`, String(r.monto));
    if (texto === null) {
      return;
    }
    const valor = Number(texto);
    if (!(valor > 0)) {
      setError("El monto debe ser mayor a cero.");
      return;
    }
    await sb.from("recurrentes").update({ monto: valor }).eq("id", r.id);
    recurrentes.recargar();
  };

  const borrar = async (r: Recurrente) => {
    if (window.confirm(`¿Quitar "${r.nombre}"? Lo que ya se registró se queda en tus movimientos.`)) {
      await sb.from("recurrentes").delete().eq("id", r.id);
      recurrentes.recargar();
    }
  };

  const listaDe = (items: Recurrente[], vacio: string) =>
    items.length === 0 ? (
      <Vacio>{vacio}</Vacio>
    ) : (
      <ul className="divide-y divide-borde">
        {items.map((r) => (
          <li className="flex items-center gap-2 py-2" key={r.id}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sm">{r.nombre}</p>
              <p className="text-tinta-3 text-xs">{describirFrecuencia(r)}</p>
            </div>
            <button className="cifra font-medium text-sm hover:underline" onClick={() => void cambiarMonto(r)} title="Cambiar monto" type="button">
              {formatoPesos(r.monto)}
            </button>
            <Boton aria-label={`Quitar ${r.nombre}`} className="px-2" onClick={() => void borrar(r)} variante="peligro">
              ✕
            </Boton>
          </li>
        ))}
      </ul>
    );

  return (
    <Pagina>
      <Link className="text-sm text-tinta-2 hover:text-tinta" href="/">
        ← Volver al inicio
      </Link>
      <Encabezado
        descripcion="Lo que entra y sale igual cada quincena o cada mes. Con esto se arma el plan de tu quincena."
        titulo="Ingresos y gastos fijos"
      />
      {error ? <Aviso tono="mal">{error}</Aviso> : null}

      <Tarjeta>
        <Titulo>Ingresos fijos</Titulo>
        {listaDe(ingresos, "Agrega tu sueldo: se registra solo cada día de pago.")}
      </Tarjeta>

      <Tarjeta>
        <Titulo>Gastos fijos</Titulo>
        {listaDe(gastos, "Agrega tu renta, gasolina, servicios, suscripciones…")}
        <p className="mt-3 text-tinta-3 text-xs">
          Los pagos de tus <Link className="text-acento hover:underline" href="/deudas">deudas</Link> entran solos al plan si
          tienen día de pago y pago mensual.
        </p>
      </Tarjeta>

      <NuevoFijo
        onCreado={async () => {
          await registrarIngresosFijos(sb);
          recurrentes.recargar();
        }}
      />
    </Pagina>
  );
}

const ATAJOS = [
  { nombre: "Sueldo", tipo: "ingreso", frecuencia: "quincenal", dia: "" },
  { nombre: "Renta", tipo: "gasto", frecuencia: "mensual", dia: "1" },
  { nombre: "Gasolina", tipo: "gasto", frecuencia: "quincenal", dia: "" },
] as const;

function NuevoFijo({ onCreado }: { onCreado: () => Promise<void> }) {
  const { sb } = useSesion();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"ingreso" | "gasto">("gasto");
  const [monto, setMonto] = useState("");
  const [frecuencia, setFrecuencia] = useState<"quincenal" | "mensual">("mensual");
  const [dia, setDia] = useState("1");
  const [hasta, setHasta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const crear = async (evento: FormEvent) => {
    evento.preventDefault();
    const cantidad = Number(monto);
    const diaMes = Number(dia);
    if (!(cantidad > 0)) {
      setError("El monto debe ser mayor a cero.");
      return;
    }
    if (frecuencia === "mensual" && !(diaMes >= 1 && diaMes <= 31)) {
      setError("El día va del 1 al 31.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      // Cada fijo tiene su propia categoría para saber cuánto llevas gastado de él (ej. gasolina).
      const categoria = await categoriaPorNombre(sb, nombre.trim(), tipo);
      const { error } = await sb.from("recurrentes").insert({
        nombre: nombre.trim(),
        tipo,
        monto: cantidad,
        frecuencia,
        dia_mes: frecuencia === "mensual" ? diaMes : null,
        categoria_id: categoria,
        // Empieza en la quincena actual para que el plan de hoy ya lo cuente.
        desde: periodoDe(aFecha(new Date())).inicio,
        hasta: hasta || null,
      });
      if (error) {
        throw new Error(error.message);
      }
      setNombre("");
      setMonto("");
      setHasta("");
      await onCreado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
    setGuardando(false);
  };

  return (
    <Tarjeta>
      <Titulo>Agregar</Titulo>
      <div className="mb-4 flex flex-wrap gap-2">
        {ATAJOS.map((a) => (
          <button
            className="rounded-full border border-borde px-3 py-1 text-sm hover:bg-fondo"
            key={a.nombre}
            onClick={() => {
              setNombre(a.nombre);
              setTipo(a.tipo);
              setFrecuencia(a.frecuencia);
              setDia(a.dia || "1");
            }}
            type="button"
          >
            + {a.nombre}
          </button>
        ))}
      </div>
      <form className="space-y-4" onSubmit={crear}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre" id="fijo-nombre">
            <Entrada id="fijo-nombre" maxLength={40} onChange={(e) => setNombre(e.currentTarget.value)} placeholder="Ej. Internet" required value={nombre} />
          </Campo>
          <Campo etiqueta="¿Entra o sale?" id="fijo-tipo">
            <Selector id="fijo-tipo" onChange={(e) => setTipo(e.currentTarget.value as "ingreso" | "gasto")} value={tipo}>
              <option value="gasto">Gasto (sale)</option>
              <option value="ingreso">Ingreso (entra)</option>
            </Selector>
          </Campo>
          <Campo
            ayuda={frecuencia === "quincenal" ? "Lo que corresponde a UNA quincena." : "Lo que pagas en el mes."}
            etiqueta="Monto"
            id="fijo-monto"
          >
            <EntradaPesos id="fijo-monto" onChange={(e) => setMonto(e.currentTarget.value)} required value={monto} />
          </Campo>
          <Campo etiqueta="¿Cada cuándo?" id="fijo-frecuencia">
            <Selector id="fijo-frecuencia" onChange={(e) => setFrecuencia(e.currentTarget.value as "quincenal" | "mensual")} value={frecuencia}>
              <option value="quincenal">Cada quincena (15 y fin de mes)</option>
              <option value="mensual">Una vez al mes</option>
            </Selector>
          </Campo>
          {frecuencia === "mensual" ? (
            <Campo ayuda="Si el mes es más corto, se toma el último día." etiqueta="Día del mes" id="fijo-dia">
              <Entrada className="cifra" id="fijo-dia" inputMode="numeric" max="31" min="1" onChange={(e) => setDia(e.currentTarget.value)} type="number" value={dia} />
            </Campo>
          ) : null}
          <Campo ayuda="Déjalo vacío si no tiene fin." etiqueta="¿Hasta cuándo? (opcional)" id="fijo-hasta">
            <Entrada id="fijo-hasta" onChange={(e) => setHasta(e.currentTarget.value)} type="date" value={hasta} />
          </Campo>
        </div>
        {error ? <Aviso tono="mal">{error}</Aviso> : null}
        <Boton disabled={guardando} type="submit">
          Agregar
        </Boton>
      </form>
    </Tarjeta>
  );
}
