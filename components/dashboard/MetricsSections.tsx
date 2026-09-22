import { cache } from "react";
import Link from "next/link";
import { ArrowRight, CircleDollarSign, MessageCircle, ReceiptText, ShoppingBag } from "lucide-react";

import {
  emptyMetrics,
  loadDashboardMetrics,
  timeAgo,
  type DashboardMetrics,
} from "@/lib/dashboard/metrics";
import { lastDays, safeTimeZone } from "@/lib/dashboard/timezone";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { ChannelRow, MetricCard, SkeletonCard } from "./cards";
import SyncOrdersButton from "./SyncOrdersButton";

const providerLabels: Record<string, string> = {
  tiktok_shop: "TikTok Shop",
  mercado_libre: "Mercado Libre",
  shopify: "Shopify",
  amazon: "Amazon",
};

/**
 * Una sola carga de métricas por petición: las tarjetas, la gráfica y el
 * botón de sincronizar la comparten (React `cache`) aunque estén en secciones
 * distintas. Si algo falla devuelve ceros: el dashboard nunca se rompe por esto.
 */
const getMetrics = cache(async (businessId: string): Promise<DashboardMetrics> => {
  const supabase = await createClient();

  try {
    const { data } = await supabase
      .from("businesses")
      .select("currency, timezone")
      .eq("id", businessId)
      .maybeSingle();

    return await loadDashboardMetrics(supabase, {
      id: businessId,
      currency: (data?.currency as string | null | undefined) ?? null,
      timezone: (data?.timezone as string | null | undefined) ?? null,
    });
  } catch (error) {
    console.error("Error loading dashboard metrics:", error);
    return emptyMetrics("MXN", lastDays(new Date(), safeTimeZone(null), 7).days);
  }
});

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------

