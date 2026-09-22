"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

type SyncOrdersButtonProps = {
  businessId: string;
  /** "Actualizado hace 5 min" o "Sin sincronizar". */
  statusLabel: string;
  /** La última sincronización terminó con un aviso o un error. */
  hasIssue: boolean;
};

export default function SyncOrdersButton({
  businessId,
  statusLabel,
  hasIssue,
}: SyncOrdersButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/integrations/tiktok-shop/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });

      const data: {
        saved?: number;
        skipped?: boolean;
        incomplete?: boolean;
        error?: string;
      } = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error ?? "No se pudieron traer los pedidos.");
        return;
      }

      setMessage(
        data.skipped
          ? "Ya estaba al día."
          : data.incomplete
            ? "Se trajeron parte de los pedidos; se completará en la próxima actualización."
            : `Listo: ${data.saved ?? 0} pedidos revisados.`,
      );

      router.refresh();
    } catch {
      setMessage("No hay conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title={statusLabel}
        className="inline-flex items-center gap-2 rounded-lg border border-[#17424c] bg-[#061f29] px-4 py-2 text-sm font-medium text-[#b6cbd1] transition hover:border-[#13d6b5]/40 hover:text-[#13d6b5] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        {loading ? "Sincronizando…" : "Sincronizar pedidos"}
      </button>

      <p className={`text-xs ${hasIssue ? "text-amber-400" : "text-[#68858e]"}`}>
        {message ?? statusLabel}
      </p>
    </div>
  );
}
