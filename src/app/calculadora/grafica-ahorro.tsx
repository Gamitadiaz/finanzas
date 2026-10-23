"use client";

import { useEffect, useRef, useState } from "react";

import { type FilaAnual, formatoPesos, formatoPesosCorto } from "@/lib/calculos";

const ALTO = 260;
const MARGEN = { arriba: 16, derecha: 12, abajo: 28, izquierda: 56 };

// Escala "bonita": 4-5 marcas redondas desde 0 hasta un poco arriba del máximo.
function marcas(maximo: number) {
  if (maximo <= 0) {
    return [0];
  }
  const paso0 = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map((f) => f * potencia).find((p) => p >= paso0) ?? paso0;
  const lista = [];
  for (let v = 0; v <= maximo + paso * 0.001; v += paso) {
    lista.push(v);
  }
  if (lista[lista.length - 1] < maximo) {
    lista.push(lista[lista.length - 1] + paso);
  }
  return lista;
}

export function GraficaAhorro({ filas }: { filas: FilaAnual[] }) {
  const [activa, setActiva] = useState<number | null>(null);
  // El SVG mide lo mismo que su contenedor para que el texto no se encoja en el celular.
  const contenedor = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(640);
  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) {
      return;
    }
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.max(280, Math.round(entrada.contentRect.width))));
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);
  if (filas.length === 0) {
    return null;
  }

  const ejeY = marcas(Math.max(...filas.map((f) => f.saldo)));
  const tope = ejeY[ejeY.length - 1] || 1;
  const anchoPlot = ancho - MARGEN.izquierda - MARGEN.derecha;
  const altoPlot = ALTO - MARGEN.arriba - MARGEN.abajo;
  const columna = anchoPlot / filas.length;
  const anchoBarra = Math.max(2, Math.min(28, columna * 0.6));
  const y = (valor: number) => MARGEN.arriba + altoPlot - (Math.max(0, valor) / tope) * altoPlot;
  // Con muchos años, etiquetar solo algunos para que no se encimen.
  const cadaCuanto = Math.ceil(filas.length / Math.max(4, Math.floor(anchoPlot / 44)));
  const fila = activa === null ? null : filas[activa];

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-4 text-sm text-tinta-2">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm" style={{ background: "var(--serie-1)" }} />
          Lo que tú aportas
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm" style={{ background: "var(--serie-2)" }} />
          Intereses ganados
        </li>
      </ul>

      <div className="relative" ref={contenedor}>
        <svg
          aria-label="Saldo acumulado por año: lo que aportas y los intereses ganados"
          className="h-auto w-full"
          onMouseLeave={() => setActiva(null)}
          role="img"
          viewBox={`0 0 ${ancho} ${ALTO}`}
        >
          {ejeY.map((valor) => (
            <g key={valor}>
              <line
                stroke={valor === 0 ? "var(--eje)" : "var(--rejilla)"}
                strokeWidth={1}
                x1={MARGEN.izquierda}
                x2={ancho - MARGEN.derecha}
                y1={y(valor)}
                y2={y(valor)}
              />
              <text
                className="cifra"
                dominantBaseline="middle"
                fill="var(--tinta-3)"
                fontSize={11}
                textAnchor="end"
                x={MARGEN.izquierda - 8}
                y={y(valor)}
              >
                {formatoPesosCorto(valor)}
              </text>
            </g>
          ))}

          {filas.map((f, i) => {
            const x = MARGEN.izquierda + columna * i + (columna - anchoBarra) / 2;
            const yAportado = y(Math.min(f.aportado, f.saldo));
            const ySaldo = y(f.saldo);
            const base = y(0);
            // 2 px de separación entre los dos tramos, con el color de la superficie.
            const hayIntereses = f.intereses > 0 && yAportado - ySaldo > 3;
            const radio = Math.min(4, anchoBarra / 2);
            const atenuada = activa !== null && activa !== i;
            return (
              <g key={f.anio} opacity={atenuada ? 0.45 : 1}>
                <path
                  d={barraRedondeada(x, yAportado, anchoBarra, base - yAportado, hayIntereses ? 0 : radio)}
                  fill="var(--serie-1)"
                />
                {hayIntereses ? (
                  <path
                    d={barraRedondeada(x, ySaldo, anchoBarra, yAportado - ySaldo - 2, radio)}
                    fill="var(--serie-2)"
                  />
                ) : null}
                {i % cadaCuanto === 0 || i === filas.length - 1 ? (
                  <text
                    fill="var(--tinta-3)"
                    fontSize={11}
                    textAnchor="middle"
                    x={x + anchoBarra / 2}
                    y={ALTO - MARGEN.abajo + 16}
                  >
                    {Number.isInteger(f.anio) ? f.anio : f.anio.toFixed(1)}
                  </text>
                ) : null}
                {/* Zona de hover más ancha que la barra. */}
                <rect
                  fill="transparent"
                  height={altoPlot}
                  onMouseEnter={() => setActiva(i)}
                  onTouchStart={() => setActiva(i)}
                  width={columna}
                  x={MARGEN.izquierda + columna * i}
                  y={MARGEN.arriba}
                />
              </g>
            );
          })}
        </svg>

        {fila && activa !== null ? (
          <div
            className="pointer-events-none absolute top-0 z-10 w-52 rounded-xl border border-borde bg-superficie p-3 text-sm shadow-lg"
            style={{
              left: `clamp(0px, calc(${((MARGEN.izquierda + columna * (activa + 0.5)) / ancho) * 100}% - 104px), calc(100% - 208px))`,
            }}
          >
            <p className="mb-1 font-medium">
              Año {Number.isInteger(fila.anio) ? fila.anio : fila.anio.toFixed(1)}
            </p>
            <Linea color="var(--serie-2)" texto="Intereses" valor={fila.intereses} />
            <Linea color="var(--serie-1)" texto="Aportado" valor={fila.aportado} />
            <div className="mt-1 flex justify-between border-borde border-t pt-1 font-medium">
              <span>Total</span>
              <span className="cifra">{formatoPesos(fila.saldo)}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Linea({ color, texto, valor }: { color: string; texto: string; valor: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-tinta-2">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm" style={{ background: color }} />
        {texto}
      </span>
      <span className="cifra text-tinta">{formatoPesos(valor)}</span>
    </div>
  );
}

// Rectángulo con solo las esquinas de arriba redondeadas (el extremo del dato).
function barraRedondeada(x: number, y: number, ancho: number, alto: number, radio: number) {
  const h = Math.max(0, alto);
  const r = Math.min(radio, h, ancho / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + ancho - r} Q${x + ancho},${y} ${x + ancho},${y + r} V${y + h} Z`;
}
