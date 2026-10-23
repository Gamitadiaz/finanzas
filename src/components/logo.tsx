// Ícono de la app: tres barras que suben sobre fondo azul. Se usa para generar los PNG.
export function Logo({ tamano }: { tamano: number }) {
  const barra = (izquierda: number, alto: number) => (
    <div
      style={{
        position: "absolute",
        left: tamano * izquierda,
        bottom: tamano * 0.24,
        width: tamano * 0.13,
        height: tamano * alto,
        borderRadius: tamano * 0.03,
        background: "#ffffff",
      }}
    />
  );
  return (
    <div style={{ width: tamano, height: tamano, background: "#2a78d6", position: "relative", display: "flex" }}>
      {barra(0.25, 0.2)}
      {barra(0.435, 0.34)}
      {barra(0.62, 0.5)}
    </div>
  );
}
