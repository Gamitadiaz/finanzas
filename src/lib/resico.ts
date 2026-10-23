// RESICO personas físicas (LISR art. 113-E). Estimaciones: el cálculo oficial es el del SAT.
// Tabla vigente sin cambios desde 2022; revisada para 2026.

export const TOPE_ANUAL_RESICO = 3_500_000;
export const TASA_IVA = 0.16;

// Límite superior del ingreso mensual (sin IVA) y tasa que aplica a TODO el ingreso del mes.
const TABLA_MENSUAL = [
  { hasta: 25_000, tasa: 0.01 },
  { hasta: 50_000, tasa: 0.011 },
  { hasta: 83_333.33, tasa: 0.015 },
  { hasta: 208_333.33, tasa: 0.02 },
  { hasta: Number.POSITIVE_INFINITY, tasa: 0.025 },
];

export function tasaResicoMensual(ingresoSinIva: number) {
  return (TABLA_MENSUAL.find((tramo) => ingresoSinIva <= tramo.hasta) ?? TABLA_MENSUAL[TABLA_MENSUAL.length - 1]).tasa;
}

// IVA contenido en un total que ya lo incluye: total − total / 1.16.
export function ivaIncluido(total: number) {
  return Math.round((total - total / (1 + TASA_IVA)) * 100) / 100;
}

export type MovimientoFiscal = {
  tipo: "ingreso" | "gasto";
  monto: number;
  iva: number;
  con_factura: boolean;
};

export function calcularMesResico(movimientos: MovimientoFiscal[]) {
  const facturados = movimientos.filter((m) => m.con_factura);
  const ingresos = facturados.filter((m) => m.tipo === "ingreso");
  const gastos = facturados.filter((m) => m.tipo === "gasto");

  const ingresoSinIva = ingresos.reduce((s, m) => s + m.monto - m.iva, 0);
  const ivaCobrado = ingresos.reduce((s, m) => s + m.iva, 0);
  const ivaAcreditable = gastos.reduce((s, m) => s + m.iva, 0);
  const tasa = tasaResicoMensual(ingresoSinIva);
  // El SAT redondea los pagos a pesos enteros.
  const isr = Math.round(ingresoSinIva * tasa);
  const diferenciaIva = ivaCobrado - ivaAcreditable;
  const iva = Math.max(0, Math.round(diferenciaIva));
  const ivaAFavor = diferenciaIva < 0 ? -diferenciaIva : 0;

  return { ingresoSinIva, ivaCobrado, ivaAcreditable, tasa, isr, iva, ivaAFavor, total: isr + iva };
}

// El pago de un mes vence el día 17 del mes siguiente; en fin de semana se recorre al lunes.
// (Los días festivos también lo recorren, pero no los contamos.)
export function fechaLimitePago(mes: string) {
  const [anio, numero] = mes.split("-").map(Number);
  const fecha = new Date(anio, numero, 17);
  const dia = fecha.getDay();
  if (dia === 6) {
    fecha.setDate(fecha.getDate() + 2);
  } else if (dia === 0) {
    fecha.setDate(fecha.getDate() + 1);
  }
  return fecha;
}
