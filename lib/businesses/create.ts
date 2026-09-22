import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mensaje que lanza `create_business` cuando el usuario todavía no pertenece a
 * ninguna cuenta (le pasa a todo usuario recién registrado).
 */
const NO_ACCOUNT_ERROR = "No active account found";

export type CreateBusinessParams = {
  businessName: string;
  businessType: string;
  /** Nombre de la cuenta si hay que crearla (solo en el primer negocio). */
  accountName: string;
};

export type CreateBusinessOutcome =
  | { success: true; data: unknown; createdAccount: boolean }
  | { success: false; error: string };

/**
 * Crea un negocio. Si el usuario es nuevo y aún no tiene cuenta, la crea junto
 * con su primer negocio (`create_account_with_business`): eso también le da la
 * suscripción Free y los créditos de bienvenida, porque los crea un trigger al
 * insertar la cuenta. Con una cuenta existente solo crea el negocio.
 */
export async function createBusinessWithAccount(
  supabase: SupabaseClient,
  params: CreateBusinessParams,
): Promise<CreateBusinessOutcome> {
  const { businessName, businessType, accountName } = params;

  const first = await supabase.rpc("create_business", {
    business_name: businessName,
    business_type: businessType,
  });

  if (!first.error) {
    return { success: true, data: first.data, createdAccount: false };
  }

  if (!first.error.message.includes(NO_ACCOUNT_ERROR)) {
    return { success: false, error: first.error.message };
  }

  // Usuario nuevo: su cuenta nace junto con su primer negocio
  const second = await supabase.rpc("create_account_with_business", {
    account_name: accountName,
    business_name: businessName,
    business_type: businessType,
  });

  if (second.error) {
    return { success: false, error: second.error.message };
  }

  return { success: true, data: second.data, createdAccount: true };
}
