-- Facturación: planes, suscripciones, créditos y eventos de Stripe.
--
-- Modelo
--   * Todo el dinero en USD, en centavos (enteros).
--   * La suscripción y los créditos pertenecen a la CUENTA (accounts), no al negocio.
--   * Créditos en dos bolsas:
--       plan_credits      -> los del plan; se reemplazan y vencen cada periodo
--       permanent_credits -> comprados, regalo de bienvenida, ajustes; no vencen
--     Al consumir se gastan primero los del plan.
--   * credit_ledger es el historial (auditoría); el saldo vigente vive en
--     credit_balances y solo se modifica dentro de las funciones de abajo.
--   * Escritura solo desde el servidor (service_role). Los clientes solo leen.
--
-- Los planes de pago se insertan inactivos y sin precio: hay que completarlos
-- (precio, créditos, stripe_price_id) y activarlos en una migración posterior.

-- =====================================================================
-- PLANES Y PAQUETES
-- =====================================================================

create table if not exists public.plans (
  code text primary key,
  name text not null,
  price_usd_cents integer not null default 0 check (price_usd_cents >= 0),
  monthly_credits integer not null default 0 check (monthly_credits >= 0),
  -- null = tiendas ilimitadas (sujeto a uso justo)
  max_stores integer check (max_stores is null or max_stores > 0),
  stripe_price_id text unique,
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plans (code, name, max_stores, active, sort_order)
values
  ('free',   'Free',   1,    true,  0),
  ('bronze', 'Bronce', 5,    false, 10),
  ('silver', 'Plata',  10,   false, 20),
  ('gold',   'Oro',    null, false, 30)
on conflict (code) do nothing;

create table if not exists public.credit_packs (
  code text primary key,
  name text not null,
  credits integer not null check (credits > 0),
  price_usd_cents integer not null check (price_usd_cents > 0),
  stripe_price_id text unique,
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- SUSCRIPCIONES (una por cuenta)
-- =====================================================================

create table if not exists public.subscriptions (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  plan_code text not null default 'free' references public.plans(code),
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- CRÉDITOS
-- =====================================================================

create table if not exists public.credit_balances (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  plan_credits integer not null default 0 check (plan_credits >= 0),
  permanent_credits integer not null default 0 check (permanent_credits >= 0),
  plan_credits_expire_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  kind text not null check (kind in (
    'signup_bonus', 'plan_grant', 'plan_expiration',
    'purchase', 'usage', 'refund', 'adjustment'
  )),
  plan_delta integer not null default 0,
  permanent_delta integer not null default 0,
  plan_balance_after integer not null,
  permanent_balance_after integer not null,
  reason text,
  -- Evita aplicar dos veces el mismo movimiento (reintentos, webhooks repetidos)
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_account_created_idx
  on public.credit_ledger (account_id, created_at desc);

-- =====================================================================
-- EVENTOS DE STRIPE (idempotencia de webhooks)
-- =====================================================================

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

-- =====================================================================
-- FUNCIONES DE CRÉDITOS (solo service_role)
-- =====================================================================

-- Reemplaza los créditos del plan por los del nuevo periodo (los sobrantes
-- del periodo anterior se pierden).
create or replace function public.grant_plan_credits(
  p_account_id uuid,
  p_amount integer,
  p_expires_at timestamptz,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_bal public.credit_balances%rowtype;
  v_existing public.credit_ledger%rowtype;
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'amount must be zero or positive';
  end if;

  insert into public.credit_balances (account_id)
  values (p_account_id)
  on conflict (account_id) do nothing;

  -- Bloquea la fila: serializa movimientos concurrentes de la misma cuenta
  select * into v_bal
  from public.credit_balances
  where account_id = p_account_id
  for update;

  select * into v_existing
  from public.credit_ledger
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.account_id <> p_account_id then
      raise exception 'idempotency key belongs to another account';
    end if;

    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'plan_credits', v_existing.plan_balance_after,
      'permanent_credits', v_existing.permanent_balance_after
    );
  end if;

  insert into public.credit_ledger (
    account_id, kind, plan_delta, permanent_delta,
    plan_balance_after, permanent_balance_after,
    reason, idempotency_key, metadata
  )
  values (
    p_account_id, 'plan_grant', p_amount - v_bal.plan_credits, 0,
    p_amount, v_bal.permanent_credits,
    'Créditos del plan', p_idempotency_key, p_metadata
  );

  update public.credit_balances
  set plan_credits = p_amount,
      plan_credits_expire_at = p_expires_at,
      updated_at = now()
  where account_id = p_account_id;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'plan_credits', p_amount,
    'permanent_credits', v_bal.permanent_credits
  );
end;
$function$;

-- Suma créditos permanentes: compras, regalo de bienvenida, reembolsos, ajustes.
create or replace function public.add_permanent_credits(
  p_account_id uuid,
  p_amount integer,
  p_kind text,
  p_idempotency_key text,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_bal public.credit_balances%rowtype;
  v_existing public.credit_ledger%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  if p_kind not in ('signup_bonus', 'purchase', 'refund', 'adjustment') then
    raise exception 'invalid kind: %', p_kind;
  end if;

  insert into public.credit_balances (account_id)
  values (p_account_id)
  on conflict (account_id) do nothing;

  select * into v_bal
  from public.credit_balances
  where account_id = p_account_id
  for update;

  select * into v_existing
  from public.credit_ledger
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.account_id <> p_account_id then
      raise exception 'idempotency key belongs to another account';
    end if;

    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'plan_credits', v_existing.plan_balance_after,
      'permanent_credits', v_existing.permanent_balance_after
    );
  end if;

  insert into public.credit_ledger (
    account_id, kind, plan_delta, permanent_delta,
    plan_balance_after, permanent_balance_after,
    reason, idempotency_key, metadata
  )
  values (
    p_account_id, p_kind, 0, p_amount,
    v_bal.plan_credits, v_bal.permanent_credits + p_amount,
    p_reason, p_idempotency_key, p_metadata
  );

  update public.credit_balances
  set permanent_credits = permanent_credits + p_amount,
      updated_at = now()
  where account_id = p_account_id;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'plan_credits', v_bal.plan_credits,
    'permanent_credits', v_bal.permanent_credits + p_amount
  );
end;
$function$;

-- Descuenta créditos (primero los del plan). Si no alcanzan devuelve
-- ok = false y no modifica el saldo.
create or replace function public.consume_credits(
  p_account_id uuid,
  p_amount integer,
  p_reason text,
  p_idempotency_key text,
  p_business_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_bal public.credit_balances%rowtype;
  v_existing public.credit_ledger%rowtype;
  v_plan integer;
  v_permanent integer;
  v_from_plan integer;
  v_from_permanent integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  insert into public.credit_balances (account_id)
  values (p_account_id)
  on conflict (account_id) do nothing;

  select * into v_bal
  from public.credit_balances
  where account_id = p_account_id
  for update;

  select * into v_existing
  from public.credit_ledger
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.account_id <> p_account_id then
      raise exception 'idempotency key belongs to another account';
    end if;

    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'plan_credits', v_existing.plan_balance_after,
      'permanent_credits', v_existing.permanent_balance_after
    );
  end if;

  v_plan := v_bal.plan_credits;
  v_permanent := v_bal.permanent_credits;

  -- Vencimiento de los créditos del plan (si el periodo ya terminó)
  if v_plan > 0
     and v_bal.plan_credits_expire_at is not null
     and v_bal.plan_credits_expire_at <= now() then

    insert into public.credit_ledger (
      account_id, kind, plan_delta, permanent_delta,
      plan_balance_after, permanent_balance_after,
      reason, idempotency_key
    )
    values (
      p_account_id, 'plan_expiration', -v_plan, 0,
      0, v_permanent,
      'Vencimiento de créditos del plan',
      'expire:' || p_account_id::text || ':' || v_bal.plan_credits_expire_at::text
    )
    on conflict (idempotency_key) do nothing;

    update public.credit_balances
    set plan_credits = 0, updated_at = now()
    where account_id = p_account_id;

    v_plan := 0;
  end if;

  if v_plan + v_permanent < p_amount then
    return jsonb_build_object(
      'ok', false,
      'duplicate', false,
      'plan_credits', v_plan,
      'permanent_credits', v_permanent,
      'required', p_amount
    );
  end if;

  v_from_plan := least(v_plan, p_amount);
  v_from_permanent := p_amount - v_from_plan;

  update public.credit_balances
  set plan_credits = v_plan - v_from_plan,
      permanent_credits = v_permanent - v_from_permanent,
      updated_at = now()
  where account_id = p_account_id;

  insert into public.credit_ledger (
    account_id, business_id, kind, plan_delta, permanent_delta,
    plan_balance_after, permanent_balance_after,
    reason, idempotency_key, metadata
  )
  values (
    p_account_id, p_business_id, 'usage', -v_from_plan, -v_from_permanent,
    v_plan - v_from_plan,
    v_permanent - v_from_permanent,
    p_reason, p_idempotency_key, p_metadata
  );

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'plan_credits', v_plan - v_from_plan,
    'permanent_credits', v_permanent - v_from_permanent
  );
end;
$function$;

-- =====================================================================
-- CUENTAS NUEVAS: suscripción Free + 1000 créditos de bienvenida
-- =====================================================================

create or replace function public.handle_new_account()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  insert into public.subscriptions (account_id)
  values (new.id)
  on conflict (account_id) do nothing;

  insert into public.credit_balances (account_id)
  values (new.id)
  on conflict (account_id) do nothing;

  perform public.add_permanent_credits(
    new.id,
    1000,
    'signup_bonus',
    'signup_bonus:' || new.id::text,
    'Créditos de bienvenida'
  );

  return new;
end;
$function$;

drop trigger if exists trg_handle_new_account on public.accounts;
create trigger trg_handle_new_account
  after insert on public.accounts
  for each row execute function public.handle_new_account();

-- Cuentas que ya existían
insert into public.subscriptions (account_id)
select id from public.accounts
on conflict (account_id) do nothing;

insert into public.credit_balances (account_id)
select id from public.accounts
on conflict (account_id) do nothing;

select public.add_permanent_credits(
  id, 1000, 'signup_bonus', 'signup_bonus:' || id::text, 'Créditos de bienvenida'
)
from public.accounts;

-- =====================================================================
-- LÍMITE DE TIENDAS POR PLAN
-- Cuenta las tiendas de marketplace (pending/connected) de TODOS los negocios
-- de la cuenta. WhatsApp, Facebook, etc. no cuentan como tienda.
-- Solo bloquea conexiones nuevas: no borra ni pausa las existentes.
-- =====================================================================

create or replace function public.enforce_store_limit()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  store_providers constant text[] :=
    array['tiktok_shop', 'mercado_libre', 'shopify', 'amazon'];
  v_account_id uuid;
  v_plan text;
  v_status text;
  v_max integer;
  v_used integer;
begin
  if not (new.provider = any (store_providers)) then
    return new;
  end if;

  if new.status not in ('pending', 'connected') then
    return new;
  end if;

  -- Ya estaba contada como activa: no cambia el total
  if tg_op = 'UPDATE' and old.status in ('pending', 'connected') then
    return new;
  end if;

  select b.account_id into v_account_id
  from public.businesses b
  where b.id = new.business_id;

  -- Bloquea la suscripción para que dos altas simultáneas no superen el límite
  select s.plan_code, s.status into v_plan, v_status
  from public.subscriptions s
  where s.account_id = v_account_id
  for update;

  if not found or v_status not in ('active', 'trialing', 'past_due') then
    v_plan := 'free';
  end if;

  select p.max_stores into v_max
  from public.plans p
  where p.code = v_plan;

  if not found then
    -- Plan desconocido: nunca tratarlo como ilimitado
    v_max := 1;
  end if;

  if v_max is null then
    return new;
  end if;

  select count(*) into v_used
  from public.business_integrations bi
  join public.businesses b on b.id = bi.business_id
  where b.account_id = v_account_id
    and bi.provider = any (store_providers)
    and bi.status in ('pending', 'connected')
    and bi.id is distinct from new.id;

  if v_used >= v_max then
    raise exception 'STORE_LIMIT_REACHED'
      using detail = format('plan=%s, max_stores=%s, used=%s', v_plan, v_max, v_used),
            hint = 'Mejora tu plan para conectar más tiendas.';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_enforce_store_limit on public.business_integrations;
create trigger trg_enforce_store_limit
  before insert or update of status, provider on public.business_integrations
  for each row execute function public.enforce_store_limit();

-- =====================================================================
-- SEGURIDAD: RLS, GRANTs y permisos de ejecución
-- =====================================================================

alter table public.plans enable row level security;
alter table public.credit_packs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_balances enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.stripe_events enable row level security;  -- sin políticas: solo service_role

drop policy if exists plans_select_active on public.plans;
create policy plans_select_active on public.plans
  for select to authenticated
  using (active);

drop policy if exists credit_packs_select_active on public.credit_packs;
create policy credit_packs_select_active on public.credit_packs
  for select to authenticated
  using (active);

drop policy if exists subscriptions_select_account_member on public.subscriptions;
create policy subscriptions_select_account_member on public.subscriptions
  for select to authenticated
  using (public.is_account_member(account_id));

drop policy if exists credit_balances_select_account_member on public.credit_balances;
create policy credit_balances_select_account_member on public.credit_balances
  for select to authenticated
  using (public.is_account_member(account_id));

drop policy if exists credit_ledger_select_account_member on public.credit_ledger;
create policy credit_ledger_select_account_member on public.credit_ledger
  for select to authenticated
  using (public.is_account_member(account_id));

-- Los clientes solo leen
grant select on
  public.plans,
  public.credit_packs,
  public.subscriptions,
  public.credit_balances,
  public.credit_ledger
to authenticated;

-- El servidor (webhooks, agente de IA) escribe con service_role
grant all on
  public.plans,
  public.credit_packs,
  public.subscriptions,
  public.credit_balances,
  public.credit_ledger,
  public.stripe_events
to service_role;

-- Ninguna de estas funciones debe poder llamarse desde el navegador
revoke all on function public.grant_plan_credits(uuid, integer, timestamptz, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.add_permanent_credits(uuid, integer, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.consume_credits(uuid, integer, text, text, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.handle_new_account()
  from public, anon, authenticated;
revoke all on function public.enforce_store_limit()
  from public, anon, authenticated;

grant execute on function public.grant_plan_credits(uuid, integer, timestamptz, text, jsonb)
  to service_role;
grant execute on function public.add_permanent_credits(uuid, integer, text, text, text, jsonb)
  to service_role;
grant execute on function public.consume_credits(uuid, integer, text, text, uuid, jsonb)
  to service_role;
