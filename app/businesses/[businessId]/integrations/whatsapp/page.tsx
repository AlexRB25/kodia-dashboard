import WhatsAppEmbeddedSignup from "./WhatsAppEmbeddedSignup";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type WhatsAppPageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function WhatsAppPage({ params }: WhatsAppPageProps) {
  const { businessId } = await params;

  const supabase = await createClient();

  const { data: integration, error } = await supabase
    .from("business_integrations")
    .select(
      `
      id,
      status,
      external_account_id,
      external_account_name
    `,
    )
    .eq("business_id", businessId)
    .eq("provider", "whatsapp")
    .maybeSingle();

  if (error) {
    console.error("Error loading WhatsApp integration:", error);
  }

  const isConnected = integration?.status === "connected";

  return (
    <main>
      <Link
        href={`/businesses/${businessId}/integrations`}
        className="text-sm text-gray-400 transition hover:text-white"
      >
        ← Integraciones
      </Link>

      <header className="mt-6">
        <p className="text-sm text-gray-400">Integraciones / WhatsApp</p>

        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-3xl font-bold">WhatsApp</h1>

          <span className="rounded-full border border-gray-700 px-2.5 py-1 text-xs text-gray-400">
            {isConnected ? "Conectado" : "No conectado"}
          </span>
        </div>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
          Conecta una cuenta de WhatsApp Business para recibir y responder
          conversaciones desde Kodia.
        </p>
      </header>

      {!isConnected ? (
        <section className="mt-10 max-w-3xl rounded-xl border border-gray-800 bg-gray-950 p-6">
          <h2 className="text-lg font-semibold">Conectar WhatsApp</h2>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            Vincula tu cuenta de Meta para seleccionar la cuenta de WhatsApp
            Business y el número que utilizará este negocio.
          </p>

          <div className="mt-6 rounded-lg border border-gray-800 bg-black p-4">
            <p className="text-sm font-medium">Antes de comenzar</p>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Necesitarás acceso a la cuenta de Meta que administra el número de
              WhatsApp Business que deseas conectar.
            </p>
          </div>

          <WhatsAppEmbeddedSignup businessId={businessId} />
        </section>
      ) : (
        <section className="mt-10 max-w-3xl rounded-xl border border-gray-800 bg-gray-950 p-6">
          <h2 className="text-lg font-semibold">Cuenta conectada</h2>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-sm text-gray-500">Cuenta</p>

              <p className="mt-1">
                {integration.external_account_name ?? "WhatsApp Business"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">ID externo</p>

              <p className="mt-1 font-mono text-sm">
                {integration.external_account_id ?? "—"}
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
