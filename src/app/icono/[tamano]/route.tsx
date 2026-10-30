import { ImageResponse } from "next/og";

import { Logo } from "@/components/logo";

// Se generan al compilar: /icono/32.png (pestaña), 180.png (iPhone), 192.png y 512.png (app).
const TAMANOS = [32, 180, 192, 512];
export const dynamic = "force-static";

export function generateStaticParams() {
  return TAMANOS.map((lado) => ({ tamano: `${lado}.png` }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icono/[tamano]">) {
  const { tamano } = await params;
  const lado = TAMANOS.find((t) => tamano === `${t}.png`) ?? 192;
  return new ImageResponse(<Logo tamano={lado} />, { width: lado, height: lado });
}
