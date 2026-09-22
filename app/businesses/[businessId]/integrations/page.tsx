import Link from "next/link";

import { isTikTokConfigured } from "@/lib/integrations/tiktok-shop/client";
import { isEncryptionConfigured } from "@/lib/security/secrets";
import { createClient } from "@/lib/supabase/server";
import { ConnectLink, DisconnectButton } from "./IntegrationActions";

type IntegrationsPageProps = {
  params: Promise<{
    businessId: string;
  }>;
  searchParams: Promise<{
    tiktok?: string;
    reason?: string;
    n?: string;
    limited?: string;
    elsewhere?: string;
  }>;
};

type Integration = {
  id: string;
  provider: string;
  status: string;
  external_account_id: string | null;
  external_account_name: string | null;
  config: { region?: string | null } | null;
};

type ProviderKind = "page" | "oauth" | "soon";

const providers: {
  id: string;
  name: string;
  description: string;
  kind: ProviderKind;
}[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    description:
      "Conecta WhatsApp para recibir y responder conversaciones desde Kodia.",
    kind: "page",
  },
  {
    id: "tiktok_shop",
    name: "TikTok Shop",
    description:
      "Conecta tus tiendas de TikTok Shop para administrar pedidos, productos y conversaciones.",
    kind: "oauth",
  },
  {
    id: "mercado_libre",
    name: "Mercado Libre",
    description:
      "Conecta Mercado Libre para centralizar la comunicación con tus clientes.",
    kind: "soon",
  },
  {
    id: "shopify",
    name: "Shopify",
    description:
      "Conecta tu tienda Shopify para integrar clientes, pedidos y conversaciones con Kodia.",
    kind: "soon",
  },
  {
    id: "amazon",
    name: "Amazon",
    description:
      "Conecta tu cuenta de vendedor de Amazon para integrar información y operaciones con Kodia.",
    kind: "soon",
  },
];

const tiktokReasons: Record<string, string> = {
  not_configured: "La conexión con TikTok Shop todavía no está configurada.",
  invalid_state: "El enlace de autorización venció o ya se usó. Inténtalo de nuevo.",
  denied: "Cancelaste la autorización en TikTok Shop.",
  forbidden: "Solo el dueño o un administrador de la cuenta puede conectar tiendas.",
  exchange_failed:
    "No pudimos completar la conexión con TikTok Shop. Inténtalo de nuevo; si sigue igual, abre un ticket en Soporte.",
  no_shops: "TikTok no devolvió ninguna tienda autorizada.",
  store_limit:
    "Tu plan no permite conectar más tiendas. Puedes mejorarlo en «Plan y créditos».",
  elsewhere: "Esa tienda ya está conectada a otra cuenta de Kodia.",
  too_many_attempts: "Demasiados intentos seguidos. Espera unos minutos.",
  unavailable: "La conexión no está disponible en este momento.",
};

function getStatusLabel(status?: string) {
  switch (status) {
    case "connected":
      return "Conectado";

    case "pending":
      return "Pendiente";

    case "error":
      return "Error";

    default:
      return "No conectado";
  }
}

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

