import { ImageResponse } from "next/og";

import { Logo } from "@/components/logo";

export async function GET(_request: Request, { params }: RouteContext<"/icono/[tamano]">) {
  const { tamano } = await params;
  const lado = tamano === "512" ? 512 : 192;
  return new ImageResponse(<Logo tamano={lado} />, { width: lado, height: lado });
}
