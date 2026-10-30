// Quincenas pagadas el día 15 y el 30 de cada mes (en febrero, su último día).
// Las fechas viajan como texto "AAAA-MM-DD" en hora local para no pelear con zonas horarias.

export function aFecha(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function deFecha(texto: string) {
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

function ultimoDia(anio: number, mes0: number) {
  return new Date(anio, mes0 + 1, 0).getDate();
}

function sumarDias(texto: string, dias: number) {
  const d = deFecha(texto);
  d.setDate(d.getDate() + dias);
  return aFecha(d);
}

export function diasEntre(desde: string, hasta: string) {
  return Math.round((deFecha(hasta).getTime() - deFecha(desde).getTime()) / 86_400_000);
}

function pagosDelMes(anio: number, mes0: number) {
  return [aFecha(new Date(anio, mes0, 15)), aFecha(new Date(anio, mes0, Math.min(30, ultimoDia(anio, mes0))))];
}

export type Periodo = {
  // Día en que llegó la quincena que estás gastando.
  inicio: string;
  // Último día antes de la siguiente quincena.
  fin: string;
  siguientePago: string;
};

export function periodoDe(hoy: string): Periodo {
  const d = deFecha(hoy);
  const candidatos = [-1, 0, 1].flatMap((delta) => {
    const m = new Date(d.getFullYear(), d.getMonth() + delta, 1);
    return pagosDelMes(m.getFullYear(), m.getMonth());
  });
  const inicio = candidatos.filter((f) => f <= hoy).at(-1) ?? candidatos[0];
  const siguientePago = candidatos.find((f) => f > hoy) ?? candidatos[candidatos.length - 1];
  return { inicio, fin: sumarDias(siguientePago, -1), siguientePago };
}

export function periodoSiguiente(periodo: Periodo) {
  return periodoDe(periodo.siguientePago);
}

// Días de pago (15 y 30) entre dos fechas, inclusive.
export function pagosQuincenalesEntre(desde: string, hasta: string) {
  const fechas: string[] = [];
  const d = deFecha(desde);
  for (let m = new Date(d.getFullYear(), d.getMonth(), 1); aFecha(m) <= hasta; m.setMonth(m.getMonth() + 1)) {
    for (const f of pagosDelMes(m.getFullYear(), m.getMonth())) {
      if (f >= desde && f <= hasta) {
        fechas.push(f);
      }
    }
  }
  return fechas;
}

// Fechas en que cae un cargo mensual del día `dia` (31 en febrero = último día) dentro del rango.
export function fechasMensualesEntre(dia: number, desde: string, hasta: string) {
  const fechas: string[] = [];
  const d = deFecha(desde);
  for (let m = new Date(d.getFullYear(), d.getMonth(), 1); aFecha(m) <= hasta; m.setMonth(m.getMonth() + 1)) {
    const f = aFecha(new Date(m.getFullYear(), m.getMonth(), Math.min(dia, ultimoDia(m.getFullYear(), m.getMonth()))));
    if (f >= desde && f <= hasta) {
      fechas.push(f);
    }
  }
  return fechas;
}

export function describirPeriodo(periodo: Periodo) {
  const inicio = deFecha(periodo.inicio);
  const fin = deFecha(periodo.fin);
  const dia = (x: Date) => x.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return `${dia(inicio)} – ${dia(fin)}`;
}
