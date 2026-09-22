import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service role key: se salta la RLS. Úsalo SOLO en código de
 * servidor y solo después de haber verificado con la sesión del usuario que
 * tiene derecho a lo que se va a escribir. Nunca lo importes desde un
 * componente de cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
