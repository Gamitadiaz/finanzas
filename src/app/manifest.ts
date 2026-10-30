import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mis Finanzas",
    short_name: "Finanzas",
    description: "Ingresos, gastos, presupuesto, metas de ahorro, deudas y calculadora de interés compuesto.",
    lang: "es-MX",
    start_url: `${base}/`,
    display: "standalone",
    background_color: "#f9f9f7",
    theme_color: "#2a78d6",
    icons: [
      { src: `${base}/icono/192.png`, sizes: "192x192", type: "image/png" },
      { src: `${base}/icono/512.png`, sizes: "512x512", type: "image/png" },
      { src: `${base}/icono/512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
