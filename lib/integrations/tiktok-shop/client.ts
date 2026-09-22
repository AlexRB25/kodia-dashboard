import { createHmac } from "node:crypto";

/**
 * Cliente mínimo de la API de TikTok Shop (Partner Center).
 *
 * Verificado contra la implementación de referencia de un SDK comunitario en
 * producción (EcomPHP/tiktokshop-php):
 *  - Autorización y tokens:  https://auth.tiktok-shops.com  (GET)
 *  - API de negocio:         https://open-api.tiktokglobalshop.com/{categoría}/{versión}/{acción}
 *  - Cada petición lleva app_key, timestamp y sign en la query, y el access token
 *    en la cabecera x-tts-access-token.
 *  - Firma: HMAC-SHA256 hex, con app_secret como clave, sobre
 *    app_secret + ruta + (clave+valor de los parámetros ordenados, sin sign ni
 *    access_token) + cuerpo (si no es GET) + app_secret.
 *
 * NO verificado con TikTok en vivo: el formato exacto de la lista de tiendas
 * (`data.shops[]` con id, name, region, cipher...) y de los campos de expiración
 * del token. Se leen de forma defensiva y fallan con un mensaje claro.
 */

const AUTH_HOST = "https://auth.tiktok-shops.com";
const API_HOST = "https://open-api.tiktokglobalshop.com";

/** Versión de las APIs de autorización, pedidos y productos. */
export const TIKTOK_API_VERSION = "202309";

const REQUEST_TIMEOUT_MS = 15_000;

export class TikTokApiError extends Error {
  constructor(
    message: string,
    public readonly code: number | null,
  ) {
    super(message);
    this.name = "TikTokApiError";
  }
}

export function isTikTokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_SHOP_APP_KEY && process.env.TIKTOK_SHOP_APP_SECRET);
}

function credentials() {
  const appKey = process.env.TIKTOK_SHOP_APP_KEY;
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error("Faltan TIKTOK_SHOP_APP_KEY o TIKTOK_SHOP_APP_SECRET.");
  }

  return { appKey, appSecret };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return null;
}

// ---------------------------------------------------------------------------
// Autorización y tokens
// ---------------------------------------------------------------------------

/**
 * URL a la que se manda al vendedor para que autorice la app. Si defines
 * TIKTOK_SHOP_AUTH_URL (el "authorization link" de tu app en Partner Center) se
 * usa tal cual; si no, se construye con la App Key.
 */
export function buildAuthorizationUrl(state: string): string {
  const custom = process.env.TIKTOK_SHOP_AUTH_URL;
  const url = new URL(
    custom ?? `${AUTH_HOST}/oauth/authorize?app_key=${encodeURIComponent(credentials().appKey)}`,
  );

  url.searchParams.set("state", state);

  return url.toString();
}

export type TikTokTokens = {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  sellerName: string | null;
  sellerRegion: string | null;
};

/** TikTok devuelve un instante Unix (segundos); si viniera como duración, se suma a ahora. */
function parseExpiry(value: unknown): Date | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (!Number.isFinite(n) || n <= 0) return null;

  return n > 1_000_000_000 ? new Date(n * 1000) : new Date(Date.now() + n * 1000);
}

function parseTokens(data: unknown): TikTokTokens {
  if (!isRecord(data)) {
    throw new TikTokApiError("Respuesta de tokens inválida.", null);
  }

  const accessToken = asString(data.access_token);

  if (!accessToken) {
    throw new TikTokApiError("La respuesta de TikTok no incluye access_token.", null);
  }

  return {
    accessToken,
    refreshToken: asString(data.refresh_token),
    accessTokenExpiresAt: parseExpiry(data.access_token_expire_in),
    refreshTokenExpiresAt: parseExpiry(data.refresh_token_expire_in),
    sellerName: asString(data.seller_name),
    sellerRegion: asString(data.seller_base_region),
  };
}

