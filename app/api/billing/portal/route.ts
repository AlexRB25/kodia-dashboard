import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getBillingContext } from "@/lib/billing/context";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Abre el portal de cliente de Stripe (alojado por Stripe): cambiar de plan,
 * actualizar la tarjeta, ver facturas o cancelar. Body: { businessId }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "Solicitud inválida.");
  }

  if (!isStripeConfigured()) {
    return fail(503, "El pago todavía no está disponible.");
  }

  const auth = await getBillingContext(body.businessId);

  if (!auth.ok) {
    return fail(auth.status, auth.error);
  }

  const { admin, businessId, accountId } = auth.ctx;

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("account_id", accountId)
    .maybeSingle();

  const customerId = subscription?.stripe_customer_id as string | null | undefined;

  if (!customerId) {
    return fail(400, "Todavía no tienes datos de pago. Contrata un plan o compra créditos primero.");
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${new URL(request.url).origin}/businesses/${businessId}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      // Lo más común: el portal no está configurado en el dashboard de Stripe
      console.error(`Billing: error del portal de Stripe (${error.type}): ${error.message}`);
      return fail(502, "No se pudo abrir el portal de suscripción. Inténtalo más tarde.");
    }

    console.error("Billing: error inesperado al abrir el portal:", error);
    return fail(500, "No se pudo abrir el portal de suscripción.");
  }
}
