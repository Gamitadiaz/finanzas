import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import { Navegacion } from "@/components/navegacion";

import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Mis Finanzas", template: "%s · Mis Finanzas" },
  description: "Ingresos, gastos, presupuesto, metas de ahorro, deudas y calculadora de interés compuesto.",
  appleWebApp: { capable: true, title: "Finanzas", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html className={`${geist.variable} antialiased`} lang="es-MX">
      <body className="flex min-h-dvh">
        <Navegacion />
        <div className="min-w-0 flex-1">{children}</div>
      </body>
    </html>
  );
}
