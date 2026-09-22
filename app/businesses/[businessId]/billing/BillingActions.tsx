"use client";

import { useState } from "react";

import LoadingOverlay from "@/components/ui/LoadingOverlay";

type RedirectButtonProps = {
  endpoint: string;
  body: Record<string, string>;
  label: string;
  className: string;
};

/**
 * Pide una URL al servidor (Stripe Checkout o el portal, ambos alojados por
 * Stripe) y redirige. La tarjeta se escribe en Stripe: esta app nunca la ve.
 */
function RedirectButton({ endpoint, body, label, className }: RedirectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data: { url?: string; error?: string } = await response.json().catch(() => ({}));

      if (!response.ok || !data.url) {
        setError(data.error ?? "No se pudo iniciar el pago. Inténtalo de nuevo.");
        setLoading(false);
        return;
      }

      // Se deja el overlay puesto: la página se descarga al redirigir
      window.location.assign(data.url);
    } catch {
      setError("No hay conexión con el servidor. Inténtalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <>
      {loading && <LoadingOverlay />}

      <button type="button" onClick={handleClick} disabled={loading} className={className}>
        {label}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-xs leading-5 text-red-400">
          {error}
        </p>
      )}
    </>
  );
}

const primaryClass =
  "mt-6 rounded-lg bg-[#08b89d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0cc9ab] disabled:cursor-not-allowed disabled:opacity-60";

const packClass =
  "mt-5 rounded-lg bg-[#08b89d] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0cc9ab] disabled:cursor-not-allowed disabled:opacity-60";

const secondaryClass =
  "mt-6 rounded-lg border border-[#24606b] px-4 py-2.5 text-sm font-semibold text-[#b6cbd1] transition hover:border-[#13d6b5]/40 hover:text-[#13d6b5] disabled:cursor-not-allowed disabled:opacity-60";

export function PlanCheckoutButton({
  businessId,
  code,
  label,
}: {
  businessId: string;
  code: string;
  label: string;
}) {
  return (
    <RedirectButton
      endpoint="/api/billing/checkout"
      body={{ businessId, kind: "plan", code }}
      label={label}
      className={primaryClass}
    />
  );
}

export function PackCheckoutButton({
  businessId,
  code,
  label,
}: {
  businessId: string;
  code: string;
  label: string;
}) {
  return (
    <RedirectButton
      endpoint="/api/billing/checkout"
      body={{ businessId, kind: "pack", code }}
      label={label}
      className={packClass}
    />
  );
}

export function ManageSubscriptionButton({
  businessId,
  label = "Administrar suscripción",
  variant = "secondary",
}: {
  businessId: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <RedirectButton
      endpoint="/api/billing/portal"
      body={{ businessId }}
      label={label}
      className={variant === "primary" ? primaryClass : secondaryClass}
    />
  );
}
