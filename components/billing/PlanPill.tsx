import Link from "next/link";
import { Coins } from "lucide-react";

import { formatNumber } from "@/lib/billing/format";
import { createClient } from "@/lib/supabase/server";

type PlanPillProps = {
  businessId: string;
  accountId: string;
};

/**
 * Etiqueta "Plan Free · 1,000 créditos" del encabezado del dashboard.
 * Va dentro de un <Suspense>: no retrasa el resto de la página, y si algo falla
 * simplemente no se muestra.
 */
export default async function PlanPill({ businessId, accountId }: PlanPillProps) {
  const supabase = await createClient();

  const [{ data: subscription }, { data: balance }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan_code")
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("credit_balances")
      .select("plan_credits, permanent_credits")
      .eq("account_id", accountId)
      .maybeSingle(),
  ]);

  const planCode = subscription?.plan_code ?? "free";

  const { data: plan } = await supabase
    .from("plans")
    .select("name")
    .eq("code", planCode)
    .maybeSingle();

  if (!plan) {
    return null;
  }

  const credits = (balance?.plan_credits ?? 0) + (balance?.permanent_credits ?? 0);

  return (
    <Link
      href={`/businesses/${businessId}/billing`}
      className="inline-flex items-center gap-2 rounded-lg border border-[#17424c] bg-[#061f29] px-4 py-2 text-sm font-medium text-[#b6cbd1] transition hover:border-[#13d6b5]/40 hover:text-[#13d6b5]"
    >
      <Coins size={15} />
      Plan {plan.name} · {formatNumber(credits)} créditos
    </Link>
  );
}
