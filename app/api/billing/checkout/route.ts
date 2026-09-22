import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getBillingContext } from "@/lib/billing/context";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";

const PAID_STATUSES = ["active", "trialing", "past_due"];

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Crea una sesión de Stripe Checkout (página de pago ALOJADA POR STRIPE). La
 * tarjeta la escribe el usuario en Stripe: Kodia nunca la ve ni la toca.
 * Body: { businessId, kind: "plan" | "pack", code }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "Solicitud inválida.");
  }

  const kind = body.kind;
  const code = typeof body.code === "string" ? body.code : "";

  if ((kind !== "plan" && kind !== "pack") || !/^[a-z0-9_]{2,40}$/.test(code)) {
    return fail(400, "Solicitud inválida.");
  }

  if (!isStripeConfigured()) {
    return fail(503, "El pago todavía no está disponible.");
  }

  const auth = await getBillingContext(body.businessId);

  if (!auth.ok) {
    return fail(auth.status, auth.error);
  }

  const { user, admin, businessId, accountId } = auth.ctx;

  // 1. Producto y precio en nuestra base de datos (fuente de lo que se le mostró al usuario)
  const table = kind === "plan" ? "plans" : "credit_packs";

  const { data: product } = await admin
    .from(table)
    .select("code, price_usd_cents, active")
    .eq("code", code)
    .maybeSingle();

  if (!product || !product.active || product.price_usd_cents <= 0) {
    return fail(400, "Este producto no está disponible para compra.");
  }

  // 2. Un plan de pago nuevo solo se contrata si no hay ya una suscripción vigente
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("plan_code, status, stripe_customer_id, stripe_subscription_id")
    .eq("account_id", accountId)
    .maybeSingle();

  if (
    kind === "plan" &&
    subscription?.stripe_subscription_id &&
    PAID_STATUSES.includes(subscription.status)
  ) {
    return fail(
      409,
      "Ya tienes una suscripción. Usa «Administrar suscripción» para cambiar de plan.",
    );
  }

  try {
    const stripe = getStripe();

    // 3. El precio de Stripe (lookup_key = código) debe coincidir con el de la base de datos
    const prices = await stripe.prices.list({ lookup_keys: [code], active: true, limit: 1 });
    const price = prices.data[0];

    const priceOk =
      price &&
      price.unit_amount === product.price_usd_cents &&
      price.currency === "usd" &&
      (kind === "plan"
        ? price.type === "recurring" && price.recurring?.interval === "month"
        : price.type === "one_time");

    if (!price || !priceOk) {
      console.error(
        `Billing: el precio de Stripe para "${code}" no existe o no coincide con la base de datos ` +
          `(esperado ${product.price_usd_cents} usd; Stripe: ${price ? `${price.unit_amount} ${price.currency} ${price.type}` : "no encontrado"}).`,
      );
      return fail(503, "Este producto todavía no está disponible para pago.");
    }

    // 4. Cliente de Stripe de la cuenta (uno por cuenta)
    let customerId = subscription?.stripe_customer_id as string | null | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: user.email ?? undefined,
          metadata: { account_id: accountId },
        },
        { idempotencyKey: `kodia-customer-${accountId}` },
      );

      customerId = customer.id;

      const { error: saveError } = await admin
        .from("subscriptions")
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("account_id", accountId);

      if (saveError) {
        console.error("Billing: no se pudo guardar el cliente de Stripe:", saveError);
        return fail(500, "No se pudo iniciar el pago. Inténtalo de nuevo.");
      }
    }

    // 5. Sesión de pago. Misma sesión = mismo dominio desde el que se llama.
    const returnUrl = `${new URL(request.url).origin}/businesses/${businessId}/billing`;
    const metadata = { account_id: accountId, business_id: businessId, kind, code };

    const session = await stripe.checkout.sessions.create(
      kind === "plan"
        ? {
            mode: "subscription",
            customer: customerId,
            client_reference_id: accountId,
            line_items: [{ price: price.id, quantity: 1 }],
            subscription_data: { metadata },
            metadata,
            success_url: `${returnUrl}?checkout=success`,
            cancel_url: `${returnUrl}?checkout=cancelled`,
          }
        : {
            mode: "payment",
            customer: customerId,
            client_reference_id: accountId,
            line_items: [{ price: price.id, quantity: 1 }],
            payment_intent_data: { metadata },
            metadata,
            success_url: `${returnUrl}?checkout=success`,
            cancel_url: `${returnUrl}?checkout=cancelled`,
          },
    );

    if (!session.url) {
      console.error("Billing: Stripe no devolvió la URL de pago");
      return fail(502, "No se pudo iniciar el pago. Inténtalo de nuevo.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error(`Billing: error de Stripe (${error.type}): ${error.message}`);
      return fail(502, "No se pudo conectar con el sistema de pagos. Inténtalo de nuevo.");
    }

    console.error("Billing: error inesperado al crear el pago:", error);
    return fail(500, "No se pudo iniciar el pago. Inténtalo de nuevo.");
  }
}
