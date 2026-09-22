import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, Coins, Store } from "lucide-react";

import {
  STORE_PROVIDERS,
  formatDate,
  formatNumber,
  formatUsd,
  subscriptionStatusLabels,
} from "@/lib/billing/format";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";
import {
  ManageSubscriptionButton,
  PackCheckoutButton,
  PlanCheckoutButton,
} from "./BillingActions";

type BillingPageProps = {
  params: Promise<{
    businessId: string;
  }>;
  searchParams: Promise<{
    checkout?: string;
  }>;
};

type Plan = {
  code: string;
  name: string;
  price_usd_cents: number;
  monthly_credits: number;
  max_stores: number | null;
  active: boolean;
};

type CreditPack = {
  code: string;
  name: string;
  credits: number;
  price_usd_cents: number;
  active: boolean;
};

function storesLabel(maxStores: number | null) {
  if (maxStores === null) return "Tiendas ilimitadas";
  return maxStores === 1 ? "1 tienda conectada" : `Hasta ${maxStores} tiendas conectadas`;
}

export default async function BillingPage({ params, searchParams }: BillingPageProps) {
  const { businessId } = await params;
  const { checkout } = await searchParams;
  const supabase = await createClient();

  // 1. Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Membresía y negocio (de ahí sale la cuenta a la que pertenece el plan)
  const [
    { data: membership, error: membershipError },
    { data: business, error: businessError },
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
      .select("id, account_id")
      .eq("id", businessId)
      .maybeSingle(),
  ]);

  if (membershipError) {
    console.error("Error checking membership:", membershipError);
  }

  if (!membership) {
    notFound();
  }

  if (businessError) {
    console.error("Error loading business:", businessError);
  }

  if (!business) {
    notFound();
  }

  // 3. Suscripción, créditos, catálogo y negocios de la cuenta, en paralelo
  const [
    { data: subscription },
    { data: balance },
    { data: plansData },
    { data: packsData },
    { data: accountBusinesses },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "plan_code, status, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id",
      )
      .eq("account_id", business.account_id)
      .maybeSingle(),
    supabase
      .from("credit_balances")
      .select("plan_credits, permanent_credits, plan_credits_expire_at")
      .eq("account_id", business.account_id)
      .maybeSingle(),
    supabase
      .from("plans")
      .select("code, name, price_usd_cents, monthly_credits, max_stores, active")
      .order("sort_order", { ascending: true }),
    supabase
      .from("credit_packs")
      .select("code, name, credits, price_usd_cents, active")
      .order("sort_order", { ascending: true }),
    supabase.from("businesses").select("id").eq("account_id", business.account_id),
  ]);

  const plans = (plansData ?? []) as Plan[];
  const packs = (packsData ?? []) as CreditPack[];

  const currentPlan =
    plans.find((plan) => plan.code === (subscription?.plan_code ?? "free")) ??
    plans.find((plan) => plan.code === "free") ??
    null;

  // Tiendas de marketplace conectadas en los negocios de la cuenta
  const businessIds = (accountBusinesses ?? []).map((item) => item.id as string);
  let storesUsed = 0;

  if (businessIds.length > 0) {
    const { count } = await supabase
      .from("business_integrations")
      .select("id", { count: "exact", head: true })
      .in("business_id", businessIds)
      .in("provider", STORE_PROVIDERS)
      .in("status", ["pending", "connected"]);

    storesUsed = count ?? 0;
  }

  const planCredits = balance?.plan_credits ?? 0;
  const permanentCredits = balance?.permanent_credits ?? 0;
  const totalCredits = planCredits + permanentCredits;

  // El pago se habilita cuando Stripe está configurado y el producto está a la venta
  const stripeReady = isStripeConfigured();
  const hasPaidSubscription =
    Boolean(subscription?.stripe_subscription_id) && currentPlan?.code !== "free";

  const maxStores = currentPlan?.max_stores ?? null;
  const storesPercent =
    maxStores === null ? 0 : Math.min(100, Math.round((storesUsed / maxStores) * 100));

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto w-full max-w-[1100px] pb-12">
        <header className="border-b border-[#17424c] pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Plan y créditos
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8ca4ab]">
            Consulta tu plan, cuántas tiendas puedes conectar y tus créditos para IA
            y chat.
          </p>
        </header>

        {checkout === "success" && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-[#13d6b5]/30 bg-[#13d6b5]/5 px-5 py-4 text-sm leading-6 text-[#b6f0e5]"
          >
            ¡Gracias! Recibimos tu pago. Tu plan o tus créditos se actualizan en unos
            segundos; si aún no los ves, recarga la página.
          </div>
        )}

        {checkout === "cancelled" && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-[#17424c] bg-[#062630] px-5 py-4 text-sm leading-6 text-[#9db9c0]"
          >
            Cancelaste el pago. No se hizo ningún cargo.
          </div>
        )}

        {/* Tu plan */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">Tu plan actual</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* Plan y tiendas */}
            <div className="rounded-xl border border-[#17424c] bg-[#062630] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#7ea5af]">Plan</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {currentPlan?.name ?? "Free"}
                  </p>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-[#13d6b5]/25 bg-[#13d6b5]/5 px-3 py-1.5 text-xs font-medium text-[#13d6b5]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#13d6b5]" />
                  {subscriptionStatusLabels[subscription?.status ?? "active"] ??
                    subscription?.status}
                </span>
              </div>

              {subscription?.current_period_end && (
                <p className="mt-3 text-xs text-[#68858e]">
                  {subscription.cancel_at_period_end ? "Termina el" : "Se renueva el"}{" "}
                  {formatDate(subscription.current_period_end)}
                </p>
              )}

              <div className="mt-6 border-t border-[#17424c] pt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[#9db9c0]">
                    <Store size={15} />
                    Tiendas conectadas
                  </span>

                  <span className="font-medium text-white">
                    {storesUsed} de {maxStores === null ? "ilimitadas" : maxStores}
                  </span>
                </div>

                {maxStores !== null && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#031c26]">
                    <div
                      className="h-full rounded-full bg-[#13d6b5]"
                      style={{ width: `${storesPercent}%` }}
                    />
                  </div>
                )}

                <p className="mt-3 text-xs leading-5 text-[#68858e]">
                  Cuentan las tiendas de TikTok Shop, Mercado Libre, Shopify y Amazon
                  de todos tus negocios. WhatsApp no cuenta como tienda.
                </p>
              </div>

              {stripeReady && subscription?.stripe_customer_id && (
                <div className="flex flex-col">
                  <ManageSubscriptionButton businessId={businessId} />
                </div>
              )}
            </div>

            {/* Créditos */}
            <div className="rounded-xl border border-[#17424c] bg-[#062630] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#7ea5af]">Créditos disponibles</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {formatNumber(totalCredits)}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/5 text-[#13d6b5]">
                  <Coins size={20} />
                </div>
              </div>

              <dl className="mt-6 space-y-3 border-t border-[#17424c] pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-[#9db9c0]">Créditos del plan</dt>
                  <dd className="font-medium text-white">{formatNumber(planCredits)}</dd>
                </div>

                <div className="flex items-center justify-between">
                  <dt className="text-[#9db9c0]">Créditos permanentes</dt>
                  <dd className="font-medium text-white">
                    {formatNumber(permanentCredits)}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs leading-5 text-[#68858e]">
                Los del plan se renuevan cada periodo y los sobrantes se pierden
                {balance?.plan_credits_expire_at && planCredits > 0
                  ? ` (vencen el ${formatDate(balance.plan_credits_expire_at)})`
                  : ""}
                . Los permanentes (bienvenida y compras) no vencen. Se gastan primero
                los del plan. El asistente de soporte no consume créditos.
              </p>
            </div>
          </div>
        </section>

        {/* Planes */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-white">Planes</h2>
          <p className="mt-1 text-sm text-[#68858e]">
            Precios en USD por mes.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const isCurrent = plan.code === currentPlan?.code;

              return (
                <div
                  key={plan.code}
                  className={`flex flex-col rounded-xl border p-6 ${
                    isCurrent
                      ? "border-[#13d6b5]/50 bg-[#062630] shadow-[0_0_25px_rgba(19,214,181,0.06)]"
                      : "border-[#17424c] bg-[#062630]"
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{plan.name}</p>

                  <p className="mt-4 text-3xl font-bold tracking-tight text-white">
                    {plan.price_usd_cents === 0 ? "Gratis" : formatUsd(plan.price_usd_cents)}
                    {plan.price_usd_cents > 0 && (
                      <span className="text-sm font-normal text-[#68858e]"> /mes</span>
                    )}
                  </p>

                  <ul className="mt-5 flex-1 space-y-2.5 text-sm text-[#b6cbd1]">
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 shrink-0 text-[#13d6b5]" />
                      {storesLabel(plan.max_stores)}
                    </li>

                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 shrink-0 text-[#13d6b5]" />
                      {plan.monthly_credits > 0
                        ? `${formatNumber(plan.monthly_credits)} créditos al mes`
                        : "1,000 créditos de bienvenida (una vez)"}
                    </li>
                  </ul>

                  {isCurrent ? (
                    <span className="mt-6 inline-flex justify-center rounded-lg border border-[#13d6b5]/40 bg-[#13d6b5]/10 px-4 py-2.5 text-sm font-semibold text-[#13d6b5]">
                      Tu plan actual
                    </span>
                  ) : plan.price_usd_cents === 0 ? (
                    <span className="mt-6 inline-flex justify-center rounded-lg border border-[#17424c] px-4 py-2.5 text-sm text-[#68858e]">
                      Plan gratuito
                    </span>
                  ) : plan.active && stripeReady ? (
                    <div className="flex flex-col">
                      {hasPaidSubscription ? (
                        <ManageSubscriptionButton
                          businessId={businessId}
                          label="Cambiar de plan"
                        />
                      ) : (
                        <PlanCheckoutButton
                          businessId={businessId}
                          code={plan.code}
                          label="Contratar"
                        />
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="El pago de suscripciones estará disponible pronto"
                      className="mt-6 cursor-not-allowed rounded-lg border border-[#24606b] px-4 py-2.5 text-sm font-semibold text-[#8ca4ab] opacity-70"
                    >
                      Próximamente
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Comprar créditos */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-white">Comprar créditos</h2>
          <p className="mt-1 text-sm text-[#68858e]">
            Paquetes que no vencen, para cuando se te acaben los del plan.
          </p>

          {packs.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {packs.map((pack) => (
                <div
                  key={pack.code}
                  className="flex flex-col rounded-xl border border-[#17424c] bg-[#062630] p-5"
                >
                  <p className="text-2xl font-bold tracking-tight text-white">
                    {formatNumber(pack.credits)}
                  </p>
                  <p className="text-xs text-[#68858e]">créditos</p>

                  <p className="mt-4 text-lg font-semibold text-white">
                    {formatUsd(pack.price_usd_cents)}
                  </p>
                  <p className="mt-0.5 flex-1 text-xs text-[#68858e]">
                    ${(pack.price_usd_cents / 100 / pack.credits).toFixed(3)} por crédito
                  </p>

                  {pack.active && stripeReady ? (
                    <div className="flex flex-col">
                      <PackCheckoutButton
                        businessId={businessId}
                        code={pack.code}
                        label="Comprar"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="La compra de créditos estará disponible pronto"
                      className="mt-5 cursor-not-allowed rounded-lg border border-[#24606b] px-3 py-2 text-sm font-semibold text-[#8ca4ab] opacity-70"
                    >
                      Próximamente
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-[#17424c] bg-[#062630] px-6 py-10 text-center">
              <p className="text-sm text-[#68858e]">
                Los paquetes de créditos estarán disponibles pronto.
              </p>
            </div>
          )}
        </section>

        <p className="mt-10 text-sm leading-6 text-[#68858e]">
          {stripeReady
            ? "Los pagos los procesa Stripe: tu tarjeta se escribe en su página segura y Kodia nunca la ve. Si tienes algún problema con un pago,"
            : "El pago con tarjeta todavía no está habilitado. Si necesitas más tiendas o créditos ahora,"}{" "}
          <Link
            href={`/businesses/${businessId}/support`}
            className="font-medium text-[#13d6b5] hover:underline"
          >
            escríbenos en Soporte
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