async function authRequest(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(path, AUTH_HOST);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const json: unknown = await response.json().catch(() => null);

  if (!isRecord(json)) {
    throw new TikTokApiError(`TikTok respondió ${response.status} sin un JSON válido.`, null);
  }

  if (json.code !== 0) {
    throw new TikTokApiError(
      typeof json.message === "string" ? json.message : "Error de autorización de TikTok.",
      typeof json.code === "number" ? json.code : null,
    );
  }

  return json.data;
}

/** Cambia el auth_code (de un solo uso) por los tokens del vendedor. */
export async function exchangeAuthCode(authCode: string): Promise<TikTokTokens> {
  const { appKey, appSecret } = credentials();

  return parseTokens(
    await authRequest("/api/v2/token/get", {
      app_key: appKey,
      app_secret: appSecret,
      auth_code: authCode,
      grant_type: "authorized_code",
    }),
  );
}

/** Renueva el access token. El refresh token también se rota: guarda el nuevo. */
export async function refreshAccessToken(refreshToken: string): Promise<TikTokTokens> {
  const { appKey, appSecret } = credentials();

  return parseTokens(
    await authRequest("/api/v2/token/refresh", {
      app_key: appKey,
      app_secret: appSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  );
}

// ---------------------------------------------------------------------------
// API de negocio (peticiones firmadas)
// ---------------------------------------------------------------------------

/** Firma de TikTok Shop. Exportada para poder probarla. */
export function computeSignature(
  appSecret: string,
  path: string,
  params: Record<string, string>,
  body: string,
): string {
  const signed = Object.keys(params)
    .filter((key) => key !== "sign" && key !== "access_token" && key !== "x-tts-access-token")
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");

  return createHmac("sha256", appSecret)
    .update(`${appSecret}${path}${signed}${body}${appSecret}`)
    .digest("hex");
}

type ApiRequest = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** Ruta completa con versión, p. ej. /authorization/202309/shops */
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  accessToken: string;
  /** Las APIs de autorización y de vendedor NO llevan shop_cipher. */
  shopCipher?: string;
};

export async function tiktokApi(request: ApiRequest): Promise<unknown> {
  const { appKey, appSecret } = credentials();

  const params: Record<string, string> = {
    ...request.query,
    app_key: appKey,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };

  if (request.shopCipher) {
    params.shop_cipher = request.shopCipher;
  }

  const bodyText = request.method !== "GET" && request.body !== undefined ? JSON.stringify(request.body) : "";

  params.sign = computeSignature(appSecret, request.path, params, bodyText);

  const url = new URL(request.path, API_HOST);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: request.method,
    headers: {
      "content-type": "application/json",
      "x-tts-access-token": request.accessToken,
    },
    body: bodyText || undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const json: unknown = await response.json().catch(() => null);

  if (!isRecord(json)) {
    throw new TikTokApiError(`TikTok respondió ${response.status} sin un JSON válido.`, null);
  }

  if (json.code !== 0) {
    throw new TikTokApiError(
      typeof json.message === "string" ? json.message : "Error de la API de TikTok Shop.",
      typeof json.code === "number" ? json.code : null,
    );
  }

  return json.data;
}

export type TikTokShop = {
  id: string;
  name: string;
  region: string | null;
  cipher: string;
  code: string | null;
  sellerType: string | null;
};

/** Tiendas que el vendedor autorizó para esta app. */
export async function getAuthorizedShops(accessToken: string): Promise<TikTokShop[]> {
  const data = await tiktokApi({
    method: "GET",
    path: `/authorization/${TIKTOK_API_VERSION}/shops`,
    accessToken,
  });

  const list = isRecord(data) && Array.isArray(data.shops) ? data.shops : null;

  if (!list) {
    const keys = isRecord(data) ? Object.keys(data).join(", ") : typeof data;
    throw new TikTokApiError(`Formato inesperado en la lista de tiendas (campos: ${keys}).`, null);
  }

  return list.flatMap((item): TikTokShop[] => {
    if (!isRecord(item)) return [];

    const id = asString(item.id);
    const cipher = asString(item.cipher);

    if (!id || !cipher) return [];

    return [
      {
        id,
        name: asString(item.name) ?? `Tienda ${id}`,
        region: asString(item.region),
        cipher,
        code: asString(item.code),
        sellerType: asString(item.seller_type),
      },
    ];
  });
}
