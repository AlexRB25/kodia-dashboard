-- Precios PROVISIONALES de planes y paquetes de créditos (USD).
-- Se ajustarán con migraciones nuevas cuando se definan de verdad.
--
-- Base de cálculo
--   1 crédito ~ US$0.004 de costo de IA. Cada llamada a la IA descontará
--   max(1, ceil(costo_real_usd / 0.004)) créditos según los tokens consumidos.
--   Los 1,000 créditos de bienvenida cuestan como máximo ~US$4 si se usan todos.
--
-- Los planes y paquetes quedan INACTIVOS (active = false) hasta que existan sus
-- precios en Stripe (stripe_price_id). Activarlos es un UPDATE posterior.

-- Planes de pago (Free no cambia: precio 0, 1 tienda, sin créditos mensuales)
update public.plans set price_usd_cents = 1900, monthly_credits = 1000, updated_at = now()
where code = 'bronze';

update public.plans set price_usd_cents = 4900, monthly_credits = 3500, updated_at = now()
where code = 'silver';

update public.plans set price_usd_cents = 9900, monthly_credits = 9000, updated_at = now()
where code = 'gold';

-- Paquetes de créditos (no vencen). Más caros por crédito que los planes, a
-- propósito: los planes deben ser la opción más conveniente.
insert into public.credit_packs (code, name, credits, price_usd_cents, active, sort_order)
values
  ('credits_100',  '100 créditos',   100,  500, false, 10),
  ('credits_250',  '250 créditos',   250,  1100, false, 20),
  ('credits_500',  '500 créditos',   500,  2000, false, 30),
  ('credits_1000', '1,000 créditos', 1000, 3500, false, 40),
  ('credits_2500', '2,500 créditos', 2500, 7500, false, 50)
on conflict (code) do update
set name = excluded.name,
    credits = excluded.credits,
    price_usd_cents = excluded.price_usd_cents,
    sort_order = excluded.sort_order,
    updated_at = now();
