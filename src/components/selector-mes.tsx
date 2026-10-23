"use client";

import { mesActual, moverMes, nombreDelMes } from "@/lib/calculos";

export function SelectorMes({ mes, onCambio }: { mes: string; onCambio: (mes: string) => void }) {
  const esActual = mes === mesActual();
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="Mes anterior"
        className="grid size-10 place-items-center rounded-xl hover:bg-superficie"
        onClick={() => onCambio(moverMes(mes, -1))}
        type="button"
      >
        ‹
      </button>
      <span className="min-w-36 text-center font-medium text-sm">{nombreDelMes(mes)}</span>
      <button
        aria-label="Mes siguiente"
        className="grid size-10 place-items-center rounded-xl hover:bg-superficie disabled:opacity-30"
        disabled={esActual}
        onClick={() => onCambio(moverMes(mes, 1))}
        type="button"
      >
        ›
      </button>
    </div>
  );
}
