import { after, NextResponse } from "next/server";

import { getAccountAdminContext } from "@/lib/account/context";
import {
  exchangeAuthCode,
  getAuthorizedShops,
  isTikTokConfigured,
} from "@/lib/integrations/tiktok-shop/client";
import { connectAuthorizedShops } from "@/lib/integrations/tiktok-shop/connect";
import { syncBusinessOrders } from "@/lib/integrations/tiktok-shop/sync";
import { isEncryptionConfigured } from "@/lib/security/secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

function goTo(request: Request, businessId: string | null, params: Record<string, string>) {
  const path = businessId ? `/businesses/${businessId}/integrations` : "/businesses";
  const url = new URL(path, request.url);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}

/**
 * A donde vuelve TikTok tras autorizar la app (esta es la "Redirect URL" que
 * registras en Partner Center): /api/integrations/tiktok-shop/callback
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const code = query.get("code");
  const state = query.get("state");

  if (!isTikTokConfigured() || !isEncryptionConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("TikTok callback: configuración incompleta");
    return goTo(request, null, { tiktok: "error", reason: "not_configured" });
  }

  if (!state) {
    return goTo(request, null, { tiktok: "error", reason: "invalid_state" });
  }

  const admin = createAdminClient();

  // 1. El state debe existir, ser de este usuario, no estar usado ni vencido.
  //    Se marca como usado de forma atómica: un mismo state no sirve dos veces.
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: claimed } = await admin
    .from("oauth_states")
    .update({ used_at: new Date().toISOString() })
    .eq("state", state)
    .eq("user_id", user.id)
    .eq("provider", "tiktok_shop")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("business_id")
    .maybeSingle();

  if (!claimed) {
    return goTo(request, null, { tiktok: "error", reason: "invalid_state" });
  }

  const businessId = claimed.business_id as string;

  // 2. El vendedor canceló la autorización
  if (query.get("error") || !code) {
    return goTo(request, businessId, { tiktok: "error", reason: "denied" });
  }

  // 3. Sigue teniendo permiso sobre la cuenta
  const auth = await getAccountAdminContext(businessId, {
    unavailable: "La conexión todavía no está disponible.",
    denied: "Solo el dueño o un administrador de la cuenta puede conectar tiendas.",
  });

  if (!auth.ok) {
    return goTo(request, businessId, { tiktok: "error", reason: "forbidden" });
  }

  try {
    // 4. Tokens y tiendas autorizadas
    const tokens = await exchangeAuthCode(code);
    const shops = await getAuthorizedShops(tokens.accessToken);

    if (shops.length === 0) {
      return goTo(request, businessId, { tiktok: "error", reason: "no_shops" });
    }

    // 5. Guardar las tiendas (tokens cifrados)
    const result = await connectAuthorizedShops({
      admin,
      businessId,
      userId: user.id,
      tokens,
      shops,
    });

    // Primera sincronización de pedidos, sin hacer esperar al usuario
    if (result.connected.length > 0) {
      after(async () => {
        try {
          await syncBusinessOrders(admin, businessId, { deadline: Date.now() + 45_000 });
        } catch (syncError) {
          console.error("TikTok callback: falló la primera sincronización:", syncError);
        }
      });
    }

    const limited = result.skipped.filter((shop) => shop.reason === "store_limit").length;
    const elsewhere = result.skipped.filter((shop) => shop.reason === "elsewhere").length;

    if (result.connected.length === 0) {
      return goTo(request, businessId, {
        tiktok: "error",
        reason: limited > 0 ? "store_limit" : "elsewhere",
      });
    }

    return goTo(request, businessId, {
      tiktok: result.skipped.length > 0 ? "partial" : "connected",
      n: String(result.connected.length),
      ...(limited > 0 ? { limited: String(limited) } : {}),
      ...(elsewhere > 0 ? { elsewhere: String(elsewhere) } : {}),
    });
  } catch (error) {
    console.error(
      "TikTok callback: falló la conexión:",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );

    return goTo(request, businessId, { tiktok: "error", reason: "exchange_failed" });
  }
}
