-- País, moneda de reporte y zona horaria por negocio.
--
-- * country  : ISO 3166-1 alpha-2 (MX, US, CO...)
-- * currency : ISO 4217, moneda en la que el negocio quiere ver sus reportes
-- * timezone : nombre IANA; define qué significa "hoy" en el dashboard
--
-- Los negocios existentes quedan en MX / MXN / America/Mexico_City. La app
-- valida la zona horaria; aquí solo se comprueba el formato.

alter table public.businesses
  add column if not exists country text not null default 'MX',
  add column if not exists currency text not null default 'MXN',
  add column if not exists timezone text not null default 'America/Mexico_City';

alter table public.businesses
  drop constraint if exists businesses_country_format_check;
alter table public.businesses
  add constraint businesses_country_format_check check (country ~ '^[A-Z]{2}$');

alter table public.businesses
  drop constraint if exists businesses_currency_format_check;
alter table public.businesses
  add constraint businesses_currency_format_check check (currency ~ '^[A-Z]{3}$');

alter table public.businesses
  drop constraint if exists businesses_timezone_not_empty_check;
alter table public.businesses
  add constraint businesses_timezone_not_empty_check check (length(trim(timezone)) > 0);
