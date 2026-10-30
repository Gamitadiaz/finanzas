// Cálculos puros (sin React ni Supabase) para poder probarlos solos.

const pesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const pesosCortos = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatoPesos(valor: number) {
  return pesos.format(valor);
}

export function formatoPesosCorto(valor: number) {
  return pesosCortos.format(valor);
}

// Convierte una tasa nominal anual con n capitalizaciones al año en su equivalente mensual.
export function tasaMensual(tasaAnualPct: number, capitalizacionesPorAnio: number) {
  const r = tasaAnualPct / 100;
  if (r === 0) {
    return 0;
  }
  return (1 + r / capitalizacionesPorAnio) ** (capitalizacionesPorAnio / 12) - 1;
}

export type EntradaInteres = {
  inicial: number;
  aporteMensual: number;
  tasaAnual: number;
  anios: number;
  capitalizacion: number;
  aporteAlInicio: boolean;
  inflacionAnual: number;
};

export type FilaAnual = {
  anio: number;
  aportado: number;
  intereses: number;
  saldo: number;
  // Saldo en pesos de hoy, descontando la inflación.
  saldoReal: number;
};

export function interesCompuesto(entrada: EntradaInteres) {
  const m = tasaMensual(entrada.tasaAnual, entrada.capitalizacion);
  const meses = Math.round(entrada.anios * 12);
  let saldo = entrada.inicial;
  let aportado = entrada.inicial;
  const filas: FilaAnual[] = [];

  for (let mes = 1; mes <= meses; mes++) {
    if (entrada.aporteAlInicio) {
      saldo += entrada.aporteMensual;
    }
    saldo *= 1 + m;
    if (!entrada.aporteAlInicio) {
      saldo += entrada.aporteMensual;
    }
    aportado += entrada.aporteMensual;

    if (mes % 12 === 0 || mes === meses) {
      const anio = mes / 12;
      filas.push({
        anio,
        aportado,
        intereses: saldo - aportado,
        saldo,
        saldoReal: saldo / (1 + entrada.inflacionAnual / 100) ** anio,
      });
    }
  }

  const final = filas.at(-1) ?? {
    anio: 0,
    aportado: entrada.inicial,
    intereses: 0,
    saldo: entrada.inicial,
    saldoReal: entrada.inicial,
  };
  return { filas, final };
}

// Cuánto hay que aportar cada mes para llegar a `meta` con los mismos supuestos.
export function aporteParaMeta(meta: number, entrada: Omit<EntradaInteres, "aporteMensual" | "inflacionAnual">) {
  const m = tasaMensual(entrada.tasaAnual, entrada.capitalizacion);
  const meses = Math.round(entrada.anios * 12);
  if (meses <= 0) {
    return null;
  }
  const crecimiento = (1 + m) ** meses;
  const faltante = meta - entrada.inicial * crecimiento;
  if (faltante <= 0) {
    return 0;
  }
  const factor = m === 0 ? meses : ((crecimiento - 1) / m) * (entrada.aporteAlInicio ? 1 + m : 1);
  return faltante / factor;
}

export type ResultadoDeuda =
  | { estado: "pagada" }
  | { estado: "nunca"; interesMensual: number }
  | { estado: "ok"; meses: number; interesTotal: number; interesMensual: number };

// Simula pagos fijos mensuales. Con IVA, el interés mensual se multiplica por 1.16.
export function liquidarDeuda(saldo: number, tasaAnual: number, pagoMensual: number, ivaIntereses: boolean) {
  if (saldo <= 0) {
    return { estado: "pagada" } satisfies ResultadoDeuda;
  }
  const m = (tasaAnual / 100 / 12) * (ivaIntereses ? 1.16 : 1);
  const interesMensual = saldo * m;
  // Medio centavo de margen: un pago igual al interés (con error de redondeo) no reduce la deuda.
  if (pagoMensual <= interesMensual + 0.005) {
    return { estado: "nunca", interesMensual } satisfies ResultadoDeuda;
  }
  let restante = saldo;
  let interesTotal = 0;
  let meses = 0;
  while (restante > 0.005) {
    // Más de 50 años pagando es, en la práctica, una deuda que no se termina.
    if (meses >= 600) {
      return { estado: "nunca", interesMensual } satisfies ResultadoDeuda;
    }
    const interes = restante * m;
    interesTotal += interes;
    restante = restante + interes - pagoMensual;
    meses++;
  }
  return { estado: "ok", meses, interesTotal, interesMensual } satisfies ResultadoDeuda;
}

export function describirMeses(meses: number) {
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes = [];
  if (anios > 0) {
    partes.push(`${anios} ${anios === 1 ? "año" : "años"}`);
  }
  if (resto > 0) {
    partes.push(`${resto} ${resto === 1 ? "mes" : "meses"}`);
  }
  return partes.join(" y ") || "menos de un mes";
}

// "2026-10" del mes actual, en hora local.
export function mesActual(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

export function rangoDelMes(mes: string) {
  const [anio, numero] = mes.split("-").map(Number);
  const ultimoDia = new Date(anio, numero, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimoDia).padStart(2, "0")}` };
}

export function nombreDelMes(mes: string) {
  const [anio, numero] = mes.split("-").map(Number);
  const texto = new Date(anio, numero - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function moverMes(mes: string, delta: number) {
  const [anio, numero] = mes.split("-").map(Number);
  return mesActual(new Date(anio, numero - 1 + delta, 1));
}

// Próxima fecha de pago para un día del mes (si el mes es corto, el último día).
export function proximoPago(diaPago: number, hoy = new Date()) {
  const enMes = (anio: number, mes: number) => {
    const ultimo = new Date(anio, mes + 1, 0).getDate();
    return new Date(anio, mes, Math.min(diaPago, ultimo));
  };
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const esteMes = enMes(hoy.getFullYear(), hoy.getMonth());
  const fecha = esteMes >= inicioHoy ? esteMes : enMes(hoy.getFullYear(), hoy.getMonth() + 1);
  const dias = Math.round((fecha.getTime() - inicioHoy.getTime()) / 86_400_000);
  return { fecha, dias };
}

// Meses completos entre dos fechas "AAAA-MM-DD" (0 si `hasta` ya pasó).
export function mesesEntre(desde: string, hasta: string) {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.max(0, (a2 - a1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0));
}

// Proyección de una meta: lo ahorrado crece desde hoy; los aportes empiezan en `inicioAportes`.
export function proyectarMeta({
  ahorrado,
  aporteMensual,
  tasaAnual,
  hoy,
  inicioAportes,
  fechaLimite,
}: {
  ahorrado: number;
  aporteMensual: number;
  tasaAnual: number;
  hoy: string;
  inicioAportes: string;
  fechaLimite: string;
}) {
  const m = tasaMensual(tasaAnual, 12);
  const mesesTotales = mesesEntre(hoy, fechaLimite);
  const mesesAportando = mesesEntre(inicioAportes > hoy ? inicioAportes : hoy, fechaLimite);
  const crecimientoAportes = m === 0 ? mesesAportando : ((1 + m) ** mesesAportando - 1) / m;
  return {
    mesesAportando,
    estimado: ahorrado * (1 + m) ** mesesTotales + aporteMensual * crecimientoAportes,
    // Aporte mensual que haría falta en los mismos meses para llegar justo a `objetivo`.
    aporteNecesario: (objetivo: number) =>
      mesesAportando > 0 ? Math.max(0, objetivo - ahorrado * (1 + m) ** mesesTotales) / crecimientoAportes : null,
  };
}
