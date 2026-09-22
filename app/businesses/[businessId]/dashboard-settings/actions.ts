"use server";

import { revalidatePath } from "next/cache";

import { resolveWidgetState } from "@/lib/dashboard/widgets";
import { createClient } from "@/lib/supabase/server";

export async function saveDashboardWidgets(
  businessId: string,
  widgets: Record<string, boolean>,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Tu sesión no es válida. Inicia sesión nuevamente.",
    };
  }

  // La RLS de dashboard_preferences exige que el usuario sea miembro activo
  // del negocio, tanto para insertar como para actualizar.
  const { error } = await supabase.from("dashboard_preferences").upsert(
    {
      business_id: businessId,
      user_id: user.id,
      widgets: resolveWidgetState(widgets),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id,user_id" },
  );

  if (error) {
    console.error("Error saving dashboard preferences:", error);

    return {
      success: false,
      error: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
    };
  }

  revalidatePath(`/businesses/${businessId}`);
  revalidatePath(`/businesses/${businessId}/dashboard-settings`);

  return { success: true };
}
