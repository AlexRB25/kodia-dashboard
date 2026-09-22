import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { isTikTokConfigured } from "@/lib/integrations/tiktok-shop/client";
import { syncIntegrationOrders, type IntegrationRow } from "@/lib/integrations/tiktok-shop/sync";
import { isEncryptionConfigured } from "@/lib/security/secrets";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const TIME_BUDGET_MS = 50_000;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";

  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);

  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Sincroniza los pedidos de todas las tiendas conectadas, empezando por las que
 * llevan más tiempo sin actualizarse. Se llama desde un programador externo con
 *   Authorization: Bearer <CRON_SECRET>
 * (Vercel Cron lo envía solo si defines CRON_SECRET; en el plan Hobby solo
 * permite una vez al día, por eso también se puede usar cron-job.org o similar).
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!isTikTokConfigured() || !isEncryptionConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Configuración incompleta." }, { status: 503 });
  }

  const admin = createAdminClient();
  const deadline = Date.now() + TIME_BUDGET_MS;

  const { data, error } = await admin
    .from("business_integrations")
    .select("id, business_id, last_synced_at, config")
    .eq("provider", "tiktok_shop")
    .eq("status", "connected")
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(200);

  if (error) {
    console.error("Cron sync-orders: no se pudieron leer las tiendas:", error);
    return NextResponse.json({ error: "No se pudieron leer las tiendas." }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;
  let saved = 0;

  for (const integration of (data ?? []) as IntegrationRow[]) {
    if (Date.now() > deadline) break;

    const result = await syncIntegrationOrders(admin, integration, { deadline });

    if (result.error) failed++;
    else synced++;

    saved += result.saved;
  }

  return NextResponse.json({ synced, failed, saved });
}
