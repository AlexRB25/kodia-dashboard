import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { getAccountAdminContext } from "@/lib/account/context";
import { buildAuthorizationUrl, isTikTokConfigured } from "@/lib/integrations/tiktok-shop/client";
import { isEncryptionConfigured } from "@/lib/security/secrets";

const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING_STATES = 10;

function backTo(request: Request, businessId: string | null, reason: string) {
  const path = businessId ? `/businesses/${businessId}/integrations` : "/businesses";
  return NextResponse.redirect(new URL(`${path}?tiktok=error&reason=${reason}`, request.url));
}

/**
 * Inicia la conexión de una tienda de TikTok Shop: guarda un `state` de un solo
 * uso (ligado al usuario y al negocio) y manda al vendedor a autorizar la app.
 * GET /api/integrations/tiktok-shop/connect?businessId=...
 */
export async function GET(request: Request) {
  const businessId = new URL(request.url).searchParams.get("businessId");

  if (!isTikTokConfigured() || !isEncryptionConfigured()) {
    console.error("TikTok connect: faltan TIKTOK_SHOP_APP_KEY/SECRET o INTEGRATION_ENCRYPTION_KEY");
    return backTo(request, businessId, "not_configured");
  }

  const auth = await getAccountAdminContext(businessId, {
    unavailable: "La conexión todavía no está disponible.",
    denied: "Solo el dueño o un administrador de la cuenta puede conectar tiendas.",
  });

  if (!auth.ok) {
    if (auth.status === 401) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return backTo(request, auth.status === 400 ? null : businessId, auth.status === 403 ? "forbidden" : "unavailable");
  }

  const { user, admin } = auth.ctx;

  // Limpieza y tope: evita acumular states por spam
  await admin.from("oauth_states").delete().lt("expires_at", new Date().toISOString());

  const { count } = await admin
    .from("oauth_states")
    .select("state", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("used_at", null);

  if ((count ?? 0) >= MAX_PENDING_STATES) {
    return backTo(request, auth.ctx.businessId, "too_many_attempts");
  }

  const state = randomBytes(24).toString("hex");

  const { error } = await admin.from("oauth_states").insert({
    state,
    user_id: user.id,
    business_id: auth.ctx.businessId,
    provider: "tiktok_shop",
    expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
  });

  if (error) {
    console.error("TikTok connect: no se pudo guardar el state:", error);
    return backTo(request, auth.ctx.businessId, "unavailable");
  }

  return NextResponse.redirect(buildAuthorizationUrl(state));
}
