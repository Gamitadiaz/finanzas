import type { Metadata } from "next";

import { Calculadora } from "./calculadora";

export const metadata: Metadata = { title: "Calculadora de ahorro" };

export default function PaginaCalculadora() {
  return <Calculadora />;
}
