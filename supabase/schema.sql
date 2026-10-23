-- Esquema de Mis Finanzas. Pégalo completo en Supabase → SQL Editor → Run.
-- Cada tabla guarda el dueño en user_id y RLS solo deja ver y cambiar lo propio.

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  -- Límite mensual; solo aplica a categorías de gasto. Null = sin presupuesto.
  presupuesto numeric(12, 2) check (presupuesto is null or presupuesto >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, tipo, nombre)
);

create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  monto numeric(12, 2) not null check (monto > 0),
  categoria_id uuid references public.categorias (id) on delete set null,
  nota text check (nota is null or char_length(nota) <= 200),
  -- RESICO: si hay factura (CFDI) y cuánto del monto es IVA.
  con_factura boolean not null default false,
  iva numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists movimientos_user_fecha on public.movimientos (user_id, fecha desc);

-- Para bases creadas antes de existir estas columnas.
alter table public.movimientos add column if not exists con_factura boolean not null default false;
alter table public.movimientos add column if not exists iva numeric(12, 2) not null default 0;
alter table public.movimientos drop constraint if exists movimientos_iva_valido;
alter table public.movimientos add constraint movimientos_iva_valido check (iva >= 0 and iva < monto);

create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 60),
  objetivo numeric(12, 2) not null check (objetivo > 0),
  ahorrado numeric(12, 2) not null default 0 check (ahorrado >= 0),
  fecha_limite date,
  created_at timestamptz not null default now()
);

create table if not exists public.deudas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 60),
  tipo text not null default 'tarjeta' check (tipo in ('tarjeta', 'prestamo', 'otro')),
  saldo numeric(12, 2) not null check (saldo >= 0),
  -- Tasa de interés anual en porcentaje, ej. 45.5 = 45.5 % anual.
  tasa_anual numeric(6, 2) not null default 0 check (tasa_anual >= 0 and tasa_anual <= 300),
  -- En México las tarjetas cobran IVA (16 %) sobre los intereses.
  iva_intereses boolean not null default true,
  pago_mensual numeric(12, 2) not null default 0 check (pago_mensual >= 0),
  dia_pago smallint check (dia_pago is null or dia_pago between 1 and 31),
  created_at timestamptz not null default now()
);

-- Ingresos y gastos que se repiten: el sueldo de cada quincena, la renta, la gasolina…
create table if not exists public.recurrentes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  monto numeric(12, 2) not null check (monto > 0),
  -- quincenal: una vez por quincena (15 y último día); mensual: el día dia_mes.
  frecuencia text not null check (frecuencia in ('quincenal', 'mensual')),
  dia_mes smallint check (dia_mes is null or dia_mes between 1 and 31),
  categoria_id uuid references public.categorias (id) on delete set null,
  desde date not null default current_date,
  hasta date,
  created_at timestamptz not null default now(),
  check (frecuencia = 'quincenal' or dia_mes is not null),
  check (hasta is null or hasta >= desde)
);

-- De qué recurrente o deuda viene un movimiento (sueldo registrado solo, pago de una deuda).
alter table public.movimientos add column if not exists recurrente_id uuid references public.recurrentes (id) on delete set null;
alter table public.movimientos add column if not exists deuda_id uuid references public.deudas (id) on delete set null;
-- El sueldo automático no se registra dos veces el mismo día.
alter table public.movimientos drop constraint if exists movimientos_recurrente_fecha;
alter table public.movimientos add constraint movimientos_recurrente_fecha unique (recurrente_id, fecha);

alter table public.categorias enable row level security;
alter table public.movimientos enable row level security;
alter table public.metas enable row level security;
alter table public.deudas enable row level security;
alter table public.recurrentes enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['categorias', 'movimientos', 'metas', 'deudas', 'recurrentes'] loop
    execute format('drop policy if exists "solo el dueño" on public.%I', t);
    execute format(
      'create policy "solo el dueño" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- Un movimiento solo puede usar categorías del mismo usuario y del mismo tipo.
create or replace function public.validar_categoria_movimiento() returns trigger
language plpgsql security invoker as $$
begin
  if new.categoria_id is not null and not exists (
    select 1 from public.categorias c
    where c.id = new.categoria_id and c.user_id = new.user_id and c.tipo = new.tipo
  ) then
    raise exception 'La categoría no corresponde al movimiento';
  end if;
  if new.recurrente_id is not null and not exists (
    select 1 from public.recurrentes r where r.id = new.recurrente_id and r.user_id = new.user_id
  ) then
    raise exception 'El recurrente no es de este usuario';
  end if;
  if new.deuda_id is not null and not exists (
    select 1 from public.deudas d where d.id = new.deuda_id and d.user_id = new.user_id
  ) then
    raise exception 'La deuda no es de este usuario';
  end if;
  return new;
end $$;

drop trigger if exists validar_categoria on public.movimientos;
create trigger validar_categoria before insert or update on public.movimientos
  for each row execute function public.validar_categoria_movimiento();
