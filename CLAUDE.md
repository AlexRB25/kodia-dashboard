@AGENTS.md

# Base de datos (Supabase)

Todo cambio de esquema (tablas, columnas, funciones, políticas RLS, GRANTs, triggers) se escribe como una migración SQL en `supabase/migrations/`, nunca se aplica a mano ni se pide pegar SQL en el dashboard de Supabase.

- **Nombre:** `YYYYMMDDHHMMSS_descripcion_corta.sql` (`date -u +%Y%m%d%H%M%S` para el prefijo).
- **Nunca editar una migración ya aplicada.** Un cambio nuevo es una migración nueva.
- **Preferir SQL idempotente** (`create table if not exists`, `add column if not exists`, `drop policy if exists` + `create policy`).
- **Tablas nuevas:** activar RLS y dar `GRANT` explícito al rol `authenticated` solo de lo necesario. Sin el GRANT, PostgREST responde `42501 permission denied` aunque existan políticas.
- **Secretos** (tokens de integraciones) van en tablas sin políticas para clientes; solo el servidor las lee con la service role.
- Referencia del esquema actual en producción: `supabase/reference/` (solo lectura, no es una migración).

## Cómo se aplican

Solo hay un proyecto de Supabase y es producción. Se aplica con la CLI de Supabase (`npx --yes supabase@2.117.0 ...`), ya enlazada por el usuario con `link`:

1. `db push --dry-run` para ver exactamente qué SQL se va a ejecutar.
2. Migraciones **aditivas** (crear tabla/columna/índice/política, GRANT): se aplican con `db push` y se informa al usuario qué se ejecutó.
3. Migraciones **destructivas o que reescriben datos** (`drop`, `truncate`, `delete`, `alter column ... type`, quitar políticas o permisos): pedir confirmación explícita antes de aplicar, mostrando el SQL.
4. Si `db push` falla, no reintentar a ciegas: informar el error tal cual.

Nunca pedir ni leer contraseñas, la service role key ni tokens; la CLI usa la sesión del usuario.

# Soporte con IA

Código en `lib/support/` (agente, herramientas, base de ayuda, aviso al equipo) y `app/api/support/chat/route.ts`; pantalla en `app/businesses/[businessId]/support/`.

- **Un ticket = un solo tema.** Lo aplican el prompt del agente y el esquema de `create_ticket`.
- El agente **nunca escribe con la sesión del usuario**: los mensajes y tickets los inserta el servidor con `createAdminClient()` (service role), después de verificar membresía con la sesión. El `business_id` y el `user_id` salen de la sesión, jamás del modelo.
- Las herramientas del agente son de solo lectura, salvo `create_ticket`. Cualquier cambio de cuenta, plan, créditos o permisos se hace por ticket y lo resuelve una persona.
- **La base de ayuda (`lib/support/help-articles.ts`) es la única fuente de verdad del agente sobre el producto.** Al cambiar una función del producto, actualiza el artículo correspondiente; si no, el agente repetirá información vieja. Solo se documenta lo que existe hoy.
- El asistente de soporte no consume créditos del cliente.

# Cobros (Stripe)

Sin cumplimiento PCI propio: **la tarjeta nunca pasa por Kodia**. Se usa Stripe Checkout y el portal de clientes, ambos alojados por Stripe; la app solo crea la sesión por API y recibe avisos. No añadir formularios de tarjeta propios ni manejar números de tarjeta.

- Código: `lib/billing/` (cliente, contexto de seguridad, webhook), `app/api/billing/{checkout,portal}`, `app/api/stripe/webhook`, pantalla `app/businesses/[businessId]/billing/`.
- **El webhook es la única fuente de verdad** para entregar planes y créditos; la página de retorno solo informa. Del evento se usa solo su id y se vuelve a pedir el objeto a Stripe. Todo es idempotente (claves `stripe_checkout:<session>` y `stripe_invoice:<invoice>` en el libro de créditos).
- **El precio vive en Stripe** con `lookup_key` = código del plan o paquete (`bronze`, `credits_500`...). Antes de cobrar se comprueba que coincide con `price_usd_cents` de la base de datos.
- Solo dueño o administrador de la CUENTA puede pagar (se valida en el servidor, con la service role).
- Si cambias precios o planes: nuevo precio en Stripe con `transfer_lookup_key`, y migración que actualice `plans`/`credit_packs`.
- Un producto se puede comprar cuando `active = true` en su tabla Y `STRIPE_SECRET_KEY` está configurada; si no, la pantalla muestra «Próximamente».

# Integraciones (TikTok Shop y siguientes)

