import type { SupabaseClient } from "@supabase/supabase-js";

import { lastDays, safeTimeZone } from "./timezone";

type NumberLike = number | string;

export type SummaryRow = {
  provider: string;
  currency: string;
  orders_count: NumberLike;
  sales_cents: NumberLike;
};

export type DailyRow = {
  day: string;
  currency: string;
  orders_count: NumberLike;
  sales_cents: NumberLike;
};

export type DashboardMetrics = {
  /** Moneda en la que se muestran los totales. */
  currency: string;
  today: { salesCents: number; orders: number; avgTicketCents: number };
  /** Ventas de hoy en otras monedas (no se convierten: no hay tipo de cambio). */
  otherCurrencies: { currency: string; salesCents: number; orders: number }[];
  byChannel: { provider: string; salesCents: number; orders: number }[];
  /** Últimos 7 días, en la moneda principal. */
  series: { day: string; salesCents: number; orders: number }[];
  shops: number;
  lastSyncedAt: string | null;
  lastError: string | null;
};

const n = (value: NumberLike) => Number(value) || 0;

export function emptyMetrics(currency: string, days: string[]): DashboardMetrics {
  return {
    currency,
    today: { salesCents: 0, orders: 0, avgTicketCents: 0 },
    otherCurrencies: [],
    byChannel: [],
    series: days.map((day) => ({ day, salesCents: 0, orders: 0 })),
    shops: 0,
    lastSyncedAt: null,
    lastError: null,
  };
}

/**
 * Moneda principal: la del negocio si tiene ventas en ella (o no hay ventas);
 * si no, la que más vendió. Evita un dashboard en $0 cuando todo se vende en otra moneda.
 */
export function pickPrimaryCurrency(preferred: string, rows: { currency: string; sales_cents: NumberLike }[]): string {
  const totals = new Map<string, number>();

  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + n(row.sales_cents));
  }

  if (totals.size === 0 || totals.has(preferred)) {
    return preferred;
  }

  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Junta las filas de la base de datos en lo que muestra el dashboard. Función pura. */
export function buildMetrics(params: {
  todayRows: SummaryRow[];
  dailyRows: DailyRow[];
  days: string[];
  preferredCurrency: string;
}): Pick<DashboardMetrics, "currency" | "today" | "otherCurrencies" | "byChannel" | "series"> {
  const { todayRows, dailyRows, days, preferredCurrency } = params;
  const currency = pickPrimaryCurrency(preferredCurrency, dailyRows);

  const primaryToday = todayRows.filter((row) => row.currency === currency);
  const salesCents = primaryToday.reduce((sum, row) => sum + n(row.sales_cents), 0);
  const orders = primaryToday.reduce((sum, row) => sum + n(row.orders_count), 0);

  const others = new Map<string, { salesCents: number; orders: number }>();

  for (const row of todayRows) {
    if (row.currency === currency) continue;

    const current = others.get(row.currency) ?? { salesCents: 0, orders: 0 };
    current.salesCents += n(row.sales_cents);
    current.orders += n(row.orders_count);
    others.set(row.currency, current);
  }

  const byChannel = new Map<string, { salesCents: number; orders: number }>();

  for (const row of primaryToday) {
    const current = byChannel.get(row.provider) ?? { salesCents: 0, orders: 0 };
    current.salesCents += n(row.sales_cents);
    current.orders += n(row.orders_count);
    byChannel.set(row.provider, current);
  }

  const series = days.map((day) => {
    const rows = dailyRows.filter((row) => row.day === day && row.currency === currency);

    return {
      day,
      salesCents: rows.reduce((sum, row) => sum + n(row.sales_cents), 0),
      orders: rows.reduce((sum, row) => sum + n(row.orders_count), 0),
    };
  });

  return {
    currency,
    today: {
      salesCents,
      orders,
      avgTicketCents: orders > 0 ? Math.round(salesCents / orders) : 0,
    },
    otherCurrencies: [...others.entries()].map(([code, values]) => ({ currency: code, ...values })),
    byChannel: [...byChannel.entries()].map(([provider, values]) => ({ provider, ...values })),
    series,
  };
}

/**
 * Métricas del negocio con la sesión del usuario (la RLS limita qué pedidos se
 * suman). Si algo falla —por ejemplo, la migración de pedidos aún no está
 * aplicada— devuelve ceros en vez de romper el dashboard.
 */
export async function loadDashboardMetrics(
  supabase: SupabaseClient,
  business: { id: string; currency: string | null; timezone: string | null },
): Promise<DashboardMetrics> {
  const timeZone = safeTimeZone(business.timezone);
  const preferredCurrency = business.currency ?? "MXN";
  const week = lastDays(new Date(), timeZone, 7);

  const [summary, daily, integrations] = await Promise.all([
    supabase.rpc("orders_summary", {
      p_business_id: business.id,
      p_from: week.lastDayStart.toISOString(),
      p_to: week.to.toISOString(),
    }),
    supabase.rpc("orders_daily", {
      p_business_id: business.id,
      p_from: week.from.toISOString(),
      p_to: week.to.toISOString(),
      p_timezone: timeZone,
    }),
    supabase
      .from("business_integrations")
      .select("last_synced_at, last_error")
      .eq("business_id", business.id)
      .eq("provider", "tiktok_shop")
      .eq("status", "connected"),
  ]);

  const shops = (integrations.data ?? []) as { last_synced_at: string | null; last_error: string | null }[];
  const lastSyncedAt =
    shops
      .map((shop) => shop.last_synced_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  const base = {
    shops: shops.length,
    lastSyncedAt,
    lastError: shops.find((shop) => shop.last_error)?.last_error ?? null,
  };

  if (summary.error || daily.error) {
    console.error("Error loading dashboard metrics:", summary.error ?? daily.error);
    return { ...emptyMetrics(preferredCurrency, week.days), ...base };
  }

  return {
    ...buildMetrics({
      todayRows: (summary.data ?? []) as SummaryRow[],
      dailyRows: (daily.data ?? []) as DailyRow[],
      days: week.days,
      preferredCurrency,
    }),
    ...base,
  };
}

/** "hace 5 min", "hace 2 h", "hace 3 días". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));

  if (seconds < 60) return "hace un momento";
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;

  const days = Math.floor(seconds / 86400);

  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}
