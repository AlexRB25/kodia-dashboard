-- Integraciones: varias cuentas por canal, secretos cifrados y estados de OAuth.
--
-- CAMBIOS QUE QUITAN PERMISOS O RESTRICCIONES (revisar antes de aplicar):
--   1. Se elimina UNIQUE (business_id, provider): un negocio puede tener varias
--      cuentas del mismo canal (varias tiendas de TikTok, varios numeros de WhatsApp).
--   2. Se eliminan las politicas de INSERT/UPDATE/DELETE de business_integrations y
--      se revocan esos permisos a `authenticated`. Antes cualquier miembro podia
--      escribir filas desde el navegador; con el ID de tienda ahora unico en toda
--      la plataforma, eso permitiria "reservar" el ID de una tienda ajena o marcar
--      como conectado algo que no lo esta. Desde ahora SOLO el servidor
--      (service_role) crea, actualiza y desconecta integraciones. La lectura
--      (SELECT) no cambia. La app actual solo lee esta tabla.

-- =====================================================================
-- business_integrations
-- =====================================================================

alter table public.business_integrations
  drop constraint if exists business_integrations_business_provider_unique;

alter table public.business_integrations
  drop constraint if exists business_integrations_provider_check;
alter table public.business_integrations
  add constraint business_integrations_provider_check check (provider in (
    'whatsapp', 'tiktok_shop', 'mercado_libre', 'shopify', 'amazon',
    'facebook', 'instagram', 'facebook_ads', 'tiktok_ads'
  ));

alter table public.business_integrations
  add column if not exists connected_by uuid references auth.users(id) on delete set null,
  add column if not exists last_error text,
  add column if not exists last_synced_at timestamptz;

-- Una cuenta externa (tienda, numero, pagina...) solo puede estar en UN negocio.
-- Tambien permite enrutar webhooks: el shop_id del evento identifica al negocio.
create unique index if not exists business_integrations_provider_account_unique
  on public.business_integrations (provider, external_account_id)
  where external_account_id is not null;

-- Solo el servidor escribe integraciones
drop policy if exists business_integrations_insert on public.business_integrations;
drop policy if exists business_integrations_update on public.business_integrations;
drop policy if exists business_integrations_delete on public.business_integrations;

revoke insert, update, delete on public.business_integrations from authenticated;

grant all on public.business_integrations to service_role;

-- =====================================================================
-- integration_secrets: tokens de acceso (CIFRADOS por la aplicacion)
-- Sin politicas ni permisos para clientes: solo service_role.
-- =====================================================================

create table if not exists public.integration_secrets (
  integration_id uuid primary key references public.business_integrations(id) on delete cascade,
  access_token_enc text not null,
  refresh_token_enc text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.integration_secrets enable row level security;

grant all on public.integration_secrets to service_role;

-- =====================================================================
-- oauth_states: protege el flujo de autorizacion contra CSRF
-- Un state de un solo uso, ligado al usuario y al negocio que inicio el flujo.
-- =====================================================================

create table if not exists public.oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists oauth_states_user_created_idx
  on public.oauth_states (user_id, created_at desc);
create index if not exists oauth_states_expires_idx
  on public.oauth_states (expires_at);

alter table public.oauth_states enable row level security;

grant all on public.oauth_states to service_role;
