import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchOrdersPage, parseOrder } from "./orders";
import { getAccessToken } from "./tokens";

type Admin = SupabaseClient;

const MAX_PAGES = 40;
/** Se pide desde un poco antes de la última sincronización por si un pedido cambió en el margen. */
const OVERLAP_MS = 10 * 60 * 1000;
const INITIAL_BACKFILL_DAYS = 30;

export type IntegrationRow = {
  id: string;
  business_id: string;
  last_synced_at: string | null;
  config: { shop_cipher?: string | null } | null;
};

export type SyncResult = {
  integrationId: string;
  fetched: number;
  saved: number;
  /** Pedidos con un formato que no entendemos (descartados). */
  discarded: number;
  /** Se leyeron todas las páginas dentro del tiempo disponible. */
  complete: boolean;
  skipped?: boolean;
  error?: string;
};

type SyncOptions = {
  /** No sincronizar si la última fue hace menos de esto. */
  minIntervalMs?: number;
  /** Instante (Date.now()) a partir del cual dejar de pedir páginas. */
  deadline?: number;
};

async function recordOutcome(
  admin: Admin,
  integrationId: string,
  fields: { last_synced_at?: string; last_error: string | null },
) {
  await admin
    .from("business_integrations")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", integrationId);
}

/**
 * Trae los pedidos nuevos o modificados de UNA tienda y los guarda (upsert por
 * proveedor + id del pedido: repetirlo no duplica nada). El `business_id` sale de
 * la integración guardada, jamás de lo que devuelve TikTok.
 *
 * El punto de partida (last_synced_at) solo avanza si se leyeron TODAS las
 * páginas; si se corta por tiempo o por tope de páginas se reintenta desde el
 * mismo punto en la siguiente ejecución.
 */
export async function syncIntegrationOrders(
  admin: Admin,
  integration: IntegrationRow,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const result: SyncResult = {
    integrationId: integration.id,
    fetched: 0,
    saved: 0,
    discarded: 0,
    complete: false,
  };

  if (
    options.minIntervalMs &&
    integration.last_synced_at &&
    Date.now() - new Date(integration.last_synced_at).getTime() < options.minIntervalMs
  ) {
    return { ...result, complete: true, skipped: true };
  }

  const shopCipher = integration.config?.shop_cipher;

  if (!shopCipher) {
    const error = "La tienda no tiene shop_cipher. Vuelve a conectarla.";
    await recordOutcome(admin, integration.id, { last_error: error });
    return { ...result, error };
  }

  const runStart = new Date();
  const updatedSince = integration.last_synced_at
    ? new Date(new Date(integration.last_synced_at).getTime() - OVERLAP_MS)
    : new Date(runStart.getTime() - INITIAL_BACKFILL_DAYS * 24 * 60 * 60 * 1000);

  try {
    const accessToken = await getAccessToken(admin, integration.id);
    let pageToken: string | null = null;
    let pages = 0;
    // Se cortó por tiempo o por tope de páginas ANTES de leer todo: no es una sincronización completa
    let truncated = false;

    do {
      if (pages >= MAX_PAGES || (options.deadline && Date.now() > options.deadline)) {
        truncated = true;
        break;
      }

      const page = await fetchOrdersPage({ accessToken, shopCipher, updatedSince, pageToken });
      pages++;
      result.fetched += page.orders.length;

      const rows = page.orders.flatMap((raw) => {
        const order = parseOrder(raw);

        if (!order) {
          result.discarded++;
          return [];
        }

        return [
          {
            business_id: integration.business_id,
            integration_id: integration.id,
            provider: "tiktok_shop",
            external_order_id: order.externalId,
            status: order.status,
            external_status: order.externalStatus,
            total_cents: order.totalCents,
            currency: order.currency,
            placed_at: order.placedAt.toISOString(),
            external_updated_at: order.externalUpdatedAt?.toISOString() ?? null,
            updated_at: new Date().toISOString(),
          },
        ];
      });

      if (rows.length > 0) {
        const { error } = await admin
          .from("orders")
          .upsert(rows, { onConflict: "provider,external_order_id" });

        if (error) {
          throw new Error(`No se pudieron guardar los pedidos: ${error.message}`);
        }

        result.saved += rows.length;
      }

      pageToken = page.nextPageToken;
    } while (pageToken);

    result.complete = !truncated;

    if (result.complete) {
      await recordOutcome(admin, integration.id, {
        last_synced_at: runStart.toISOString(),
        last_error:
          result.discarded > 0
            ? `${result.discarded} pedido(s) con un formato que no entendemos se omitieron.`
            : null,
      });
    } else {
      await recordOutcome(admin, integration.id, {
        last_error: "Sincronización incompleta: hay más pedidos de los que caben en una ejecución. Se continuará en la siguiente.",
      });
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await recordOutcome(admin, integration.id, { last_error: message.slice(0, 500) });

    return { ...result, error: message };
  }
}

/** Sincroniza todas las tiendas conectadas de TikTok Shop de un negocio, una por una. */
export async function syncBusinessOrders(
  admin: Admin,
  businessId: string,
  options: SyncOptions = {},
): Promise<SyncResult[]> {
  const { data, error } = await admin
    .from("business_integrations")
    .select("id, business_id, last_synced_at, config")
    .eq("business_id", businessId)
    .eq("provider", "tiktok_shop")
    .eq("status", "connected");

  if (error) {
    throw new Error(`No se pudieron leer las tiendas del negocio: ${error.message}`);
  }

  const results: SyncResult[] = [];

  for (const integration of (data ?? []) as IntegrationRow[]) {
    results.push(await syncIntegrationOrders(admin, integration, options));
  }

  return results;
}
