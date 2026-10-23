"use client";

import { type FormEvent, useState } from "react";

import { Pagina } from "@/components/navegacion";
import { SelectorMes } from "@/components/selector-mes";
import { ConSesion, useConsulta, useSesion } from "@/components/sesion";
import { Aviso, Barra, Boton, Campo, Encabezado, Entrada, EntradaPesos, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { formatoPesos, mesActual, rangoDelMes } from "@/lib/calculos";
import { estadoPresupuesto } from "@/lib/presupuesto";
import { aNumero, type Categoria } from "@/lib/tipos";

export default function PaginaPresupuesto() {
  return (
    <ConSesion>
      <Presupuesto />
    </ConSesion>
  );
}

function Presupuesto() {
  const { sb } = useSesion();
  const [mes, setMes] = useState(mesActual());
  const { desde, hasta } = rangoDelMes(mes);
  const [error, setError] = useState("");

  const categorias = useConsulta<Categoria[]>(
    (sb) => sb.from("categorias").select("*").eq("tipo", "gasto").order("nombre"),
    [],
  );
  const gastos = useConsulta<{ categoria_id: string | null; monto: number }[]>(
    (sb) => sb.from("movimientos").select("categoria_id, monto").eq("tipo", "gasto").gte("fecha", desde).lte("fecha", hasta),
    [desde, hasta],
  );

  const gastadoPor = new Map<string, number>();
  for (const g of gastos.datos ?? []) {
    const clave = g.categoria_id ?? "";
    gastadoPor.set(clave, (gastadoPor.get(clave) ?? 0) + aNumero(g.monto));
  }
  const lista = (categorias.datos ?? []).map((c) => ({
    ...c,
    presupuesto: c.presupuesto === null ? null : aNumero(c.presupuesto),
    gastado: gastadoPor.get(c.id) ?? 0,
  }));
  const conPresupuesto = lista.filter((c) => c.presupuesto !== null);
  const totalPresupuesto = conPresupuesto.reduce((s, c) => s + (c.presupuesto ?? 0), 0);
  const totalGastado = [...gastadoPor.values()].reduce((s, v) => s + v, 0);
  const sinCategoria = gastadoPor.get("") ?? 0;

  const guardarLimite = async (id: string, texto: string) => {
    const valor = texto.trim() === "" ? null : Number(texto);
    if (valor !== null && !(valor >= 0)) {
      setError("El límite debe ser un número mayor o igual a cero.");
      return;
    }
    setError("");
    const { error } = await sb.from("categorias").update({ presupuesto: valor }).eq("id", id);
    if (error) {
      setError(error.message);
    }
    categorias.recargar();
  };

  const borrarCategoria = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Borrar la categoría "${nombre}"? Sus gastos quedan como "Sin categoría".`)) {
      return;
    }
    await sb.from("categorias").delete().eq("id", id);
    categorias.recargar();
    gastos.recargar();
  };

  return (
    <Pagina>
      <Encabezado
        accion={<SelectorMes mes={mes} onCambio={setMes} />}
        descripcion="Ponle un límite mensual a cada categoría de gasto."
        titulo="Presupuesto"
      />

      {totalPresupuesto > 0 ? (
        <Tarjeta className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm text-tinta-2">Gastado del presupuesto</p>
            <p className="cifra text-sm">
              <span className="font-semibold text-lg">{formatoPesos(totalGastado)}</span> de {formatoPesos(totalPresupuesto)}
            </p>
          </div>
          <Barra maximo={totalPresupuesto} tono={estadoPresupuesto(totalGastado, totalPresupuesto).tono} valor={totalGastado} />
        </Tarjeta>
      ) : null}

      {error ? <Aviso tono="mal">{error}</Aviso> : null}

      <Tarjeta>
        <Titulo>Categorías de gasto</Titulo>
        {categorias.datos && lista.length === 0 ? <Vacio>Aún no tienes categorías de gasto.</Vacio> : null}
        <ul className="divide-y divide-borde">
          {lista.map((c) => {
            const estado = c.presupuesto !== null ? estadoPresupuesto(c.gastado, c.presupuesto) : null;
            return (
              <li className="space-y-2 py-3" key={c.id}>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate font-medium text-sm">{c.nombre}</p>
                  <LimiteEditable
                    etiqueta={`Límite mensual de ${c.nombre}`}
                    onGuardar={(texto) => void guardarLimite(c.id, texto)}
                    valor={c.presupuesto}
                  />
                  <Boton aria-label={`Borrar ${c.nombre}`} className="px-2" onClick={() => void borrarCategoria(c.id, c.nombre)} variante="peligro">
                    ✕
                  </Boton>
                </div>
                {estado && c.presupuesto !== null ? (
                  <>
                    <Barra maximo={c.presupuesto} tono={estado.tono} valor={c.gastado} />
                    <p className="flex justify-between text-tinta-2 text-xs">
                      <span className="cifra">Gastado {formatoPesos(c.gastado)}</span>
                      <span className={estado.tono === "mal" ? "font-medium text-mal" : estado.tono === "alerta" ? "font-medium text-alerta" : ""}>
                        {estado.tono === "mal" ? "⚠ " : estado.tono === "alerta" ? "! " : ""}
                        {estado.texto} <span className="cifra">{formatoPesos(estado.cantidad)}</span>
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="cifra text-tinta-3 text-xs">
                    Gastado {formatoPesos(c.gastado)} · sin límite
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        {sinCategoria > 0 ? (
          <p className="cifra mt-2 text-tinta-3 text-xs">Gastos sin categoría este mes: {formatoPesos(sinCategoria)}</p>
        ) : null}
        <NuevaCategoria onCreada={categorias.recargar} />
      </Tarjeta>
    </Pagina>
  );
}

function LimiteEditable({ valor, etiqueta, onGuardar }: { valor: number | null; etiqueta: string; onGuardar: (texto: string) => void }) {
  const [texto, setTexto] = useState(valor === null ? "" : String(valor));
  const original = valor === null ? "" : String(valor);
  return (
    <div className="w-32">
      <EntradaPesos
        aria-label={etiqueta}
        className="min-h-9 text-sm"
        onBlur={() => {
          if (texto !== original) {
            onGuardar(texto);
          }
        }}
        onChange={(e) => setTexto(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        placeholder="Sin límite"
        value={texto}
      />
    </div>
  );
}

function NuevaCategoria({ onCreada }: { onCreada: () => void }) {
  const { sb } = useSesion();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");

  const crear = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!nombre.trim()) {
      return;
    }
    const { error } = await sb.from("categorias").insert({ nombre: nombre.trim(), tipo: "gasto" });
    if (error) {
      setError(error.code === "23505" ? "Ya tienes una categoría con ese nombre." : error.message);
      return;
    }
    setError("");
    setNombre("");
    onCreada();
  };

  return (
    <form className="mt-4 space-y-2 border-borde border-t pt-4" onSubmit={crear}>
      <div className="flex items-end gap-2">
        <Campo className="flex-1" etiqueta="Nueva categoría" id="nueva-categoria">
          <Entrada id="nueva-categoria" maxLength={40} onChange={(e) => setNombre(e.currentTarget.value)} placeholder="Ej. Mascotas" value={nombre} />
        </Campo>
        <Boton type="submit" variante="secundario">
          Agregar
        </Boton>
      </div>
      {error ? <Aviso tono="mal">{error}</Aviso> : null}
    </form>
  );
}
