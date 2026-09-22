import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptSecret, encryptSecret } from "../../security/secrets";
import { refreshAccessToken } from "./client";

type Admin = SupabaseClient;

/** Se renueva un poco antes de que venza para no fallar a mitad de una llamada. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Devuelve un access token válido de la integración, renovándolo si está por
 * vencer. TikTok rota el refresh token en cada renovación, así que el nuevo se
 * guarda siempre. Si ya no se puede renovar, la integración pasa a "error" para
 * que el usuario la reconecte.
 *
 * Aviso: dos renovaciones simultáneas de la misma integración pueden invalidarse
 * entre sí. Cuando haya sincronización en segundo plano, ejecútala de a una por
 * integración.
 */
export async function getAccessToken(admin: Admin, integrationId: string): Promise<string> {
  const { data: secret, error } = await admin
    .from("integration_secrets")
    .select("access_token_enc, refresh_token_enc, access_token_expires_at, refresh_token_expires_at")
    .eq("integration_id", integrationId)
    .maybeSingle();

  if (error || !secret) {
    throw new Error(`La integración ${integrationId} no tiene tokens guardados.`);
  }

  const expiresAt = secret.access_token_expires_at
    ? new Date(secret.access_token_expires_at as string).getTime()
    : null;

  if (expiresAt === null || expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return decryptSecret(secret.access_token_enc as string);
  }

  const refreshExpired =
    secret.refresh_token_expires_at &&
    new Date(secret.refresh_token_expires_at as string).getTime() <= Date.now();

  if (!secret.refresh_token_enc || refreshExpired) {
    await markNeedsReconnect(admin, integrationId, "La autorización de TikTok venció. Vuelve a conectar la tienda.");
    throw new Error(`La integración ${integrationId} necesita reconectarse.`);
  }

  try {
    const tokens = await refreshAccessToken(decryptSecret(secret.refresh_token_enc as string));

    const { error: saveError } = await admin
      .from("integration_secrets")
      .update({
        access_token_enc: encryptSecret(tokens.accessToken),
        refresh_token_enc: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
        access_token_expires_at: tokens.accessTokenExpiresAt?.toISOString() ?? null,
        refresh_token_expires_at: tokens.refreshTokenExpiresAt?.toISOString() ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("integration_id", integrationId);

    if (saveError) {
      throw new Error(`No se pudieron guardar los tokens renovados: ${saveError.message}`);
    }

    return tokens.accessToken;
  } catch (refreshError) {
    await markNeedsReconnect(
      admin,
      integrationId,
      "No se pudo renovar la autorización de TikTok. Vuelve a conectar la tienda.",
    );
    throw refreshError;
  }
}

async function markNeedsReconnect(admin: Admin, integrationId: string, message: string) {
  await admin
    .from("business_integrations")
    .update({ status: "error", last_error: message, updated_at: new Date().toISOString() })
    .eq("id", integrationId);
}
