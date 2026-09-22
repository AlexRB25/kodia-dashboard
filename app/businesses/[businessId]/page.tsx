import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, MessageCircle, ShoppingBag } from "lucide-react";

import PlanPill from "@/components/billing/PlanPill";
import { ChannelRow } from "@/components/dashboard/cards";
import {
  SalesByChannelCard,
  SalesByChannelFallback,
  SalesChartCard,
  SalesChartFallback,
  SummaryMetrics,
  SummaryMetricsFallback,
  SyncStatus,
} from "@/components/dashboard/MetricsSections";
import { getDashboardWidgetState } from "@/lib/dashboard/preferences";
import { createClient } from "@/lib/supabase/server";

type BusinessPageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

const businessTypeLabels: Record<string, string> = {
  restaurant: "Restaurante",
  retail: "Tienda",
  ecommerce: "E-commerce",
  services: "Servicios",
  hybrid: "Híbrido",
  other: "Otro",
};

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { businessId } = await params;
  const supabase = await createClient();

  // 1. Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Membresía, negocio y widgets visibles: consultas independientes,
  //    se lanzan en paralelo para no sumar la latencia de cada una.
  const [
    { data: membership, error: membershipError },
    { data: business, error: businessError },
    widgets,
  ] = await Promise.all([
    supabase
      .from("business_members")
      .select("business_id")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("businesses")
      .select("id, account_id, name, business_type, status")
      .eq("id", businessId)
      .maybeSingle(),
    getDashboardWidgetState(supabase, businessId, user.id),
  ]);

  if (membershipError) {
    console.error("Error checking membership:", membershipError);
  }

  // 3. El usuario debe pertenecer al negocio
  if (!membership) {
    notFound();
  }

  if (businessError) {
    console.error("Error loading business:", businessError);
  }

  if (!business) {
    notFound();
  }

  const businessType =
    businessTypeLabels[business.business_type] ?? business.business_type;

  const showSummary =
    widgets.sales_summary ||
    widgets.orders ||
    widgets.conversations ||
    widgets.average_ticket;
  const showActivity = widgets.sales_chart || widgets.sales_by_channel;
  const showAttention = widgets.conversations || widgets.out_of_stock;
  const hasVisibleWidgets = showSummary || showActivity || showAttention;

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Encabezado */}
        <Link
          href="/businesses"
          className="inline-flex items-center gap-2 text-sm text-[#7ea5af] transition hover:text-[#13d6b5]"
        >
          ← Mis negocios
        </Link>

        <header className="mt-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#13d6b5]">
                <ShoppingBag size={16} />
                {businessType}
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
                {business.name}
              </h1>

              <p className="mt-3 text-sm text-[#7ea5af]">
                Consulta rápidamente el estado y actividad de tu negocio.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Suspense fallback={null}>
                <SyncStatus businessId={businessId} />
              </Suspense>

              <Suspense fallback={null}>
                <PlanPill businessId={businessId} accountId={business.account_id} />
              </Suspense>

              <Link
                href={`/businesses/${businessId}/dashboard-settings`}
                className="rounded-lg border border-[#17424c] bg-[#061f29] px-4 py-2 text-sm font-medium text-[#b6cbd1] transition hover:border-[#13d6b5]/40 hover:text-[#13d6b5]"
              >
                Personalizar dashboard
              </Link>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#13d6b5]/25 bg-[#13d6b5]/5 px-3 py-1.5 text-xs font-medium text-[#13d6b5]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#13d6b5]" />
                {business.status === "active" ? "Activo" : business.status}
              </span>

              <button
                type="button"
                className="rounded-lg border border-[#17424c] bg-[#061f29] px-4 py-2 text-sm text-[#b6cbd1] transition hover:border-[#24606b] hover:text-white"
              >
                Hoy
              </button>
            </div>
          </div>
        </header>

        <div className="my-8 border-t border-[#17424c]" />

        {!hasVisibleWidgets && (
          <div className="rounded-xl border border-dashed border-[#17424c] bg-[#062630] px-6 py-14 text-center">
            <p className="text-sm font-medium text-[#c4d5da]">
              Tu dashboard no tiene widgets visibles
            </p>

            <p className="mt-1 text-xs text-[#68858e]">
              Activa los que necesites desde la configuración.
            </p>

            <Link
              href={`/businesses/${businessId}/dashboard-settings`}
              className="mt-5 inline-flex rounded-lg bg-[#08b89d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0cc9ab]"
            >
              Personalizar dashboard
            </Link>
          </div>
        )}

        {/* Resumen */}
        {showSummary && (
          <section>
            <div>
              <h2 className="text-lg font-semibold text-white">Resumen</h2>
              <p className="mt-1 text-sm text-[#68858e]">
                Vista rápida de la actividad de hoy.
              </p>
            </div>

            <Suspense fallback={<SummaryMetricsFallback />}>
              <SummaryMetrics businessId={businessId} show={widgets} />
            </Suspense>
          </section>
        )}

        <div className={`space-y-4 ${showSummary ? "mt-8" : ""}`}>
          {/* Actividad */}
          {showActivity && (
            <section className="grid gap-4 xl:grid-cols-3">
              {/* Ventas */}
              {widgets.sales_chart && (
                <Suspense fallback={<SalesChartFallback wide={!widgets.sales_by_channel} />}>
                  <SalesChartCard
                    businessId={businessId}
                    wide={!widgets.sales_by_channel}
                  />
                </Suspense>
              )}

              {/* Ventas por canal */}
              {widgets.sales_by_channel && (
                <Suspense fallback={<SalesByChannelFallback wide={!widgets.sales_chart} />}>
                  <SalesByChannelCard
                    businessId={businessId}
                    wide={!widgets.sales_chart}
                  />
                </Suspense>
              )}
            </section>
          )}

          {/* Atención e inventario */}
          {showAttention && (
            <section className="grid gap-4 lg:grid-cols-2">
              {widgets.conversations && (
                <div
                  className={`rounded-xl border border-[#17424c] bg-[#062630] p-6 ${
                    widgets.out_of_stock ? "" : "lg:col-span-2"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-white">
                        Conversaciones pendientes
                      </h2>

                      <p className="mt-1 text-sm text-[#68858e]">
                        Mensajes que requieren atención.
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/5 text-[#13d6b5]">
                      <MessageCircle size={19} />
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <ChannelRow name="WhatsApp" value="0" />
                    <ChannelRow name="Instagram" value="0" />
                    <ChannelRow name="Facebook" value="0" />
                    <ChannelRow name="TikTok" value="0" />
                    <ChannelRow name="Mercado Libre" value="0" />
                  </div>

                  <Link
                    href={`/businesses/${businessId}/conversations`}
                    className="mt-6 flex items-center justify-between border-t border-[#17424c] pt-4 text-sm text-[#8fb3bc] transition hover:text-[#13d6b5]"
                  >
                    Ver conversaciones
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}

              {widgets.out_of_stock && (
                <div
                  className={`rounded-xl border border-[#17424c] bg-[#062630] p-6 ${
                    widgets.conversations ? "" : "lg:col-span-2"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-white">
                        Productos sin existencia
                      </h2>

                      <p className="mt-1 text-sm text-[#68858e]">
                        Productos que requieren atención.
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/5 text-[#13d6b5]">
                      <ShoppingBag size={19} />
                    </div>
                  </div>

                  <div className="flex min-h-[105px] items-center justify-center">
                    <p className="text-sm text-[#68858e]">
                      No hay productos sin existencia.
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

