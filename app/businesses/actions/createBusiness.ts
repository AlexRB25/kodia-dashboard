"use server";

import { createBusinessWithAccount } from "@/lib/businesses/create";
import { createClient } from "@/lib/supabase/server";

type CreateBusinessInput = {
  businessName: string;
  businessType: string;
};

export async function createBusiness({
  businessName,
  businessType,
}: CreateBusinessInput) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "Tu sesión no es válida. Inicia sesión nuevamente.",
    };
  }

  const cleanBusinessName = businessName.trim();
  const cleanBusinessType = businessType.trim();

  if (!cleanBusinessName || !cleanBusinessType) {
    return {
      success: false,
      error: "Completa todos los campos.",
    };
  }

  // Nombre de la cuenta si es un usuario nuevo: el que dio al registrarse, o el del negocio
  const registeredName =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "";

  const result = await createBusinessWithAccount(supabase, {
    businessName: cleanBusinessName,
    businessType: cleanBusinessType,
    accountName: (registeredName || cleanBusinessName).slice(0, 100),
  });

  if (!result.success) {
    console.error("Error creating business:", result.error);

    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
