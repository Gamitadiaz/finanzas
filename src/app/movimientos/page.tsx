"use client";

import { type FormEvent, useState } from "react";

import { Pagina } from "@/components/navegacion";
import { SelectorMes } from "@/components/selector-mes";
import { ConSesion, useConsulta, useSesion } from "@/components/sesion";
import { Aviso, Boton, Campo, Encabezado, Entrada, EntradaPesos, Selector, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { formatoPesos, mesActual, rangoDelMes } from "@/lib/calculos";
import { ivaIncluido } from "@/lib/resico";
import { aNumero, type Categoria, type Movimiento, type TipoMovimiento } from "@/lib/tipos";

export default function PaginaMovimientos() {
  return (
    <ConSesion>
      <Movimientos />
    </ConSesion>
  );
}

function hoy() {
  const d = new Date();
  return `${mesActual(d)}-${String(d.getDate()).padStart(2, "0")}`;
}

function Movimientos() {
  const { sb } = useSesion();
  const [mes, setMes] = useState(mesActual());
  const { desde, hasta } = rangoDelMes(mes);

  const categorias = useConsulta<Categoria[]>((sb) => sb.from("categorias").select("*").order("nombre"), []);
  const movimientos = useConsulta<Movimiento[]>(
    (sb) =>
      sb
        .from("movimientos")
        .select("*")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false }),
    [desde, hasta],
  );

  const lista = (movimientos.datos ?? []).map((m) => ({ ...m, monto: aNumero(m.monto) }));
  const ingresos = lista.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
  const gastos = lista.filter((m) => m.tipo === "gasto").reduce((s, m) => s + m.monto, 0);
  const nombreCategoria = new Map((categorias.datos ?? []).map((c) => [c.id, c.nombre]));

  const borrar = async (id: string) => {
    if (!window.confirm("¿Borrar este movimiento?")) {
      return;
    }
    await sb.from("movimientos").delete().eq("id", id);
    movimientos.recargar();
  };

  // Agrupa por día para leer la lista como un estado de cuenta.
  const porDia = new Map<string, typeof lista>();
  for (const m of lista) {
    porDia.set(m.fecha, [...(porDia.get(m.fecha) ?? []), m]);
  }

  return (
    <Pagina>
      <Encabezado accion={<SelectorMes mes={mes} onCambio={setMes} />} titulo="Movimientos" />

      <section className="grid grid-cols-3 gap-2">
        <Resumen texto="Entró" tono="bien" valor={ingresos} />
        <Resumen texto="Salió" tono="mal" valor={gastos} />
        <Resumen texto="Te queda" tono={ingresos - gastos >= 0 ? "bien" : "mal"} valor={ingresos - gastos} />
      </section>

      <NuevoMovimiento
        categorias={categorias.datos ?? []}
        onCategoriaNueva={categorias.recargar}
        onGuardado={(fecha) => {
          setMes(fecha.slice(0, 7));
          movimientos.recargar();
        }}
      />

      <Tarjeta>
        <Titulo>Historial</Titulo>
        {movimientos.error ? <Aviso tono="mal">No se pudieron cargar: {movimientos.error}</Aviso> : null}
        {movimientos.datos && lista.length === 0 ? <Vacio>Aún no hay movimientos este mes.</Vacio> : null}
        <div className="space-y-4">
          {[...porDia.entries()].map(([fecha, delDia]) => (
            <div key={fecha}>
              <p className="mb-1 font-medium text-tinta-3 text-xs uppercase">
                {new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <ul className="divide-y divide-borde">
                {delDia.map((m) => (
                  <li className="flex items-center gap-3 py-2" key={m.id}>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm">
                        <span className="truncate">
                          {(m.categoria_id && nombreCategoria.get(m.categoria_id)) || "Sin categoría"}
                        </span>
                        {m.con_factura ? (
                          <span className="shrink-0 rounded-md border border-borde px-1.5 text-[10px] text-tinta-2">
                            Factura
                          </span>
                        ) : null}
                      </p>
                      {m.nota ? <p className="truncate text-tinta-3 text-xs">{m.nota}</p> : null}
                    </div>
                    <span className={`cifra font-medium text-sm ${m.tipo === "ingreso" ? "text-bien" : ""}`}>
                      {m.tipo === "ingreso" ? "+" : "−"}
                      {formatoPesos(m.monto)}
                    </span>
                    <Boton aria-label="Borrar movimiento" className="px-2" onClick={() => void borrar(m.id)} variante="peligro">
                      ✕
                    </Boton>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Tarjeta>
    </Pagina>
  );
}

function Resumen({ texto, valor, tono }: { texto: string; valor: number; tono: "bien" | "mal" }) {
  return (
    <Tarjeta className="p-3">
      <p className="text-tinta-2 text-xs">{texto}</p>
      <p className={`cifra truncate font-semibold text-sm sm:text-lg ${tono === "mal" && valor < 0 ? "text-mal" : ""}`}>
        {formatoPesos(valor)}
      </p>
    </Tarjeta>
  );
}

function NuevoMovimiento({
  categorias,
  onGuardado,
  onCategoriaNueva,
}: {
  categorias: Categoria[];
  onGuardado: (fecha: string) => void;
  onCategoriaNueva: () => void;
}) {
  const { sb } = useSesion();
  const [tipo, setTipo] = useState<TipoMovimiento>("gasto");
  const [monto, setMonto] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [nota, setNota] = useState("");
  const [conFactura, setConFactura] = useState(false);
  const [llevaIva, setLlevaIva] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Se captura lo que realmente se cobró o pagó; el IVA se separa de ese total.
  const cantidad = Number(monto) > 0 ? Math.round(Number(monto) * 100) / 100 : 0;
  const iva = conFactura && llevaIva ? ivaIncluido(cantidad) : 0;

  const opciones = categorias.filter((c) => c.tipo === tipo);
  const seleccion = opciones.some((c) => c.id === categoriaId) ? categoriaId : "";

  const crearCategoria = async () => {
    const nombre = window.prompt(`Nombre de la nueva categoría de ${tipo}:`)?.trim();
    if (!nombre) {
      return;
    }
    const { data, error } = await sb.from("categorias").insert({ nombre, tipo }).select("id").single();
    if (error) {
      setError(error.code === "23505" ? "Ya tienes una categoría con ese nombre." : error.message);
      return;
    }
    onCategoriaNueva();
    setCategoriaId(data.id);
  };

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!(cantidad > 0)) {
      setError("Escribe una cantidad mayor a cero.");
      return;
    }
    setGuardando(true);
    setError("");
    const { error } = await sb.from("movimientos").insert({
      tipo,
      monto: cantidad,
      categoria_id: seleccion || null,
      fecha,
      nota: nota.trim() || null,
      con_factura: conFactura,
      iva,
    });
    setGuardando(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMonto("");
    setNota("");
    setConFactura(false);
    onGuardado(fecha);
  };

  return (
    <Tarjeta>
      <form className="space-y-4" onSubmit={guardar}>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-fondo p-1" role="radiogroup" aria-label="Tipo">
          {(["gasto", "ingreso"] as const).map((t) => (
            <button
              aria-checked={tipo === t}
              className="min-h-10 rounded-lg font-medium text-sm text-tinta-2 aria-checked:bg-superficie aria-checked:text-tinta aria-checked:shadow-sm"
              key={t}
              onClick={() => setTipo(t)}
              role="radio"
              type="button"
            >
              {t === "gasto" ? "Gasto" : "Ingreso"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Cantidad" id="monto">
            <EntradaPesos id="monto" onChange={(e) => setMonto(e.currentTarget.value)} placeholder="0.00" required value={monto} />
          </Campo>
          <Campo etiqueta="Categoría" id="categoria">
            <Selector
              id="categoria"
              onChange={(e) => {
                if (e.currentTarget.value === "__nueva") {
                  void crearCategoria();
                } else {
                  setCategoriaId(e.currentTarget.value);
                }
              }}
              value={seleccion}
            >
              <option value="">Sin categoría</option>
              {opciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
              <option value="__nueva">+ Nueva categoría…</option>
            </Selector>
          </Campo>
          <Campo etiqueta="Fecha" id="fecha">
            <Entrada id="fecha" max={hoy()} onChange={(e) => setFecha(e.currentTarget.value)} required type="date" value={fecha} />
          </Campo>
          <Campo etiqueta="Nota (opcional)" id="nota">
            <Entrada id="nota" maxLength={200} onChange={(e) => setNota(e.currentTarget.value)} placeholder="Ej. Súper del domingo" value={nota} />
          </Campo>
        </div>
        <div className="space-y-2 rounded-xl bg-fondo p-3">
          <label className="flex items-center gap-2 text-sm">
            <input checked={conFactura} className="size-4" onChange={(e) => setConFactura(e.currentTarget.checked)} type="checkbox" />
            {tipo === "ingreso" ? "Lo facturé (cuenta para mis impuestos RESICO)" : "Tengo factura de este gasto (su IVA se resta)"}
          </label>
          {conFactura ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input checked={llevaIva} className="size-4" onChange={(e) => setLlevaIva(e.currentTarget.checked)} type="checkbox" />
                La cantidad ya incluye IVA (16 %)
              </label>
              {cantidad > 0 ? (
                <p className="cifra text-tinta-2 text-xs">
                  Subtotal {formatoPesos(cantidad - iva)} + IVA {formatoPesos(iva)} = {formatoPesos(cantidad)}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        {error ? <Aviso tono="mal">{error}</Aviso> : null}
        <Boton className="w-full sm:w-auto" disabled={guardando} type="submit">
          Agregar {tipo}
        </Boton>
      </form>
    </Tarjeta>
  );
}
