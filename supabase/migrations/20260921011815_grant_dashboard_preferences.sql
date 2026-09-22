-- dashboard_preferences: el rol authenticated necesita privilegios de tabla,
-- ademas de las politicas RLS; sin el GRANT PostgREST responde 42501.
-- Idempotente: aplicarlo varias veces no cambia nada.
grant select, insert, update on public.dashboard_preferences to authenticated;