export default async function IntegrationsPage({
  params,
  searchParams,
}: IntegrationsPageProps) {
  const { businessId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  // Obtener integraciones guardadas para este negocio
  const { data, error } = await supabase
    .from("business_integrations")
    .select(
      `
      id,
      provider,
      status,
      external_account_id,
      external_account_name,
      config
    `,
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading integrations:", error);
  }

  const integrations = (data ?? []) as Integration[];
  const tiktokReady = isTikTokConfigured() && isEncryptionConfigured();

  // En desarrollo el botón se ve siempre (si falta configuración, al pulsarlo se
  // explica qué falta); en producción solo cuando la conexión está configurada.
  const showTikTokConnect = tiktokReady || process.env.NODE_ENV !== "production";

  // Resultado de la conexión con TikTok Shop (viene en la URL al volver)
  let banner: { tone: "ok" | "error"; text: string } | null = null;

  if (query.tiktok === "connected" || query.tiktok === "partial") {
    const connected = Number(query.n) || 0;
    const limited = Number(query.limited) || 0;
    const elsewhere = Number(query.elsewhere) || 0;

    const notes = [
      limited > 0
        ? `${limited} ${plural(limited, "no se conectó", "no se conectaron")} porque tu plan no permite más tiendas`
        : null,
      elsewhere > 0
        ? `${elsewhere} ${plural(elsewhere, "ya estaba conectada", "ya estaban conectadas")} a otra cuenta de Kodia`
        : null,
    ].filter(Boolean);

    banner = {
      tone: "ok",
      text:
        `Conectaste ${connected} ${plural(connected, "tienda", "tiendas")} de TikTok Shop.` +
        (notes.length > 0 ? ` (${notes.join("; ")}).` : ""),
    };
  } else if (query.tiktok === "error") {
    banner = {
      tone: "error",
      text:
        tiktokReasons[query.reason ?? ""] ??
        "No se pudo conectar TikTok Shop. Inténtalo de nuevo.",
    };
  }

  return (
    <main>
      <Link
        href={`/businesses/${businessId}`}
        className="text-sm text-gray-400 transition hover:text-white"
      >
        ← Volver al negocio
      </Link>

      <div className="mt-6">
        <p className="text-sm text-gray-400">Integraciones</p>

        <h1 className="mt-2 text-3xl font-bold">Integraciones</h1>

        <p className="mt-2 text-sm text-gray-400">
          Conecta los canales y servicios que utilizará este negocio.
        </p>
      </div>

      {banner && (
        <div
          role="status"
          className={`mt-6 rounded-xl border px-5 py-4 text-sm leading-6 ${
            banner.tone === "ok"
              ? "border-[#13d6b5]/30 bg-[#13d6b5]/5 text-[#b6f0e5]"
              : "border-red-900 bg-red-950/20 text-red-300"
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => {
          const accounts = integrations.filter(
            (item) => item.provider === provider.id,
          );

          const active = accounts.filter((item) => item.status !== "disconnected");
          const hasConnected = active.some((item) => item.status === "connected");

          const status = hasConnected
            ? "connected"
            : (active[0]?.status ?? "disconnected");

          return (
            <div
              key={provider.id}
              className="flex flex-col rounded-xl border border-gray-800 bg-gray-950 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{provider.name}</h2>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    {provider.description}
                  </p>
                </div>

                <span className="whitespace-nowrap rounded-full border border-gray-700 px-2.5 py-1 text-xs text-gray-400">
                  {getStatusLabel(status)}
                </span>
              </div>

              {active.length > 0 && (
                <div className="mt-4 space-y-2">
                  {active.map((account) => (
                    <div
                      key={account.id}
                      className="rounded-lg border border-gray-800 bg-black p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">
                            Cuenta conectada
                            {account.config?.region ? ` · ${account.config.region}` : ""}
                          </p>

                          <p className="mt-1 truncate text-sm text-gray-300">
                            {account.external_account_name ?? "Sin nombre"}
                          </p>
                        </div>

                        <span className="whitespace-nowrap text-xs text-gray-500">
                          {getStatusLabel(account.status)}
                        </span>
                      </div>

                      {provider.kind === "oauth" && (
                        <div className="mt-2">
                          <DisconnectButton
                            businessId={businessId}
                            integrationId={account.id}
                            accountName={account.external_account_name ?? provider.name}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-6">
                {provider.kind === "page" ? (
                  status === "connected" ? (
                    <button
                      type="button"
                      className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-900"
                    >
                      Administrar
                    </button>
                  ) : (
                    <Link
                      href={`/businesses/${businessId}/integrations/${provider.id}`}
                      className="inline-block rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200"
                    >
                      Conectar
                    </Link>
                  )
                ) : provider.kind === "oauth" && showTikTokConnect ? (
                  <ConnectLink
                    href={`/api/integrations/tiktok-shop/connect?businessId=${businessId}`}
                    label={active.length > 0 ? "Conectar otra tienda" : "Conectar tienda"}
                  />
                ) : (
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-lg border border-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-500"
                  >
                    Próximamente
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
