-- Soporte con IA: conversaciones, mensajes y tickets.
--
-- Modelo
--   * El usuario habla con un agente de IA (support_conversations / support_messages).
--   * Si la IA no puede resolverlo, crea un ticket (support_tickets).
--     UN TEMA POR TICKET: cada ticket tiene una sola categoria y un solo asunto.
--     Otro tema distinto = otro ticket.
--   * Toda ESCRITURA la hace el servidor con service_role: asi el usuario no puede
--     falsificar mensajes "del asistente" ni alterar la transcripcion de un ticket.
--   * Los usuarios solo LEEN lo suyo. El personal de la plataforma (platform_staff)
--     lee todo y puede actualizar tickets.
--
-- Para dar de alta a una persona del equipo (solo tu, desde el SQL Editor):
--   insert into public.platform_staff (user_id)
--   select id from auth.users where email = 'tu-correo@ejemplo.com'
--   on conflict do nothing;

-- =====================================================================
-- PERSONAL DE LA PLATAFORMA
-- =====================================================================

create table if not exists public.platform_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.platform_staff s
    where s.user_id = auth.uid()
  );
$function$;

-- =====================================================================
-- CONVERSACIONES Y MENSAJES
-- =====================================================================

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_conversations_owner_idx
  on public.support_conversations (business_id, user_id, updated_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);

create index if not exists support_messages_conversation_idx
  on public.support_messages (conversation_id, created_at);

-- Para el limite de mensajes por usuario y hora
create index if not exists support_messages_user_recent_idx
  on public.support_messages (user_id, created_at desc);

-- =====================================================================
-- TICKETS (un tema por ticket)
-- =====================================================================

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.support_conversations(id) on delete set null,
  category text not null check (category in (
    'integrations', 'billing', 'credits', 'account', 'bug', 'feature_request', 'other'
  )),
  subject text not null check (char_length(subject) between 5 and 140),
  summary text not null check (char_length(summary) between 10 and 4000),
  steps_tried text check (steps_tried is null or char_length(steps_tried) <= 4000),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  -- true si la solucion exige una aprobacion o cambio que solo el equipo puede hacer
  requires_approval boolean not null default false,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  -- Instantanea del estado del negocio y transcripcion de la conversacion:
  -- las agrega el servidor, no el modelo.
  diagnostics jsonb not null default '{}'::jsonb,
  transcript jsonb not null default '[]'::jsonb,
  -- Aviso al equipo (Discord, ClickUp...)
  notified_at timestamptz,
  notification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_tickets_business_status_idx
  on public.support_tickets (business_id, status);
create index if not exists support_tickets_creator_idx
  on public.support_tickets (created_by, created_at desc);
create index if not exists support_tickets_status_created_idx
  on public.support_tickets (status, created_at desc);

-- =====================================================================
-- SEGURIDAD
-- =====================================================================

alter table public.platform_staff enable row level security;  -- sin politicas: solo service_role
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_tickets enable row level security;

drop policy if exists support_conversations_select on public.support_conversations;
create policy support_conversations_select on public.support_conversations
  for select to authenticated
  using (
    (user_id = auth.uid() and public.is_business_member(business_id))
    or public.is_platform_staff()
  );

drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages
  for select to authenticated
  using (user_id = auth.uid() or public.is_platform_staff());

drop policy if exists support_tickets_select on public.support_tickets;
create policy support_tickets_select on public.support_tickets
  for select to authenticated
  using (created_by = auth.uid() or public.is_platform_staff());

drop policy if exists support_tickets_update_staff on public.support_tickets;
create policy support_tickets_update_staff on public.support_tickets
  for update to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

-- Los usuarios solo leen; el personal ademas actualiza tickets
grant select on
  public.support_conversations,
  public.support_messages,
  public.support_tickets
to authenticated;

grant update on public.support_tickets to authenticated;

-- El servidor escribe con service_role
grant all on
  public.platform_staff,
  public.support_conversations,
  public.support_messages,
  public.support_tickets
to service_role;
