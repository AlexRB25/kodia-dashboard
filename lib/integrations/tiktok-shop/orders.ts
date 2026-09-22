import { parseAmountToMinor } from "../../money";
import { TIKTOK_API_VERSION, TikTokApiError, tiktokApi } from "./client";

/**
 * Pedidos de TikTok Shop.
 *
 * Verificado en el SDK de referencia: POST /order/202309/orders/search, con
 * page_size y page_token en la query y los filtros en el cuerpo. Los estados
 * (UNPAID, AWAITING_SHIPMENT, ...) también salen de ahí.
 *
 * NO verificado con TikTok en vivo: los nombres exactos del filtro de fechas
 * (update_time_ge) y de los campos del pedido (id, status, create_time,
 * update_time, payment.total_amount, payment.currency). Se leen de forma
 * defensiva: un pedido con un formato que no entendemos se descarta y se cuenta,
 * en vez de romper la sincronización.
 */

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "other";

/** Estados que cuentan como VENTA en el dashboard. */
export const SALE_STATUSES: OrderStatus[] = ["processing", "shipped", "completed"];

export function normalizeOrderStatus(status: unknown): OrderStatus {
  switch (typeof status === "string" ? status.toUpperCase() : "") {
    case "UNPAID":
      return "pending";
    case "ON_HOLD":
    case "AWAITING_SHIPMENT":
    case "PARTIALLY_SHIPPING":
    case "AWAITING_COLLECTION":
      return "processing";
    case "IN_TRANSIT":
      return "shipped";
    case "DELIVERED":
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "other";
  }
}

export type ParsedOrder = {
  externalId: string;
  status: OrderStatus;
  externalStatus: string | null;
  totalCents: number;
  currency: string;
  placedAt: Date;
  externalUpdatedAt: Date | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Unix en segundos (lo normal en TikTok) o en milisegundos. */
function toDate(value: unknown): Date | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (!Number.isFinite(n) || n <= 0) return null;

  return new Date(n > 1e12 ? n : n * 1000);
}

/** Devuelve el pedido normalizado, o null si le falta algo imprescindible. */
export function parseOrder(raw: unknown): ParsedOrder | null {
  if (!isRecord(raw)) return null;

  const externalId =
    typeof raw.id === "string" ? raw.id : typeof raw.id === "number" ? String(raw.id) : null;
  const payment = isRecord(raw.payment) ? raw.payment : null;
  const currency = typeof payment?.currency === "string" ? payment.currency.toUpperCase() : null;
  const placedAt = toDate(raw.create_time);

  if (!externalId || !currency || !/^[A-Z]{3}$/.test(currency) || !placedAt) return null;

  const totalCents = parseAmountToMinor(payment?.total_amount, currency);

  if (totalCents === null) return null;

  return {
    externalId,
    status: normalizeOrderStatus(raw.status),
    externalStatus: typeof raw.status === "string" ? raw.status : null,
    totalCents,
    currency,
    placedAt,
    externalUpdatedAt: toDate(raw.update_time),
  };
}

export const ORDERS_PAGE_SIZE = 50;

export type OrdersPage = {
  orders: unknown[];
  nextPageToken: string | null;
};

/** Una página de pedidos actualizados desde `updatedSince`. */
export async function fetchOrdersPage(params: {
  accessToken: string;
  shopCipher: string;
  updatedSince: Date;
  pageToken?: string | null;
}): Promise<OrdersPage> {
  const query: Record<string, string> = { page_size: String(ORDERS_PAGE_SIZE) };

  if (params.pageToken) {
    query.page_token = params.pageToken;
  }

  const data = await tiktokApi({
    method: "POST",
    path: `/order/${TIKTOK_API_VERSION}/orders/search`,
    query,
    body: { update_time_ge: Math.floor(params.updatedSince.getTime() / 1000) },
    accessToken: params.accessToken,
    shopCipher: params.shopCipher,
  });

  if (!isRecord(data)) {
    throw new TikTokApiError("Respuesta de pedidos inválida.", null);
  }

  // Sin pedidos, TikTok puede omitir el campo
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const next = typeof data.next_page_token === "string" ? data.next_page_token : "";

  return { orders, nextPageToken: next || null };
}
