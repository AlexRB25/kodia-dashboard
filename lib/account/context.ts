import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AccountContext = {
  user: User;
  admin: SupabaseClient;
  businessId: string;
  accountId: string;
};

export type AccountContextResult =
  | { ok: true; ctx: AccountContext }
  | { ok: false; status: number; error: string };

type Messages = {
  /** Cuando el servidor no tiene la service role configurada. */
  unavailable: string;
  /** Cuando el usuario no es dueño ni administrador de la cuenta. */
  denied: string;
};

/**
 * Igual que getAccountAdminContext pero sin exigir ser dueño o administrador de
 * la cuenta: basta con ser miembro activo del negocio. Para acciones seguras que
 * cualquier colaborador puede hacer (p. ej. sincronizar pedidos).
 */
export async function getBusinessMemberContext(
  businessId: unknown,
  unavailable: string,
): Promise<AccountContextResult> {
  return resolveContext(businessId, { unavailable, denied: "" }, false);
}

/**
 * Comprueba, con la sesión del usuario, que puede administrar la cuenta de este
 * negocio: debe estar logueado, ser miembro del negocio y ser dueño o
 * administrador de la CUENTA. Se usa para pagos y para conectar integraciones.
 */
export async function getAccountAdminContext(
  businessId: unknown,
  messages: Messages,
): Promise<AccountContextResult> {
  return resolveContext(businessId, messages, true);
}

async function resolveContext(
  businessId: unknown,
  messages: Messages,
  requireAccountAdmin: boolean,
): Promise<AccountContextResult> {
  if (typeof businessId !== "string" || !UUID_PATTERN.test(businessId)) {
    return { ok: false, status: 400, error: "Solicitud inválida." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Account context: falta SUPABASE_SERVICE_ROLE_KEY");
    return { ok: false, status: 503, error: messages.unavailable };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Tu sesión no es válida. Inicia sesión nuevamente." };
  }

  const [{ data: membership }, { data: business }] = await Promise.all([
    supabase
      .from("business_members")
      .select("business_id")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase.from("businesses").select("account_id").eq("id", businessId).maybeSingle(),
  ]);

  if (!membership || !business) {
    return { ok: false, status: 403, error: "No tienes acceso a este negocio." };
  }

  const accountId = business.account_id as string;
  const admin = createAdminClient();

  if (!requireAccountAdmin) {
    return { ok: true, ctx: { user, admin, businessId, accountId } };
  }

  // El rol en la cuenta se lee con la service role: no depende de los GRANT de account_members
  const { data: accountMember } = await admin
    .from("account_members")
    .select("role, status")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  const canManage =
    accountMember?.status === "active" &&
    (accountMember.role === "owner" || accountMember.role === "admin");

  if (!canManage) {
    return { ok: false, status: 403, error: messages.denied };
  }

  return { ok: true, ctx: { user, admin, businessId, accountId } };
}
