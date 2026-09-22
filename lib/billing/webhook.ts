import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Procesa los eventos de Stripe. Es la ÚNICA fuente de verdad para entregar
 * planes y créditos: la página de retorno del pago no entrega nada.
 *
 * Reglas
 *  - Del evento solo se usa su id: el objeto se vuelve a pedir a Stripe con el
 *    SDK, para no depender de la versión de API del endpoint del webhook.
 *  - Todo es idempotente (claves `stripe_checkout:` / `stripe_invoice:` en el
 *    libro de créditos), así que reintentos y eventos repetidos no duplican nada.
 *  - Si algo falla se lanza un error: la ruta responde 500 y Stripe reintenta.
 *  - El plan sale del `lookup_key` del precio, que es igual al código del plan.
 */

type Admin = SupabaseClient;

type OurStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";

/**
 * Estado de Stripe -> estado de Kodia. `unpaid` y `paused` se tratan como
 * cancelados: sin pago vigente no se conserva el plan de pago.
 */
export function mapSubscriptionStatus(status: string): OurStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "incomplete":
      return "incomplete";
    default:
      return "canceled";
  }
}

function toIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function accountFromCustomer(admin: Admin, customerId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("account_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo buscar la cuenta del cliente ${customerId}: ${error.message}`);
  }

  return (data?.account_id as string | undefined) ?? null;
}

