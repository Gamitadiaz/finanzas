# Mis Finanzas

App web instalable en el celular para llevar tus finanzas personales:

- **Movimientos**: ingresos y gastos por mes, con categorías.
- **Presupuesto**: límite mensual por categoría, con aviso al acercarte o pasarte.
- **Metas de ahorro**: cuánto llevas, cuánto falta y cuánto apartar al mes para llegar a la fecha.
- **Deudas y tarjetas**: intereses del mes (con IVA en tarjetas), tiempo para liquidar y próximo pago.
- **Impuestos RESICO** (persona física): estimado del pago mensual de ISR (tabla del art. 113-E LISR)
  e IVA a partir de los movimientos marcados con factura, fecha límite y tope anual de $3.5 millones.
- **Calculadora de ahorro** con interés compuesto: capitalización, aportes al inicio o fin de mes,
  inflación y cuánto ahorrar al mes para una meta. Funciona sin cuenta.

Stack: Next.js 16, React 19, Tailwind CSS v4 y Supabase (Auth + Postgres con RLS).

## Configurar

1. Crea un proyecto en [supabase.com](https://supabase.com) (el plan gratis alcanza).
2. En **SQL Editor** pega y corre todo [`supabase/schema.sql`](supabase/schema.sql).
3. Copia `.env.example` como `.env.local` y pon la URL y la llave `anon` (Project Settings → API).
4. En **Authentication → URL Configuration** pon tu dirección (en local `http://localhost:3000`, y
   después la de Vercel) para que funcione el enlace de confirmación del correo.

```bash
npm install
npm run dev
```

## Publicar e instalar en el celular

1. Sube el proyecto a GitHub e impórtalo en [Vercel](https://vercel.com) con las mismas dos
   variables de `.env.local`.
2. En el celular abre la dirección de Vercel:
   - **Android (Chrome)**: menú ⋮ → *Instalar app*.
   - **iPhone (Safari)**: Compartir → *Agregar a pantalla de inicio*.

## Cálculos

Están en [`src/lib/calculos.ts`](src/lib/calculos.ts), sin dependencias de React ni de Supabase.
La tasa anual nominal con `n` capitalizaciones se convierte a mensual como `(1 + r/n)^(n/12) − 1`,
y el saldo se simula mes a mes.
