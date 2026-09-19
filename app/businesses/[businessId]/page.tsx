import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type BusinessPageProps = {
  params: Promise<{
    businessId: string;
  }>;
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

  // 2. Comprobar que el usuario pertenece al negocio
  const { data: membership, error: membershipError } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    console.error("Error checking membership:", membershipError);
  }

  if (!membership) {
    notFound();
  }

  // 3. Obtener información del negocio
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, business_type, status")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError) {
    console.error("Error loading business:", businessError);
  }

  if (!business) {
    notFound();
  }

  // 4. Mostrar dashboard
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <Link
          href="/businesses"
          className="text-sm text-gray-400 transition hover:text-white"
        >
          ← Mis negocios
        </Link>

        <header className="mt-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm text-gray-400">{business.business_type}</p>

              <h1 className="mt-2 text-3xl font-bold">{business.name}</h1>
            </div>

            <span className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300">
              {business.status}
            </span>
          </div>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/businesses/${businessId}/information`}
            className="block rounded-xl border border-gray-800 bg-gray-950 p-6 transition hover:border-gray-600 hover:bg-gray-900"
          >
            <h2 className="text-lg font-semibold">Información</h2>

            <p className="mt-2 text-sm text-gray-400">
              Configura la información general de tu negocio.
            </p>
          </Link>

          <div className="rounded-xl border border-gray-800 bg-gray-950 p-6">
            <h2 className="font-semibold">Integraciones</h2>

            <p className="mt-2 text-sm text-gray-400">
              Conecta los servicios que utilizará este negocio.
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-950 p-6">
            <h2 className="font-semibold">Configuración</h2>

            <p className="mt-2 text-sm text-gray-400">
              Administra la configuración del negocio.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