export function SummaryMetricsFallback() {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

type SummaryShow = {
  sales_summary: boolean;
  orders: boolean;
  conversations: boolean;
  average_ticket: boolean;
};

export async function SummaryMetrics({
  businessId,
  show,
}: {
  businessId: string;
  show: SummaryShow;
}) {
  const metrics = await getMetrics(businessId);
  const { currency, today, otherCurrencies } = metrics;
  const noChannels = metrics.shops === 0;

  const extra = otherCurrencies
    .map((item) => `+ ${formatMoney(item.salesCents, item.currency)}`)
    .join(" · ");

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {show.sales_summary && (
        <MetricCard
          title="Ventas hoy"
          value={formatMoney(today.salesCents, currency)}
          detail={
            noChannels
              ? "Conecta una tienda para ver tus ventas"
              : `${today.orders} ${today.orders === 1 ? "pedido" : "pedidos"} hoy${extra ? ` · ${extra}` : ""}`
          }
          icon={<CircleDollarSign size={20} />}
        />
      )}

      {show.orders && (
        <MetricCard
          title="Pedidos hoy"
          value={String(today.orders)}
          detail={noChannels ? "Sin canales conectados" : "Pedidos pagados de hoy"}
          icon={<ReceiptText size={20} />}
        />
      )}

      {show.conversations && (
        <MetricCard
          title="Conversaciones"
          value="0"
          detail="0 pendientes"
          icon={<MessageCircle size={20} />}
        />
      )}

      {show.average_ticket && (
        <MetricCard
          title="Ticket promedio"
          value={formatMoney(today.avgTicketCents, currency)}
          detail="Basado en ventas de hoy"
          icon={<ShoppingBag size={20} />}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gráfica de ventas (últimos 7 días)
// ---------------------------------------------------------------------------

export function SalesChartFallback({ wide }: { wide: boolean }) {
  return <SkeletonCard className={`min-h-[300px] ${wide ? "xl:col-span-3" : "xl:col-span-2"}`} />;
}

export async function SalesChartCard({
  businessId,
  wide,
}: {
  businessId: string;
  wide: boolean;
}) {
  const { currency, series } = await getMetrics(businessId);
  const max = Math.max(...series.map((point) => point.salesCents), 0);
  const total = series.reduce((sum, point) => sum + point.salesCents, 0);

  return (
    <div
      className={`rounded-xl border border-[#17424c] bg-[#062630] p-6 ${
        wide ? "xl:col-span-3" : "xl:col-span-2"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-white">Ventas</h2>
          <p className="mt-1 text-sm text-[#68858e]">
            {total > 0
              ? `${formatMoney(total, currency)} en los últimos 7 días`
              : "Rendimiento de ventas de los últimos 7 días."}
          </p>
        </div>

        <span className="text-xs text-[#68858e]">7 días</span>
      </div>

      {max === 0 ? (
        <div className="flex min-h-[220px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-[#13d6b5]/20 bg-[#13d6b5]/5 text-[#13d6b5]">
              <CircleDollarSign size={21} />
            </div>

            <p className="mt-4 text-sm font-medium text-[#c4d5da]">
              Aún no hay ventas para mostrar
            </p>

            <p className="mt-1 text-xs text-[#68858e]">
              Aquí aparecerá el comportamiento de tus ventas.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-8 flex h-[220px] items-end gap-3">
          {series.map((point) => {
            const height = point.salesCents > 0 ? Math.max(4, (point.salesCents / max) * 100) : 0;
            const label = new Date(`${point.day}T12:00:00Z`).toLocaleDateString("es-MX", {
              weekday: "short",
              timeZone: "UTC",
            });

            return (
              <div
                key={point.day}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                title={`${point.day}: ${formatMoney(point.salesCents, currency)} · ${point.orders} pedidos`}
              >
                <span className="text-[11px] text-[#8ca4ab]">
                  {point.salesCents > 0 ? formatMoney(point.salesCents, currency) : ""}
                </span>

                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-[#13d6b5]/80"
                    style={{ height: `${height}%` }}
                  />
                </div>

                <span className="text-xs capitalize text-[#68858e]">{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ventas por canal (hoy)
// ---------------------------------------------------------------------------

export function SalesByChannelFallback({ wide }: { wide: boolean }) {
  return <SkeletonCard className={`min-h-[300px] ${wide ? "xl:col-span-3" : ""}`} />;
}

export async function SalesByChannelCard({
  businessId,
  wide,
}: {
  businessId: string;
  wide: boolean;
}) {
  const { currency, byChannel } = await getMetrics(businessId);

  // Siempre se ven TikTok Shop y Mercado Libre; se suman los demás canales con ventas
  const providers = ["tiktok_shop", "mercado_libre"];

  for (const item of byChannel) {
    if (!providers.includes(item.provider)) providers.push(item.provider);
  }

  return (
    <div
      className={`rounded-xl border border-[#17424c] bg-[#062630] p-6 ${
        wide ? "xl:col-span-3" : ""
      }`}
    >
      <h2 className="font-semibold text-white">Ventas por canal</h2>

      <p className="mt-1 text-sm text-[#68858e]">Distribución de tus ventas de hoy.</p>

      <div className="mt-6 space-y-3">
        {providers.map((provider) => {
          const sales = byChannel.find((item) => item.provider === provider)?.salesCents ?? 0;

          return (
            <ChannelRow
              key={provider}
              name={providerLabels[provider] ?? provider}
              value={formatMoney(sales, currency)}
            />
          );
        })}
      </div>

      <Link
        href={`/businesses/${businessId}/integrations`}
        className="mt-6 flex items-center justify-between border-t border-[#17424c] pt-4 text-sm text-[#8fb3bc] transition hover:text-[#13d6b5]"
      >
        Administrar canales
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Botón de sincronizar (solo si hay tiendas conectadas)
// ---------------------------------------------------------------------------

export async function SyncStatus({ businessId }: { businessId: string }) {
  const metrics = await getMetrics(businessId);

  if (metrics.shops === 0) {
    return null;
  }

  return (
    <SyncOrdersButton
      businessId={businessId}
      statusLabel={
        metrics.lastSyncedAt ? `Actualizado ${timeAgo(metrics.lastSyncedAt)}` : "Aún sin sincronizar"
      }
      hasIssue={Boolean(metrics.lastError)}
    />
  );
}
