import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { updateBusiness } from "./actions";

type InformationPageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function InformationPage({
  params,
}: InformationPageProps) {
  const { businessId } = await params;

  const supabase = await createClient();

  // 1. Verificar usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Obtener información del negocio
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, business_type, status")
    .eq("id", businessId)
    .single();

  if (error) {
    console.error("Error loading business information:", error);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <Link
          href={`/businesses/${businessId}`}
          className="text-sm text-gray-400 transition hover:text-white"
        >
          ← Volver al negocio
        </Link>

        <header className="mt-6">
          <p className="text-sm text-gray-400">Información</p>

          <h1 className="mt-2 text-3xl font-bold">Información del negocio</h1>

          <p className="mt-2 text-sm text-gray-400">
            Administra la información general de tu negocio.
          </p>
        </header>

        {business ? (
          <form
            action={updateBusiness}
            className="mt-10 rounded-xl border border-gray-800 bg-gray-950 p-6"
          >
            <input type="hidden" name="businessId" value={businessId} />

            <div>
              <label htmlFor="name" className="block text-sm text-gray-400">
                Nombre del negocio
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={business.name}
                className="mt-2 w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white outline-none transition focus:border-gray-500"
              />
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-400">Tipo de negocio</p>

              <div className="mt-2 rounded-lg border border-gray-800 bg-black px-4 py-3 text-gray-300">
                {business.business_type}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-400">Estado</p>

              <div className="mt-2">
                <span className="inline-block rounded-full border border-gray-700 px-2.5 py-1 text-xs text-gray-300">
                  {business.status}
                </span>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-10 rounded-xl border border-red-900 bg-red-950/20 p-6">
            <p className="text-sm text-red-400">
              No se pudo cargar la información del negocio.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
