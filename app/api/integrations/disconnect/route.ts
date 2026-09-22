import { NextResponse } from "next/server";

import { getAccountAdminContext } from "@/lib/account/context";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Desconecta una integración: borra sus tokens y la marca como desconectada.
 * La fila se conserva (el historial de la tienda no se pierde) y deja de contar
 * para el límite de tiendas del plan. Body: { businessId, integrationId }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "Solicitud inválida.");
  }

  const integrationId = typeof body.integrationId === "string" ? body.integrationId : "";

  if (!UUID_PATTERN.test(integrationId)) {
    return fail(400, "Solicitud inválida.");
  }

  const auth = await getAccountAdminContext(body.businessId, {
    unavailable: "No se pudo completar la acción en este momento.",
    denied: "Solo el dueño o un administrador de la cuenta puede desconectar integraciones.",
  });

  if (!auth.ok) {
    return fail(auth.status, auth.error);
  }

  const { admin, businessId } = auth.ctx;

  // La integración debe ser de ESTE negocio
  const { data: integration } = await admin
    .from("business_integrations")
    .select("id")
    .eq("id", integrationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!integration) {
    return fail(404, "No se encontró la integración.");
  }

  const { error: secretsError } = await admin
    .from("integration_secrets")
    .delete()
    .eq("integration_id", integrationId);

  if (secretsError) {
    console.error("Disconnect: no se pudieron borrar los tokens:", secretsError);
    return fail(500, "No se pudo desconectar. Inténtalo de nuevo.");
  }

  const { error } = await admin
    .from("business_integrations")
    .update({ status: "disconnected", last_error: null, updated_at: new Date().toISOString() })
    .eq("id", integrationId);

  if (error) {
    console.error("Disconnect: no se pudo actualizar la integración:", error);
    return fail(500, "No se pudo desconectar. Inténtalo de nuevo.");
  }

  return NextResponse.json({ ok: true });
}
