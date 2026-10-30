import type { NextConfig } from "next";

// En GitHub Pages la app vive en /finanzas; en local (npm run dev) va en la raíz.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Genera solo archivos estáticos (HTML/JS/CSS) en out/: no hace falta servidor.
  output: "export",
  basePath,
  // Carpetas con index.html para que GitHub Pages sirva /finanzas/metas/ sin extensión.
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
