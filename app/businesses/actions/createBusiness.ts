"use server";

import { createClient } from "@/lib/supabase/server";

type CreateBusinessInput = {
  accountName: string;
  businessName: string;
  businessType: string;
};

export async function createBusiness({
  accountName,
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

  const cleanAccountName = accountName.trim();
  const cleanBusinessName = businessName.trim();
  const cleanBusinessType = businessType.trim();

  if (!cleanAccountName || !cleanBusinessName || !cleanBusinessType) {
    return {
      success: false,
      error: "Completa todos los campos.",
    };
  }

  const { data, error } = await supabase.rpc(
    "create_account_with_business",
    {
      account_name: cleanAccountName,
      business_name: cleanBusinessName,
      business_type: cleanBusinessType,
    }
  );

  if (error) {
    console.error("Error creating business:", error);

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    data,
  };
}