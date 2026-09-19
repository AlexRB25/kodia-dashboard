import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type IntegrationsPageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

type Integration = {
  id: string;
  provider: string;
  status: string;
  external_account_id: string | null;
  external_account_name: string | null;
};

const providers = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    description:
      "Conecta WhatsApp para recibir y responder conversaciones desde Kodia.",
    enabled: true,
  },
  {
    id: "tiktok_shop",
    name: "TikTok Shop",
    description:
      "Conecta TikTok Shop para administrar conversaciones relacionadas con tu tienda.",
    enabled: false,
  },
  {
    id: "mercado_libre",
    name: "Mercado Libre",
    description:
      "Conecta Mercado Libre para centralizar la comunicación con tus clientes.",
    enabled: false,
  },
  {
    id: "shopify",
    name: "Shopify",
    description:
      "Conecta tu tienda Shopify para integrar clientes, pedidos y conversaciones con Kodia.",
    enabled: false,
  },
  {
    id: "amazon",
    name: "Amazon",
    description:
      "Conecta tu cuenta de vendedor de Amazon para integrar información y operaciones con Kodia.",
    enabled: false,
  },
];

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

export default async function IntegrationsPage({
  params,
}: IntegrationsPageProps) {
  const { businessId } = await params;

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
      external_account_name
    `,
    )
    .eq("business_id", businessId);

  if (error) {
    console.error("Error loading integrations:", error);
  }

  const integrations: Integration[] = data ?? [];

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

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => {
          const integration = integrations.find(
            (item) => item.provider === provider.id,
          );

          const status = integration?.status ?? "disconnected";

          return (
            <div
              key={provider.id}
              className="rounded-xl border border-gray-800 bg-gray-950 p-6"
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

              {integration?.external_account_name && (
                <div className="mt-4 rounded-lg border border-gray-800 bg-black p-3">
                  <p className="text-xs text-gray-500">Cuenta conectada</p>

                  <p className="mt-1 text-sm text-gray-300">
                    {integration.external_account_name}
                  </p>
                </div>
              )}

              <div className="mt-6">
                {provider.enabled ? (
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
