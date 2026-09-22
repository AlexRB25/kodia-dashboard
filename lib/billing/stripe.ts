import Stripe from "stripe";

let client: Stripe | null = null;

/** Cliente de Stripe con la versión de API que fija el SDK instalado. Solo servidor. */
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY.");
  }

  client ??= new Stripe(secretKey);

  return client;
}

/** ¿Está configurado el cobro con Stripe en este entorno? */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
