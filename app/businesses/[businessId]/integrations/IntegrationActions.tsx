"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import LoadingOverlay from "@/components/ui/LoadingOverlay";

/**
 * Enlace que inicia la autorización en otro sitio (TikTok). Es un <a> normal y
 * no un <Link> de Next a propósito: <Link> precargaría la ruta y crearía
 * intentos de conexión sin que nadie haya hecho clic.
 */
export function ConnectLink({ href, label }: { href: string; label: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <>
      {loading && <LoadingOverlay />}

      <a
        href={href}
        onClick={() => setLoading(true)}
        className="inline-block rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200"
      >
        {label}
      </a>
    </>
  );
}

export function DisconnectButton({
  businessId,
  integrationId,
  accountName,
}: {
  businessId: string;
  integrationId: string;
  accountName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (loading) {
      return;
    }

    const confirmed = window.confirm(
      `¿Desconectar «${accountName}»? Kodia dejará de recibir datos de esta cuenta. Podrás volver a conectarla cuando quieras.`,
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, integrationId }),
      });

      const data: { error?: string } = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "No se pudo desconectar. Inténtalo de nuevo.");
        setLoading(false);
        return;
      }

      router.refresh();
      setLoading(false);
    } catch {
      setError("No hay conexión con el servidor. Inténtalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <>
      {loading && <LoadingOverlay />}

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-xs text-gray-500 underline-offset-2 transition hover:text-red-400 hover:underline disabled:opacity-60"
      >
        Desconectar
      </button>

      {error && (
        <p role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </>
  );
}
