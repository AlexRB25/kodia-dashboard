"use server";

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

const { data, error } = await supabase.rpc("create_business", {
  business_name: cleanBusinessName,
  business_type: cleanBusinessType,
});

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