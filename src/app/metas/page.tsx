"use client";

import { type FormEvent, useState } from "react";

import { Pagina } from "@/components/navegacion";
import { ConSesion, useConsulta, useSesion } from "@/components/sesion";
import { Aviso, Barra, Boton, Campo, Encabezado, Entrada, EntradaPesos, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { formatoPesos } from "@/lib/calculos";
import { aNumero, type Meta } from "@/lib/tipos";

export default function PaginaMetas() {
  return (
    <ConSesion>
      <Metas />
    </ConSesion>
  );
}

// Meses completos que quedan hasta la fecha límite (mínimo 1 si aún no llega).
function mesesHasta(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const limite = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  const meses = (limite.getFullYear() - hoy.getFullYear()) * 12 + (limite.getMonth() - hoy.getMonth()) - (limite.getDate() < hoy.getDate() ? 1 : 0);
  return limite < hoy ? 0 : Math.max(1, meses);
}

function Metas() {
  const metas = useConsulta<Meta[]>((sb) => sb.from("metas").select("*").order("created_at"), []);
  const lista = (metas.datos ?? []).map((m) => ({ ...m, objetivo: aNumero(m.objetivo), ahorrado: aNumero(m.ahorrado) }));
  const totalAhorrado = lista.reduce((s, m) => s + m.ahorrado, 0);

  return (
    <Pagina>
      <Encabezado descripcion="Aparta dinero para lo que quieres lograr." titulo="Metas de ahorro" />
      {lista.length > 0 ? (
        <Tarjeta>
          <p className="text-sm text-tinta-2">Llevas ahorrado en total</p>
          <p className="cifra font-semibold text-3xl">{formatoPesos(totalAhorrado)}</p>
        </Tarjeta>
      ) : null}
      {metas.error ? <Aviso tono="mal">No se pudieron cargar: {metas.error}</Aviso> : null}
      {metas.datos && lista.length === 0 ? <Vacio>Aún no tienes metas. Crea la primera abajo, por ejemplo “Fondo de emergencia”.</Vacio> : null}
      {lista.map((m) => (
        <TarjetaMeta key={m.id} meta={m} onCambio={metas.recargar} />
      ))}
      <NuevaMeta onCreada={metas.recargar} />
    </Pagina>
  );
}

function TarjetaMeta({ meta, onCambio }: { meta: Meta; onCambio: () => void }) {
  const { sb } = useSesion();
  const [cantidad, setCantidad] = useState("");
  const [error, setError] = useState("");
  const falta = Math.max(0, meta.objetivo - meta.ahorrado);
  const lograda = falta === 0;
  const meses = meta.fecha_limite ? mesesHasta(meta.fecha_limite) : null;

  const mover = async (signo: 1 | -1) => {
    const valor = Number(cantidad);
    if (!(valor > 0)) {
      setError("Escribe una cantidad mayor a cero.");
      return;
    }
    const nuevo = Math.round((meta.ahorrado + signo * valor) * 100) / 100;
    if (nuevo < 0) {
      setError("No puedes retirar más de lo que llevas ahorrado.");
      return;
    }
    setError("");
    const { error } = await sb.from("metas").update({ ahorrado: nuevo }).eq("id", meta.id);
    if (error) {
      setError(error.message);
      return;
    }
    setCantidad("");
    onCambio();
  };

  const borrar = async () => {
    if (window.confirm(`¿Borrar la meta "${meta.nombre}"?`)) {
      await sb.from("metas").delete().eq("id", meta.id);
      onCambio();
    }
  };

  return (
    <Tarjeta className="space-y-3">
      <Titulo accion={<Boton aria-label={`Borrar ${meta.nombre}`} className="px-2" onClick={() => void borrar()} variante="peligro">✕</Boton>}>
        {meta.nombre}
      </Titulo>
      <div className="flex items-baseline justify-between gap-2">
        <p className="cifra">
          <span className="font-semibold text-xl">{formatoPesos(meta.ahorrado)}</span>
          <span className="text-sm text-tinta-2"> de {formatoPesos(meta.objetivo)}</span>
        </p>
        <p className="cifra text-sm text-tinta-2">{Math.floor((meta.ahorrado / meta.objetivo) * 100)} %</p>
      </div>
      <Barra maximo={meta.objetivo} tono={lograda ? "bien" : "acento"} valor={meta.ahorrado} />
      <p className="text-sm text-tinta-2">
        {lograda ? (
          <span className="font-medium text-bien">✓ ¡Meta cumplida!</span>
        ) : meses === null ? (
          <>Te faltan <span className="cifra font-medium text-tinta">{formatoPesos(falta)}</span>.</>
        ) : meses === 0 ? (
          <span className="text-mal">La fecha límite ya pasó; te faltaron {formatoPesos(falta)}.</span>
        ) : (
          <>
            Para llegar a tiempo aparta{" "}
            <span className="cifra font-medium text-tinta">{formatoPesos(falta / meses)}</span> al mes durante {meses}{" "}
            {meses === 1 ? "mes" : "meses"}.
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-32 flex-1">
          <EntradaPesos aria-label={`Cantidad para ${meta.nombre}`} onChange={(e) => setCantidad(e.currentTarget.value)} placeholder="Cantidad" value={cantidad} />
        </div>
        <Boton onClick={() => void mover(1)}>Abonar</Boton>
        <Boton onClick={() => void mover(-1)} variante="secundario">
          Retirar
        </Boton>
      </div>
      {error ? <Aviso tono="mal">{error}</Aviso> : null}
    </Tarjeta>
  );
}

function NuevaMeta({ onCreada }: { onCreada: () => void }) {
  const { sb } = useSesion();
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [ahorrado, setAhorrado] = useState("");
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState("");

  const crear = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!(Number(objetivo) > 0)) {
      setError("La meta debe ser mayor a cero.");
      return;
    }
    const { error } = await sb.from("metas").insert({
      nombre: nombre.trim(),
      objetivo: Number(objetivo),
      ahorrado: Number(ahorrado) || 0,
      fecha_limite: fecha || null,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setError("");
    setNombre("");
    setObjetivo("");
    setAhorrado("");
    setFecha("");
    onCreada();
  };

  return (
    <Tarjeta>
      <Titulo>Nueva meta</Titulo>
      <form className="space-y-4" onSubmit={crear}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="¿Para qué ahorras?" id="meta-nombre">
            <Entrada id="meta-nombre" maxLength={60} onChange={(e) => setNombre(e.currentTarget.value)} placeholder="Ej. Fondo de emergencia" required value={nombre} />
          </Campo>
          <Campo etiqueta="¿Cuánto necesitas?" id="meta-objetivo">
            <EntradaPesos id="meta-objetivo" onChange={(e) => setObjetivo(e.currentTarget.value)} required value={objetivo} />
          </Campo>
          <Campo ayuda="Si ya tienes algo apartado." etiqueta="Ya llevo (opcional)" id="meta-ahorrado">
            <EntradaPesos id="meta-ahorrado" onChange={(e) => setAhorrado(e.currentTarget.value)} value={ahorrado} />
          </Campo>
          <Campo ayuda="Te diremos cuánto apartar al mes." etiqueta="¿Para cuándo? (opcional)" id="meta-fecha">
            <Entrada id="meta-fecha" onChange={(e) => setFecha(e.currentTarget.value)} type="date" value={fecha} />
          </Campo>
        </div>
        {error ? <Aviso tono="mal">{error}</Aviso> : null}
        <Boton type="submit">Crear meta</Boton>
      </form>
    </Tarjeta>
  );
}
