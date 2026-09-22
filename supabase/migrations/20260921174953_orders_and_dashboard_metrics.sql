-- Pedidos de los canales de venta y métricas del dashboard.
--
-- Modelo
--   * `orders` es canónica para todos los canales (TikTok Shop hoy; Mercado Libre,
--     Shopify, Amazon después). El monto va en la moneda ORIGINAL del pedido, en
--     unidades menores enteras (centavos), nunca en decimales.
--   * NO se guardan datos personales del comprador (nombre, teléfono, dirección):
--     el dashboard no los necesita y así no hay que protegerlos ni borrarlos.
--   * Solo el servidor (service_role) escribe pedidos, al sincronizar con el canal.
--     Los miembros del negocio solo leen los suyos (RLS).
--   * status normalizado: pending (sin pagar), processing (pagado, por enviar),
--     shipped (en camino), completed (entregado), cancelled y other. Solo
--     processing, shipped y completed cuentan como VENTA.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  integration_id uuid references public.business_integrations(id) on delete set null,
  provider text not null
    check (provider in ('tiktok_shop', 'mercado_libre', 'shopify', 'amazon')),
  external_order_id text not null,
  status text not null
    check (status in ('pending', 'processing', 'shipped', 'completed', 'cancelled', 'other')),
  external_status text,
  total_cents bigint not null check (total_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  placed_at timestamptz not null,
  external_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un pedido de un canal es único en toda la plataforma
create unique index if not exists orders_provider_external_unique
  on public.orders (provider, external_order_id);

create index if not exists orders_business_placed_idx
  on public.orders (business_id, placed_at desc);

alter table public.orders enable row level security;

drop policy if exists orders_select_business_member on public.orders;
create policy orders_select_business_member on public.orders
  for select to authenticated
  using (public.is_business_member(business_id));

grant select on public.orders to authenticated;
grant all on public.orders to service_role;

-- =====================================================================
-- Métricas del dashboard
-- SECURITY INVOKER: se ejecutan con los permisos de quien llama, así que la
-- RLS de `orders` sigue limitando qué pedidos se suman.
-- =====================================================================

-- Ventas y número de pedidos por canal y moneda en un rango [p_from, p_to)
create or replace function public.orders_summary(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (provider text, currency text, orders_count bigint, sales_cents numeric)
language sql
stable
security invoker
set search_path to ''
as $function$
  select
    o.provider,
    o.currency,
    count(*)::bigint,
    coalesce(sum(o.total_cents), 0)
  from public.orders o
  where o.business_id = p_business_id
    and o.placed_at >= p_from
    and o.placed_at < p_to
    and o.status in ('processing', 'shipped', 'completed')
  group by o.provider, o.currency
$function$;

-- Lo mismo por día calendario en la zona horaria del negocio (para la gráfica)
create or replace function public.orders_daily(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_timezone text
)
returns table (day date, currency text, orders_count bigint, sales_cents numeric)
language sql
stable
security invoker
set search_path to ''
as $function$
  select
    (o.placed_at at time zone p_timezone)::date,
    o.currency,
    count(*)::bigint,
    coalesce(sum(o.total_cents), 0)
  from public.orders o
  where o.business_id = p_business_id
    and o.placed_at >= p_from
    and o.placed_at < p_to
    and o.status in ('processing', 'shipped', 'completed')
  group by 1, 2
  order by 1
$function$;

revoke all on function public.orders_summary(uuid, timestamptz, timestamptz)
  from public, anon;
revoke all on function public.orders_daily(uuid, timestamptz, timestamptz, text)
  from public, anon;

grant execute on function public.orders_summary(uuid, timestamptz, timestamptz)
  to authenticated, service_role;
grant execute on function public.orders_daily(uuid, timestamptz, timestamptz, text)
  to authenticated, service_role;
