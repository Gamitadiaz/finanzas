export type TipoMovimiento = "ingreso" | "gasto";

export type Categoria = {
  id: string;
  nombre: string;
  tipo: TipoMovimiento;
  presupuesto: number | null;
};

export type Movimiento = {
  id: string;
  fecha: string;
  tipo: TipoMovimiento;
  monto: number;
  categoria_id: string | null;
  nota: string | null;
  con_factura: boolean;
  iva: number;
};

export type Meta = {
  id: string;
  nombre: string;
  objetivo: number;
  ahorrado: number;
  fecha_limite: string | null;
};

export type Deuda = {
  id: string;
  nombre: string;
  tipo: "tarjeta" | "prestamo" | "otro";
  saldo: number;
  tasa_anual: number;
  iva_intereses: boolean;
  pago_mensual: number;
  dia_pago: number | null;
};

export const CATEGORIAS_INICIALES: { nombre: string; tipo: TipoMovimiento }[] = [
  { nombre: "Sueldo", tipo: "ingreso" },
  { nombre: "Ventas", tipo: "ingreso" },
  { nombre: "Otros ingresos", tipo: "ingreso" },
  { nombre: "Comida", tipo: "gasto" },
  { nombre: "Transporte", tipo: "gasto" },
  { nombre: "Casa y servicios", tipo: "gasto" },
  { nombre: "Salud", tipo: "gasto" },
  { nombre: "Diversión", tipo: "gasto" },
  { nombre: "Suscripciones", tipo: "gasto" },
  { nombre: "Otros gastos", tipo: "gasto" },
];

// Supabase devuelve `numeric` como string; esto lo deja en número.
export function aNumero(valor: unknown) {
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}
