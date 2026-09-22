import type { SupabaseClient } from "@supabase/supabase-js";

import { encryptSecret } from "../../security/secrets";
import type { TikTokShop, TikTokTokens } from "./client";

type Admin = SupabaseClient;

export type SkippedShop = {
  name: string;
  reason: "elsewhere" | "store_limit";
};

export type ConnectResult = {
  connected: string[];
  skipped: SkippedShop[];
};

const PROVIDER = "tiktok_shop";

async function saveSecrets(admin: Admin, integrationId: string, tokens: TikTokTokens) {
  const { error } = await admin.from("integration_secrets").upsert(
    {
      integration_id: integrationId,
      access_token_enc: encryptSecret(tokens.accessToken),
      refresh_token_enc: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
      access_token_expires_at: tokens.accessTokenExpiresAt?.toISOString() ?? null,
      refresh_token_expires_at: tokens.refreshTokenExpiresAt?.toISOString() ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "integration_id" },
  );

  if (error) {
    throw new Error(`No se pudieron guardar los tokens: ${error.message}`);
  }
}

function isStoreLimit(error: { message?: string } | null): boolean {
  return Boolean(error?.message?.includes("STORE_LIMIT_REACHED"));
}

/**
 * Guarda como integraciones del negocio las tiendas que el vendedor autorizó.
 *  - Una tienda ya conectada a OTRO negocio se omite (una tienda = un negocio).
 *  - Si el plan no permite más tiendas, el trigger de la base de datos rechaza
 *    la alta y aquí se informa como omitida por límite.
 * Los tokens se guardan cifrados en integration_secrets.
 */
export async function connectAuthorizedShops(params: {
  admin: Admin;
  businessId: string;
  userId: string;
  tokens: TikTokTokens;
  shops: TikTokShop[];
}): Promise<ConnectResult> {
  const { admin, businessId, userId, tokens, shops } = params;
  const result: ConnectResult = { connected: [], skipped: [] };

  for (const shop of shops) {
    const { data: existing, error: lookupError } = await admin
      .from("business_integrations")
      .select("id, business_id")
      .eq("provider", PROVIDER)
      .eq("external_account_id", shop.id)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`No se pudo consultar la tienda ${shop.id}: ${lookupError.message}`);
    }

    if (existing && existing.business_id !== businessId) {
      result.skipped.push({ name: shop.name, reason: "elsewhere" });
      continue;
    }

    const fields = {
      status: "connected",
      external_account_name: shop.name,
      config: {
        shop_cipher: shop.cipher,
        region: shop.region,
        shop_code: shop.code,
        seller_type: shop.sellerType,
        seller_name: tokens.sellerName,
      },
      connected_by: userId,
      last_error: null,
      updated_at: new Date().toISOString(),
    };

    let integrationId: string;

    if (existing) {
      const { error } = await admin
        .from("business_integrations")
        .update(fields)
        .eq("id", existing.id);

      if (error) {
        if (isStoreLimit(error)) {
          result.skipped.push({ name: shop.name, reason: "store_limit" });
          continue;
        }

        throw new Error(`No se pudo actualizar la tienda ${shop.id}: ${error.message}`);
      }

      integrationId = existing.id as string;
    } else {
      const { data: inserted, error } = await admin
        .from("business_integrations")
        .insert({
          business_id: businessId,
          provider: PROVIDER,
          external_account_id: shop.id,
          ...fields,
        })
        .select("id")
        .single();

      if (error || !inserted) {
        if (isStoreLimit(error)) {
          result.skipped.push({ name: shop.name, reason: "store_limit" });
          continue;
        }

        // Carrera: otra conexión creó esta tienda un instante antes
        if ((error as { code?: string } | null)?.code === "23505") {
          result.skipped.push({ name: shop.name, reason: "elsewhere" });
          continue;
        }

        throw new Error(`No se pudo guardar la tienda ${shop.id}: ${error?.message ?? "sin detalle"}`);
      }

      integrationId = inserted.id as string;
    }

    await saveSecrets(admin, integrationId, tokens);
    result.connected.push(shop.name);
  }

  return result;
}
