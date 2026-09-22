/** Precio en USD a partir de centavos enteros. 1900 -> "$19"; 550 -> "$5.50". */
export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

export function formatNumber(value: number): string {
  return value.toLocaleString("es-MX");
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const subscriptionStatusLabels: Record<string, string> = {
  active: "Activa",
  trialing: "En prueba",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
  incomplete: "Incompleta",
};

/** Tiendas de marketplace: las únicas que cuentan para el límite del plan. */
export const STORE_PROVIDERS = [
  "tiktok_shop",
  "mercado_libre",
  "shopify",
  "amazon",
];
