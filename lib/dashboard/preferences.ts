import type { SupabaseClient } from "@supabase/supabase-js";

import {
  resolveWidgetState,
  type DashboardWidgetState,
} from "@/lib/dashboard/widgets";

export async function getDashboardWidgetState(
  supabase: SupabaseClient,
  businessId: string,
  userId: string,
): Promise<DashboardWidgetState> {
  const { data, error } = await supabase
    .from("dashboard_preferences")
    .select("widgets")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error loading dashboard preferences:", error);
  }

  return resolveWidgetState(data?.widgets);
}
