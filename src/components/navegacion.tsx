"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const SECCIONES = [
  { href: "/", texto: "Inicio", corto: "Inicio", icono: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { href: "/movimientos", texto: "Movimientos", corto: "Movs.", icono: "M7 4v16M7 4l-3 3M7 4l3 3M17 20V4m0 16l-3-3m3 3l3-3" },
  { href: "/presupuesto", texto: "Presupuesto", corto: "Presup.", icono: "M12 3a9 9 0 1 0 9 9h-9z M14 3.3A9 9 0 0 1 20.7 10H14z" },
  { href: "/metas", texto: "Metas", corto: "Metas", icono: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" },
  { href: "/deudas", texto: "Deudas", corto: "Deudas", icono: "M3 6h18v12H3zM3 10h18M7 15h4" },
  { href: "/resico", texto: "Impuestos RESICO", corto: "SAT", icono: "M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h3" },
  { href: "/calculadora", texto: "Calculadora", corto: "Calc.", icono: "M5 3h14v18H5zM8 7h8M8 12h2m3 0h3M8 16h2m3 0h3" },
];

function Icono({ d }: { d: string }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <path d={d} />
    </svg>
  );
}

export function Navegacion() {
  const ruta = usePathname();
  const activa = (href: string) => (href === "/" ? ruta === "/" : ruta.startsWith(href));

  return (
    <>
      {/* Escritorio: barra lateral */}
      <nav aria-label="Secciones" className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 border-borde border-r p-4 md:flex">
        <p className="mb-4 px-3 font-semibold text-lg">Mis Finanzas</p>
        {SECCIONES.map((s) => (
          <Link
            aria-current={activa(s.href) ? "page" : undefined}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-tinta-2 hover:bg-superficie aria-[current=page]:bg-superficie aria-[current=page]:font-medium aria-[current=page]:text-tinta"
            href={s.href}
            key={s.href}
          >
            <Icono d={s.icono} />
            {s.texto}
          </Link>
        ))}
      </nav>

      {/* Celular: barra inferior */}
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-7 border-borde border-t bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {SECCIONES.map((s) => (
          <Link
            aria-current={activa(s.href) ? "page" : undefined}
            aria-label={s.texto}
            className="flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] text-tinta-3 aria-[current=page]:text-acento"
            href={s.href}
            key={s.href}
          >
            <Icono d={s.icono} />
            <span className="max-w-full truncate">{s.corto}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export function Pagina({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-6 pb-28 md:pb-10">{children}</main>;
}
