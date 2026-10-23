// Estado de una categoría contra su presupuesto. El color nunca va solo: siempre lleva texto.
export function estadoPresupuesto(gastado: number, presupuesto: number) {
  const proporcion = presupuesto > 0 ? gastado / presupuesto : 0;
  if (gastado > presupuesto) {
    return { tono: "mal" as const, texto: `Te pasaste por`, cantidad: gastado - presupuesto, proporcion };
  }
  if (proporcion >= 0.8) {
    return { tono: "alerta" as const, texto: "Casi al límite, quedan", cantidad: presupuesto - gastado, proporcion };
  }
  return { tono: "bien" as const, texto: "Te quedan", cantidad: presupuesto - gastado, proporcion };
}
