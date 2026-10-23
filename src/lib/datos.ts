import type { SupabaseClient } from "@supabase/supabase-js";

import type { Recurrente } from "./plan";
import { aFecha, fechasMensualesEntre, pagosQuincenalesEntre } from "./quincenas";
import { aNumero, type TipoMovimiento } from "./tipos";

// Busca una categoría por nombre y la crea si no existe.
export async function categoriaPorNombre(sb: SupabaseClient, nombre: string, tipo: TipoMovimiento) {
  const { data } = await sb.from("categorias").select("id").eq("tipo", tipo).ilike("nombre", nombre).limit(1).maybeSingle();
  if (data) {
    return data.id as string;
  }
  const { data: nueva, error } = await sb.from("categorias").insert({ nombre, tipo }).select("id").single();
  if (error) {
    throw new Error(error.message);
  }
  return nueva.id as string;
}

// Registra los ingresos fijos (sueldo) cuyo día ya llegó y aún no están en movimientos.
// Mira solo los últimos ~2 meses para no rellenar historia vieja.
export async function registrarIngresosFijos(sb: SupabaseClient) {
  const { data, error } = await sb.from("recurrentes").select("*").eq("tipo", "ingreso");
  if (error || !data) {
    return;
  }
  const hoy = new Date();
  const hasta = aFecha(hoy);
  const ventana = aFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 62));
  const filas = (data as Recurrente[]).flatMap((r) => {
    const desde = r.desde > ventana ? r.desde : ventana;
    const fin = r.hasta && r.hasta < hasta ? r.hasta : hasta;
    if (desde > fin) {
      return [];
    }
    const fechas =
      r.frecuencia === "quincenal" ? pagosQuincenalesEntre(desde, fin) : fechasMensualesEntre(r.dia_mes ?? 1, desde, fin);
    return fechas.map((fecha) => ({
      tipo: "ingreso",
      monto: aNumero(r.monto),
      fecha,
      categoria_id: r.categoria_id,
      recurrente_id: r.id,
      nota: r.nombre,
    }));
  });
  if (filas.length > 0) {
    // La restricción única (recurrente_id, fecha) evita duplicados aunque haya dos pestañas abiertas.
    await sb.from("movimientos").upsert(filas, { onConflict: "recurrente_id,fecha", ignoreDuplicates: true });
  }
}

// Registra el pago de una deuda: baja el saldo y lo anota como gasto para que cuente en la quincena.
export async function pagarDeuda(sb: SupabaseClient, deuda: { id: string; nombre: string; saldo: number }, monto: number) {
  const categoria = await categoriaPorNombre(sb, "Pago de deudas", "gasto");
  const { error } = await sb.from("movimientos").insert({
    tipo: "gasto",
    monto,
    fecha: aFecha(new Date()),
    categoria_id: categoria,
    deuda_id: deuda.id,
    nota: `Pago a ${deuda.nombre}`,
  });
  if (error) {
    throw new Error(error.message);
  }
  const { error: errorSaldo } = await sb
    .from("deudas")
    .update({ saldo: Math.max(0, Math.round((deuda.saldo - monto) * 100) / 100) })
    .eq("id", deuda.id);
  if (errorSaldo) {
    throw new Error(errorSaldo.message);
  }
}
