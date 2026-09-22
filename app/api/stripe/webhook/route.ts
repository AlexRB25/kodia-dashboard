import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/billing/stripe";
import { processStripeEvent } from "@/lib/billing/webhook";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Webhook de Stripe. Configúralo en Stripe → Developers → Webhooks apuntando a
 * https://TU-DOMINIO/api/stripe/webhook con estos eventos:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   customer.subscription.created, customer.subscription.updated,
 *   customer.subscription.deleted, invoice.paid
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Stripe webhook: faltan STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: "Webhook no configurado." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Falta la firma." }, { status: 400 });
  }

  // La firma se calcula sobre el cuerpo EXACTO: no se puede parsear antes
  const payload = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook: firma inválida:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotencia: si ya lo procesamos con éxito, se responde 200 sin repetir
  const { data: inserted } = await admin
    .from("stripe_events")
    .upsert({ id: event.id, type: event.type }, { onConflict: "id", ignoreDuplicates: true })
    .select("id");

  if (!inserted || inserted.length === 0) {
    const { data: existing } = await admin
      .from("stripe_events")
      .select("processed_at")
      .eq("id", event.id)
      .maybeSingle();

    if (existing?.processed_at) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Existe pero no se completó (falló antes): se reintenta
  }

  try {
    const result = await processStripeEvent(stripe, admin, event);

    await admin
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("id", event.id);

    console.log(`Stripe webhook ${event.type} (${event.id}): ${result}`);

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error(`Stripe webhook ${event.type} (${event.id}) falló:`, message);

    await admin
      .from("stripe_events")
      .update({ error: message.slice(0, 1000) })
      .eq("id", event.id);

    // 500: Stripe reintenta con espera creciente
    return NextResponse.json({ error: "No se pudo procesar el evento." }, { status: 500 });
  }
}
