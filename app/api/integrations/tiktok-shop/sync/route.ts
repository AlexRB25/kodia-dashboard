import { NextResponse } from "next/server";

import { getBusinessMemberContext } from "@/lib/account/context";
import { isTikTokConfigured } from "@/lib/integrations/tiktok-shop/client";
import { syncBusinessOrders } from "@/lib/integrations/tiktok-shop/sync";
import { isEncryptionConfigured } from "@/lib/security/secrets";

export const maxDuration = 60;

/** Margen para responder antes de que la función se corte. */
const TIME_BUDGET_MS = 50_000;
/** Evita que se pulse el botón sin parar: no se repite antes de este tiempo. */
const MIN_INTERVAL_MS = 30_000;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Trae los pedidos más recientes de las tiendas de TikTok Shop del negocio.
 * Cualquier miembro del negocio puede pedirlo. Body: { businessId }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "Solicitud inválida.");
  }

  if (!isTikTokConfigured() || !isEncryptionConfigured()) {
    return fail(503, "La sincronización todavía no está disponible.");
  }

  const auth = await getBusinessMemberContext(
    body.businessId,
    "La sincronización todavía no está disponible.",
  );

  if (!auth.ok) {
    return fail(auth.status, auth.error);
  }

  try {
    const results = await syncBusinessOrders(auth.ctx.admin, auth.ctx.businessId, {
      minIntervalMs: MIN_INTERVAL_MS,
      deadline: Date.now() + TIME_BUDGET_MS,
    });

    if (results.length === 0) {
      return fail(404, "No hay tiendas de TikTok Shop conectadas en este negocio.");
    }

    const failed = results.filter((result) => result.error);

    // Si todas fallaron se avisa; si solo algunas, se sigue y se cuenta lo guardado
    if (failed.length === results.length) {
      console.error("TikTok sync: falló para todas las tiendas:", failed.map((r) => r.error));
      return fail(502, "No se pudieron traer los pedidos de TikTok Shop. Inténtalo más tarde.");
    }

    return NextResponse.json({
      saved: results.reduce((sum, result) => sum + result.saved, 0),
      skipped: results.every((result) => result.skipped),
      incomplete: results.some((result) => !result.complete),
      failedShops: failed.length,
    });
  } catch (error) {
    console.error("TikTok sync: error inesperado:", error);
    return fail(500, "No se pudieron traer los pedidos. Inténtalo de nuevo.");
  }
}
