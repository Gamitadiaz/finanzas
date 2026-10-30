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
- **Fijos**: ingresos y gastos que se repiten cada quincena o cada mes (el sueldo se registra solo).
- **Plan Canadá** (`/canada`): avance de la meta, proyección con rendimiento, deudas por liquidar,
  rutina de cada quincena y camino hasta aplicar. Se abre tocando una meta con "Canadá" en el nombre.

Stack: Next.js 16, React 19, Tailwind CSS v4 y Supabase (Auth + Postgres con RLS).

Publicada en https://gamitadiaz.github.io/finanzas/ — el repo es público, pero **ningún dato personal
está en el código**: todo vive en Supabase y solo se ve con tu cuenta (RLS).

## Configurar

1. Crea un proyecto en [supabase.com](https://supabase.com) (el plan gratis alcanza).
2. En **SQL Editor** pega y corre todo [`supabase/schema.sql`](supabase/schema.sql). Se puede volver a
   correr sin perder datos: solo agrega lo que falte (tablas o columnas nuevas).
3. Copia `.env.example` como `.env.local` y pon la URL y la llave `anon` (Project Settings → API).
4. En **Authentication → URL Configuration** pon `https://gamitadiaz.github.io/finanzas/` como Site URL
   para que funcione el enlace de confirmación del correo.
5. Ya con tu cuenta creada, apaga **Allow new users to sign up** para que nadie más pueda registrarse.

```bash
npm install
npm run dev          # http://localhost:3000
```

## Publicar e instalar en el celular

Cada `git push` a `main` corre [`.github/workflows/publicar.yml`](.github/workflows/publicar.yml):
compila la app como archivos estáticos (`output: "export"`, en la carpeta `out/`) con `BASE_PATH=/finanzas`
y la sube a GitHub Pages. La URL y la llave `anon` las toma de las **variables del repo**
(Settings → Secrets and variables → Actions → Variables).

En el celular abre la dirección:
- **Android (Chrome)**: menú ⋮ → *Instalar app*.
- **iPhone (Safari)**: Compartir → *Agregar a pantalla de inicio*.

## Qué hace cada archivo

```
src/
  app/                    Una carpeta por pantalla (Next.js "App Router": la carpeta es la URL)
    layout.tsx            Marco común: fuente, íconos, barra de navegación
    page.tsx              Inicio: plan de la quincena, alertas de presupuesto, metas
    movimientos/          Lista y alta de ingresos y gastos
    presupuesto/          Gastado contra límite por categoría
    metas/                Metas de ahorro (abonar, retirar, cuánto apartar al mes)
    canada/               Plan Canadá (lee la meta, los fijos y las deudas de Supabase)
    deudas/               Tarjetas y préstamos: intereses, pagos, tiempo para liquidar
    fijos/                Ingresos y gastos que se repiten
    resico/               Estimado de ISR e IVA del mes
    calculadora/          Interés compuesto con gráfica (funciona sin cuenta)
    icono/[tamano]/       Genera los PNG del ícono al compilar (32, 180, 192, 512)
    manifest.ts           Datos para instalar la app en el celular
    globals.css           Colores del tema (claro y oscuro) y estilos base
  components/
    sesion.tsx            Inicio de sesión, crear cuenta y el hook useConsulta para leer Supabase
    navegacion.tsx        Barra lateral (computadora) y barra inferior (celular)
    plan-quincena.tsx     Tarjeta "esta quincena": qué llega, qué está comprometido, qué queda libre
    ui.tsx                Piezas visuales: Tarjeta, Boton, Campo, Barra, Aviso…
    selector-mes.tsx      Flechas para cambiar de mes
    logo.tsx              El logo (se usa también para los íconos)
  lib/                    Lógica sin pantallas (se puede probar sola)
    calculos.ts           Formato de pesos, interés compuesto, deudas, proyección de metas
    quincenas.ts          Fechas de pago (15 y último día) y periodos de quincena
    plan.ts               Cálculo del plan de una quincena
    presupuesto.ts        Estado de cada categoría (bien / alerta / pasado)
    resico.ts             Tablas y cálculo de ISR RESICO e IVA
    datos.ts              Escrituras compuestas: registrar sueldos, pagar una deuda
    supabase.ts           Conexión a Supabase (null si falta .env.local)
    tipos.ts              Tipos de datos y categorías iniciales
supabase/schema.sql       Tablas, permisos (RLS) y validaciones de la base de datos
privado/                  Tus datos personales (plan y SQL de carga). Ignorado por git: nunca se sube
next.config.ts            Exportación estática y subruta /finanzas
.github/workflows/        Publicación automática en GitHub Pages
```

## Cálculos

Están en [`src/lib/calculos.ts`](src/lib/calculos.ts), sin dependencias de React ni de Supabase.
La tasa anual nominal con `n` capitalizaciones se convierte a mensual como `(1 + r/n)^(n/12) − 1`,
y el saldo se simula mes a mes.
