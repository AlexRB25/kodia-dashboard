-- El catálogo de planes y paquetes de créditos lo puede ver cualquier usuario
-- autenticado, esté o no a la venta.
--
-- Antes la política solo dejaba leer filas con active = true, así que los planes
-- de pago (todavía inactivos) no aparecían en la pantalla "Plan y créditos".
-- Desde ahora `active` solo significa "se puede comprar"; la visibilidad es
-- siempre para usuarios autenticados. El catálogo no contiene datos sensibles.

drop policy if exists plans_select_active on public.plans;
drop policy if exists plans_select_authenticated on public.plans;
create policy plans_select_authenticated on public.plans
  for select to authenticated
  using (true);

drop policy if exists credit_packs_select_active on public.credit_packs;
drop policy if exists credit_packs_select_authenticated on public.credit_packs;
create policy credit_packs_select_authenticated on public.credit_packs
  for select to authenticated
  using (true);