- **Un negocio puede tener varias cuentas del mismo canal** (varias tiendas), y **una cuenta externa solo puede estar en un negocio** (índice único `(provider, external_account_id)`). Nunca asumir una sola integración por proveedor.
- **Solo el servidor escribe `business_integrations`** (los usuarios solo leen). Conectar y desconectar exige ser dueño o administrador de la CUENTA (`lib/account/context.ts`).
- **Los tokens van cifrados** (AES-256-GCM, `lib/security/secrets.ts`) en `integration_secrets`, tabla sin acceso para clientes. Nunca guardarlos en `config` ni en columnas legibles. Para usarlos: `getAccessToken()` (renueva si están por vencer).
- OAuth: el `state` es de un solo uso, ligado a usuario y negocio (`oauth_states`), y se reclama de forma atómica en el callback.
- TikTok Shop (`lib/integrations/tiktok-shop/`): la conexión inicia en `/api/integrations/tiktok-shop/connect` y vuelve a `/api/integrations/tiktok-shop/callback` (esa es la Redirect URL a registrar en Partner Center). Las llamadas a la API de negocio se firman con `computeSignature` y `tiktokApi()`; las de `authorization/` y `seller/` NO llevan `shop_cipher`.
- **Pendiente de verificar con TikTok en vivo**: el formato exacto de la lista de tiendas (`data.shops[]`) y de los campos de expiración del token; el código los lee de forma defensiva.
- Al añadir un canal nuevo: proveedor en el `CHECK` de `business_integrations`, si cuenta como «tienda» en `enforce_store_limit`, y su artículo en la base de ayuda.

# Pedidos y métricas del dashboard

- `orders` es canónica para todos los canales: monto en **unidades menores enteras** (`total_cents`) y su moneda original; nunca decimales ni floats. Helpers en `lib/money.ts`.
- **No se guardan datos personales del comprador** (nombre, teléfono, dirección, correo). Añadirlos exige revisar privacidad primero.
- Solo cuentan como venta `processing`, `shipped` y `completed` (`SALE_STATUSES`); `pending` y `cancelled` no.
- Sincronización: `lib/integrations/tiktok-shop/sync.ts` (upsert idempotente por `(provider, external_order_id)`; el punto de partida `last_synced_at` solo avanza si se leyeron TODAS las páginas). Se dispara al conectar la tienda (`after()`), con el botón «Sincronizar pedidos» (`/api/integrations/tiktok-shop/sync`, cualquier miembro) y desde `/api/cron/sync-orders` (requiere `CRON_SECRET`). No hay `vercel.json` con crons a propósito: en el plan Hobby solo se permite una ejecución diaria y un cron más frecuente rompe el despliegue; usar un programador externo o Vercel Pro.
- «Hoy» se calcula en la **zona horaria del negocio** (`lib/dashboard/timezone.ts`), nunca en UTC.
- Los totales se calculan en SQL (`orders_summary`, `orders_daily`, SECURITY INVOKER: la RLS limita qué se suma). Monedas distintas **no se convierten** (aún no hay tipo de cambio): se muestran aparte.
- Las tarjetas del dashboard cargan con `Suspense` y comparten una sola carga (`React.cache`). Si falla la carga devuelven ceros; el dashboard nunca debe romperse por métricas.
- **Pendiente de verificar con TikTok en vivo**: nombres de los campos del pedido (`id`, `status`, `create_time`, `payment.total_amount`, `payment.currency`) y del filtro (`update_time_ge`).

## Variables de entorno (solo servidor)

Van en `.env.local` y en Vercel; nunca en el chat ni en el repo, y sin prefijo `NEXT_PUBLIC_`.

| Variable | Para qué | Obligatoria |
|---|---|---|
| `ANTHROPIC_API_KEY` | Agente de soporte | Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Escribir mensajes y tickets | Sí |
| `SUPPORT_DISCORD_WEBHOOK_URL` | Avisar al equipo de cada ticket nuevo | No (sin ella el ticket se guarda igual y queda `notification_error`) |
| `STRIPE_SECRET_KEY` | Crear pagos y portal (`sk_test_...` en pruebas) | Para cobrar |
| `STRIPE_WEBHOOK_SECRET` | Verificar la firma del webhook (`whsec_...`) | Para cobrar |
| `TIKTOK_SHOP_APP_KEY` | App Key de tu app en Partner Center | Para TikTok Shop |
| `TIKTOK_SHOP_APP_SECRET` | App Secret de tu app | Para TikTok Shop |
| `TIKTOK_SHOP_AUTH_URL` | «Authorization link» de tu app (si no, se arma con la App Key) | No |
| `INTEGRATION_ENCRYPTION_KEY` | Clave AES-256 (32 bytes en base64) para cifrar tokens. Si se pierde, hay que reconectar todo | Para cualquier integración con tokens |
| `CRON_SECRET` | Autoriza la sincronización periódica de pedidos (`Authorization: Bearer <valor>`) | Solo para sincronizar en automático |
| `SUPPORT_AI_MODEL` | Cambiar el modelo (por defecto `claude-opus-5`; `claude-sonnet-5` es más barato) | No |
