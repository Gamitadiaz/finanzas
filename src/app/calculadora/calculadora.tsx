"use client";

import { useState } from "react";

import { Pagina } from "@/components/navegacion";
import { Campo, Encabezado, Entrada, EntradaPesos, Selector, Tarjeta, Titulo } from "@/components/ui";
import { aporteParaMeta, formatoPesos, interesCompuesto } from "@/lib/calculos";

import { GraficaAhorro } from "./grafica-ahorro";

const CAPITALIZACIONES = [
  { valor: 365, texto: "Diaria" },
  { valor: 12, texto: "Mensual" },
  { valor: 4, texto: "Trimestral" },
  { valor: 2, texto: "Semestral" },
  { valor: 1, texto: "Anual" },
];

function numero(texto: string) {
  const n = Number(texto);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function Calculadora() {
  const [inicial, setInicial] = useState("10000");
  const [aporte, setAporte] = useState("1000");
  const [tasa, setTasa] = useState("10");
  const [anios, setAnios] = useState("10");
  const [capitalizacion, setCapitalizacion] = useState("12");
  const [aporteAlInicio, setAporteAlInicio] = useState(false);
  const [inflacion, setInflacion] = useState("4");
  const [meta, setMeta] = useState("");
  const [verTabla, setVerTabla] = useState(false);

  const entrada = {
    inicial: numero(inicial),
    aporteMensual: numero(aporte),
    tasaAnual: Math.min(numero(tasa), 200),
    anios: Math.min(numero(anios), 60),
    capitalizacion: Number(capitalizacion),
    aporteAlInicio,
    inflacionAnual: Math.min(numero(inflacion), 100),
  };
  // Son unos cientos de multiplicaciones: no hace falta memorizar el resultado.
  const { filas, final } = interesCompuesto(entrada);
  const aporteNecesario = numero(meta) > 0 ? aporteParaMeta(numero(meta), entrada) : null;
  const porcentajeIntereses = final.saldo > 0 ? Math.round((Math.max(0, final.intereses) / final.saldo) * 100) : 0;

  return (
    <Pagina>
      <Encabezado
        descripcion="Mira cuánto crece tu dinero si ahorras cada mes y los intereses también generan intereses."
        titulo="Calculadora de ahorro"
      />

      <Tarjeta>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo ayuda="Lo que ya tienes ahorrado hoy." etiqueta="Ahorro inicial" id="inicial">
            <EntradaPesos id="inicial" onChange={(e) => setInicial(e.currentTarget.value)} value={inicial} />
          </Campo>
          <Campo ayuda="Lo que vas a apartar cada mes." etiqueta="Aporte mensual" id="aporte">
            <EntradaPesos id="aporte" onChange={(e) => setAporte(e.currentTarget.value)} value={aporte} />
          </Campo>
          <Campo
            ayuda="La tasa anual que te da el banco o la inversión (ej. CETES ~10 %)."
            etiqueta="Interés anual (%)"
            id="tasa"
          >
            <Entrada
              className="cifra"
              id="tasa"
              inputMode="decimal"
              max="200"
              min="0"
              onChange={(e) => setTasa(e.currentTarget.value)}
              step="0.1"
              type="number"
              value={tasa}
            />
          </Campo>
          <Campo etiqueta="Años" id="anios">
            <Entrada
              className="cifra"
              id="anios"
              inputMode="decimal"
              max="60"
              min="0"
              onChange={(e) => setAnios(e.currentTarget.value)}
              step="0.5"
              type="number"
              value={anios}
            />
          </Campo>
          <Campo ayuda="Cada cuánto se suman los intereses a tu saldo." etiqueta="Capitalización" id="capitalizacion">
            <Selector
              id="capitalizacion"
              onChange={(e) => setCapitalizacion(e.currentTarget.value)}
              value={capitalizacion}
            >
              {CAPITALIZACIONES.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.texto}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo
            ayuda="Para saber cuánto vale ese dinero en pesos de hoy. Pon 0 para ignorarla."
            etiqueta="Inflación anual (%)"
            id="inflacion"
          >
            <Entrada
              className="cifra"
              id="inflacion"
              inputMode="decimal"
              max="100"
              min="0"
              onChange={(e) => setInflacion(e.currentTarget.value)}
              step="0.1"
              type="number"
              value={inflacion}
            />
          </Campo>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              checked={aporteAlInicio}
              className="size-4"
              onChange={(e) => setAporteAlInicio(e.currentTarget.checked)}
              type="checkbox"
            />
            Aporto al inicio de cada mes (gana un mes más de intereses)
          </label>
        </div>
      </Tarjeta>

      <section aria-label="Resultado" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tarjeta className="sm:col-span-3">
          <p className="text-sm text-tinta-2">
            En {entrada.anios} {entrada.anios === 1 ? "año" : "años"} tendrías
          </p>
          <p className="cifra font-semibold text-4xl">{formatoPesos(final.saldo)}</p>
          {entrada.inflacionAnual > 0 ? (
            <p className="mt-1 text-sm text-tinta-2">
              Equivale a <span className="cifra font-medium text-tinta">{formatoPesos(final.saldoReal)}</span> de hoy,
              con {entrada.inflacionAnual} % de inflación al año.
            </p>
          ) : null}
        </Tarjeta>
        <Dato color="var(--serie-1)" texto="Lo que aportas" valor={formatoPesos(final.aportado)} />
        <Dato color="var(--serie-2)" texto="Intereses ganados" valor={formatoPesos(Math.max(0, final.intereses))} />
        <Dato texto="Del total, son intereses" valor={`${porcentajeIntereses} %`} />
      </section>

      {filas.length > 0 ? (
        <Tarjeta>
          <Titulo
            accion={
              <button
                className="text-acento text-sm hover:underline"
                onClick={() => setVerTabla(!verTabla)}
                type="button"
              >
                {verTabla ? "Ver gráfica" : "Ver tabla"}
              </button>
            }
          >
            Cómo crece año por año
          </Titulo>
          {verTabla ? <TablaAnual filas={filas} /> : <GraficaAhorro filas={filas} />}
        </Tarjeta>
      ) : null}

      <Tarjeta>
        <Titulo>¿Cuánto debo ahorrar al mes para llegar a una meta?</Titulo>
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
          <Campo ayuda="Usa el ahorro inicial, interés y años de arriba." etiqueta="Quiero juntar" id="meta">
            <EntradaPesos id="meta" onChange={(e) => setMeta(e.currentTarget.value)} placeholder="500000" value={meta} />
          </Campo>
          <div aria-live="polite" className="text-sm">
            {aporteNecesario === null ? (
              <p className="text-tinta-3">Escribe una cantidad para calcularlo.</p>
            ) : aporteNecesario === 0 ? (
              <p>Con tu ahorro inicial ya llegas a la meta sin aportar más.</p>
            ) : (
              <p>
                Necesitas ahorrar{" "}
                <span className="cifra font-semibold text-lg">{formatoPesos(aporteNecesario)}</span> al mes.
              </p>
            )}
          </div>
        </div>
      </Tarjeta>
    </Pagina>
  );
}

function Dato({ texto, valor, color }: { texto: string; valor: string; color?: string }) {
  return (
    <Tarjeta>
      <p className="flex items-center gap-1.5 text-sm text-tinta-2">
        {color ? <span className="size-2.5 rounded-sm" style={{ background: color }} /> : null}
        {texto}
      </p>
      <p className="cifra font-semibold text-xl">{valor}</p>
    </Tarjeta>
  );
}

function TablaAnual({ filas }: { filas: ReturnType<typeof interesCompuesto>["filas"] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="cifra w-full min-w-md text-right text-sm">
        <thead className="text-tinta-2">
          <tr className="border-borde border-b">
            <th className="py-2 text-left font-medium">Año</th>
            <th className="py-2 font-medium">Aportado</th>
            <th className="py-2 font-medium">Intereses</th>
            <th className="py-2 font-medium">Saldo</th>
            <th className="py-2 font-medium">En pesos de hoy</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr className="border-borde border-b last:border-0" key={f.anio}>
              <td className="py-2 text-left">{Number.isInteger(f.anio) ? f.anio : f.anio.toFixed(1)}</td>
              <td className="py-2">{formatoPesos(f.aportado)}</td>
              <td className="py-2">{formatoPesos(Math.max(0, f.intereses))}</td>
              <td className="py-2 font-medium">{formatoPesos(f.saldo)}</td>
              <td className="py-2 text-tinta-2">{formatoPesos(f.saldoReal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
