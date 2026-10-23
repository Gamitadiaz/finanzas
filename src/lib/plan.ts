// Plan de una quincena: lo que llega, lo que ya está comprometido y lo que queda libre.

import { fechasMensualesEntre, type Periodo } from "./quincenas";

export type Recurrente = {
  id: string;
  nombre: string;
  tipo: "ingreso" | "gasto";
  monto: number;
  frecuencia: "quincenal" | "mensual";
  dia_mes: number | null;
  categoria_id: string | null;
  desde: string;
  hasta: string | null;
};

export type DeudaPlan = {
  id: string;
  nombre: string;
  saldo: number;
  pago_mensual: number;
  dia_pago: number | null;
};

export type MovimientoPlan = {
  tipo: "ingreso" | "gasto";
  monto: number;
  fecha: string;
  categoria_id: string | null;
  deuda_id: string | null;
  recurrente_id: string | null;
};

export type Compromiso = {
  clave: string;
  nombre: string;
  // Fecha de vencimiento si es un cargo de un día concreto; null si se reparte en la quincena.
  fecha: string | null;
  planeado: number;
  usado: number;
  origen: { tipo: "fijo"; recurrente: Recurrente } | { tipo: "deuda"; deuda: DeudaPlan };
};

function vigente(r: Recurrente, periodo: Periodo) {
  return r.desde <= periodo.fin && (r.hasta === null || r.hasta >= periodo.inicio);
}

// Cuántas veces cae un recurrente en el periodo (quincenal: una; mensual: según su día).
function ocurrencias(r: Recurrente, periodo: Periodo) {
  if (!vigente(r, periodo)) {
    return [];
  }
  if (r.frecuencia === "quincenal") {
    return [null];
  }
  return fechasMensualesEntre(r.dia_mes ?? 1, periodo.inicio, periodo.fin).filter(
    (f) => f >= r.desde && (r.hasta === null || f <= r.hasta),
  );
}

export function calcularPlan(
  periodo: Periodo,
  recurrentes: Recurrente[],
  deudas: DeudaPlan[],
  movimientos: MovimientoPlan[],
) {
  const delPeriodo = movimientos.filter((m) => m.fecha >= periodo.inicio && m.fecha <= periodo.fin);
  const gastos = delPeriodo.filter((m) => m.tipo === "gasto");

  const compromisos: Compromiso[] = [];
  for (const r of recurrentes.filter((x) => x.tipo === "gasto")) {
    const fechas = ocurrencias(r, periodo);
    if (fechas.length === 0) {
      continue;
    }
    compromisos.push({
      clave: `fijo-${r.id}`,
      nombre: r.nombre,
      fecha: fechas[0],
      planeado: r.monto * fechas.length,
      usado: gastos.filter((g) => g.deuda_id === null && r.categoria_id !== null && g.categoria_id === r.categoria_id).reduce((s, g) => s + g.monto, 0),
      origen: { tipo: "fijo", recurrente: r },
    });
  }
  for (const d of deudas) {
    if (!(d.saldo > 0 && d.pago_mensual > 0 && d.dia_pago)) {
      continue;
    }
    const fechas = fechasMensualesEntre(d.dia_pago, periodo.inicio, periodo.fin);
    const usado = gastos.filter((g) => g.deuda_id === d.id).reduce((s, g) => s + g.monto, 0);
    // Si ya se pagó en esta quincena, sigue apareciendo aunque el saldo haya bajado.
    if (fechas.length === 0 && usado === 0) {
      continue;
    }
    compromisos.push({
      clave: `deuda-${d.id}`,
      nombre: d.nombre,
      fecha: fechas[0] ?? null,
      planeado: Math.min(d.pago_mensual, d.saldo + usado) * Math.max(1, fechas.length),
      usado,
      origen: { tipo: "deuda", deuda: d },
    });
  }
  compromisos.sort((a, b) => (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999"));

  const categoriasFijas = new Set(compromisos.flatMap((c) => (c.origen.tipo === "fijo" && c.origen.recurrente.categoria_id ? [c.origen.recurrente.categoria_id] : [])));
  const gastoLibre = gastos
    .filter((g) => g.deuda_id === null && !(g.categoria_id && categoriasFijas.has(g.categoria_id)))
    .reduce((s, g) => s + g.monto, 0);

  const ingresosRegistrados = delPeriodo.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
  // Ingresos fijos que aún no se registran (por ejemplo, la quincena que viene).
  const ingresosPorLlegar = recurrentes
    .filter((r) => r.tipo === "ingreso")
    .filter((r) => !delPeriodo.some((m) => m.recurrente_id === r.id))
    .reduce((s, r) => s + r.monto * ocurrencias(r, periodo).length, 0);
  const ingresosExtra = delPeriodo
    .filter((m) => m.tipo === "ingreso" && m.recurrente_id === null)
    .reduce((s, m) => s + m.monto, 0);

  const ingresos = ingresosRegistrados + ingresosPorLlegar;
  const comprometido = compromisos.reduce((s, c) => s + Math.max(c.planeado, c.usado), 0);
  const pendiente = compromisos.reduce((s, c) => s + Math.max(0, c.planeado - c.usado), 0);

  return {
    compromisos,
    ingresos,
    ingresosExtra,
    ingresosPorLlegar,
    comprometido,
    pendiente,
    gastoLibre,
    libre: ingresos - comprometido - gastoLibre,
  };
}