async function revertToFree(admin: Admin, accountId: string, subscriptionId: string) {
  // Solo si es la suscripción vigente: una suscripción vieja que se borra
  // después de contratar otra no debe tumbar el plan nuevo.
  const { error } = await admin
    .from("subscriptions")
    .update({
      plan_code: "free",
      status: "active",
      stripe_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", accountId)
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    throw new Error(`No se pudo volver a Free la cuenta ${accountId}: ${error.message}`);
  }
}

type SyncResult = {
  accountId: string;
  planCode: string | null;
  monthlyCredits: number;
  periodEnd: number | null;
  reverted: boolean;
};

/** Refleja una suscripción de Stripe en la tabla `subscriptions`. */
async function syncSubscription(admin: Admin, sub: Stripe.Subscription): Promise<SyncResult | null> {
  const customerId = idOf(sub.customer);
  const accountId = customerId ? await accountFromCustomer(admin, customerId) : null;

  if (!accountId) {
    console.warn(`Stripe: la suscripción ${sub.id} es de un cliente que no conocemos; se ignora.`);
    return null;
  }

  const status = mapSubscriptionStatus(sub.status);

  if (status === "canceled") {
    await revertToFree(admin, accountId, sub.id);
    return { accountId, planCode: null, monthlyCredits: 0, periodEnd: null, reverted: true };
  }

  const item = sub.items.data[0];
  const lookupKey = item?.price.lookup_key ?? null;

  let plan: { code: string; monthly_credits: number } | null = null;

  if (lookupKey) {
    const { data, error } = await admin
      .from("plans")
      .select("code, monthly_credits")
      .eq("code", lookupKey)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo leer el plan ${lookupKey}: ${error.message}`);
    }

    plan = (data as { code: string; monthly_credits: number } | null) ?? null;
  }

  if (!plan) {
    // Un precio sin plan asociado no debe cambiar el plan de nadie
    throw new Error(
      `La suscripción ${sub.id} usa un precio sin plan de Kodia (lookup_key=${lookupKey ?? "ninguno"}).`,
    );
  }

  const { error } = await admin
    .from("subscriptions")
    .update({
      plan_code: plan.code,
      status,
      stripe_subscription_id: sub.id,
      current_period_start: item ? toIso(item.current_period_start) : null,
      current_period_end: item ? toIso(item.current_period_end) : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", accountId);

  if (error) {
    throw new Error(`No se pudo actualizar la suscripción de la cuenta ${accountId}: ${error.message}`);
  }

  return {
    accountId,
    planCode: plan.code,
    monthlyCredits: plan.monthly_credits,
    periodEnd: item ? item.current_period_end : null,
    reverted: false,
  };
}

/** Compra única de un paquete de créditos. */
async function handleCheckoutSession(stripe: Stripe, admin: Admin, sessionId: string): Promise<string> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  // Las suscripciones se entregan con customer.subscription.* e invoice.paid
  if (session.mode !== "payment") {
    return `ignorado: sesión ${session.id} no es un pago único`;
  }

  // Pagos diferidos: llegará checkout.session.async_payment_succeeded
  if (session.payment_status !== "paid") {
    return `ignorado: sesión ${session.id} aún no está pagada (${session.payment_status})`;
  }

  const kind = session.metadata?.kind;
  const code = session.metadata?.code;
  const accountId = session.metadata?.account_id;

  if (kind !== "pack" || !code || !accountId) {
    return `ignorado: sesión ${session.id} no es una compra de créditos`;
  }

  // El cliente de Stripe debe pertenecer a esa cuenta: la metadata sola no basta
  const customerId = idOf(session.customer);
  const owner = customerId ? await accountFromCustomer(admin, customerId) : null;

  if (!owner || owner !== accountId) {
    throw new Error(
      `La sesión ${session.id} dice cuenta ${accountId} pero su cliente pertenece a ${owner ?? "nadie"}.`,
    );
  }

  const { data: pack, error: packError } = await admin
    .from("credit_packs")
    .select("credits")
    .eq("code", code)
    .maybeSingle();

  if (packError || !pack) {
    throw new Error(`No existe el paquete de créditos ${code}.`);
  }

  const credits = pack.credits as number;

  const { error } = await admin.rpc("add_permanent_credits", {
    p_account_id: accountId,
    p_amount: credits,
    p_kind: "purchase",
    p_idempotency_key: `stripe_checkout:${session.id}`,
    p_reason: `Compra de ${credits} créditos`,
    p_metadata: {
      checkout_session: session.id,
      payment_intent: idOf(session.payment_intent),
      pack: code,
      amount_total: session.amount_total,
      currency: session.currency,
    },
  });

  if (error) {
    throw new Error(`No se pudieron entregar los créditos de la sesión ${session.id}: ${error.message}`);
  }

  return `créditos entregados: ${credits} a la cuenta ${accountId}`;
}

/** Una factura de suscripción pagada entrega los créditos del periodo. */
async function handleInvoicePaid(stripe: Stripe, admin: Admin, invoiceId: string): Promise<string> {
  const invoice = await stripe.invoices.retrieve(invoiceId);
  const reason = invoice.billing_reason;

  const grants =
    reason === "subscription_create" ||
    reason === "subscription_cycle" ||
    // Mejora de plan a mitad de periodo: solo si se cobró algo
    (reason === "subscription_update" && invoice.amount_paid > 0);

  if (!grants) {
    return `ignorado: factura ${invoice.id} (${reason ?? "sin motivo"}) no entrega créditos`;
  }

  const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);

  if (!subscriptionId) {
    return `ignorado: factura ${invoice.id} no pertenece a una suscripción`;
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const synced = await syncSubscription(admin, sub);

  if (!synced || synced.reverted || !synced.planCode) {
    return `ignorado: la suscripción ${subscriptionId} no está vigente`;
  }

  if (synced.monthlyCredits <= 0 || synced.periodEnd === null) {
    return `factura ${invoice.id}: el plan ${synced.planCode} no incluye créditos mensuales`;
  }

  const { error } = await admin.rpc("grant_plan_credits", {
    p_account_id: synced.accountId,
    p_amount: synced.monthlyCredits,
    p_expires_at: toIso(synced.periodEnd),
    p_idempotency_key: `stripe_invoice:${invoice.id}`,
    p_metadata: {
      invoice: invoice.id,
      subscription: subscriptionId,
      plan: synced.planCode,
      billing_reason: reason,
    },
  });

  if (error) {
    throw new Error(`No se pudieron entregar los créditos de la factura ${invoice.id}: ${error.message}`);
  }

  return `créditos del plan ${synced.planCode} entregados a la cuenta ${synced.accountId}`;
}

/** Punto de entrada: devuelve una descripción corta de lo que hizo (para logs). */
export async function processStripeEvent(
  stripe: Stripe,
  admin: Admin,
  event: Stripe.Event,
): Promise<string> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return handleCheckoutSession(stripe, admin, event.data.object.id);

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = await stripe.subscriptions.retrieve(event.data.object.id);
      const synced = await syncSubscription(admin, sub);

      return synced
        ? `suscripción ${sub.id} sincronizada (${synced.reverted ? "vuelta a Free" : synced.planCode})`
        : `ignorado: suscripción ${sub.id} de un cliente desconocido`;
    }

    case "invoice.paid":
      return handleInvoicePaid(stripe, admin, event.data.object.id ?? "");

    default:
      return `ignorado: ${event.type}`;
  }
}
