import type { ComponentProps, ReactNode } from "react";

function unir(...clases: (string | false | null | undefined)[]) {
  return clases.filter(Boolean).join(" ");
}

export function Tarjeta({ className, ...props }: ComponentProps<"section">) {
  return <section className={unir("rounded-2xl border border-borde bg-superficie p-4 md:p-5", className)} {...props} />;
}

export function Titulo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-semibold text-base">{children}</h2>
      {accion}
    </div>
  );
}

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

const variantes: Record<Variante, string> = {
  primario: "bg-acento text-acento-tinta hover:opacity-90",
  secundario: "border border-borde bg-superficie hover:bg-fondo",
  fantasma: "hover:bg-fondo text-tinta-2",
  peligro: "text-mal hover:bg-mal-fondo",
};

export function Boton({
  variante = "primario",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return (
    <button
      className={unir(
        "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-4 font-medium text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
        variantes[variante],
        className,
      )}
      type={type}
      {...props}
    />
  );
}

const claseControl =
  "min-h-11 w-full rounded-xl border border-borde bg-fondo px-3 text-base outline-none focus:border-acento focus:ring-2 focus:ring-acento/30";

export function Campo({
  etiqueta,
  ayuda,
  id,
  children,
  className,
}: {
  etiqueta: string;
  ayuda?: string;
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={unir("min-w-0 space-y-1", className)}>
      <label className="block font-medium text-sm" htmlFor={id}>
        {etiqueta}
      </label>
      {children}
      {ayuda ? <p className="text-tinta-3 text-xs">{ayuda}</p> : null}
    </div>
  );
}

export function Entrada({ className, ...props }: ComponentProps<"input">) {
  return <input className={unir(claseControl, className)} {...props} />;
}

// Campo para pesos: teclado numérico en el celular y el signo de pesos al lado.
export function EntradaPesos({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <div className="relative">
      <span className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 text-tinta-3">$</span>
      <input
        className={unir(claseControl, "cifra pl-7", className)}
        inputMode="decimal"
        min="0"
        step="0.01"
        type="number"
        {...props}
      />
    </div>
  );
}

export function Selector({ className, ...props }: ComponentProps<"select">) {
  return <select className={unir(claseControl, className)} {...props} />;
}

export function Barra({ valor, maximo, tono }: { valor: number; maximo: number; tono: "bien" | "alerta" | "mal" | "acento" }) {
  const porcentaje = maximo > 0 ? Math.min(100, (valor / maximo) * 100) : 0;
  const color = {
    bien: "var(--bien-marca)",
    alerta: "var(--alerta-marca)",
    mal: "var(--mal-marca)",
    acento: "var(--acento)",
  }[tono];
  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(porcentaje)}
      className="h-2 overflow-hidden rounded-full bg-fondo"
      role="progressbar"
    >
      <div className="h-full rounded-full" style={{ width: `${porcentaje}%`, background: color }} />
    </div>
  );
}

export function Aviso({ tono, children }: { tono: "bien" | "alerta" | "mal"; children: ReactNode }) {
  const clases = {
    bien: "bg-bien-fondo text-bien",
    alerta: "bg-alerta-fondo text-alerta",
    mal: "bg-mal-fondo text-mal",
  }[tono];
  return (
    <p className={unir("rounded-xl px-3 py-2 text-sm", clases)} role={tono === "mal" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-borde border-dashed p-4 text-center text-sm text-tinta-2">{children}</p>;
}

export function Encabezado({ titulo, descripcion, accion }: { titulo: string; descripcion?: string; accion?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-semibold text-2xl">{titulo}</h1>
        {descripcion ? <p className="text-sm text-tinta-2">{descripcion}</p> : null}
      </div>
      {accion}
    </header>
  );
}
