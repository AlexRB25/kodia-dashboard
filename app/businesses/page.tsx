import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import EmptyBusinesses from "./components/EmptyBusinesses";

type Business = {
  id: string;
  name: string;
  business_type: string;
  status: string;
};

export default async function BusinessesPage() {
  const supabase = await createClient();

  // 1. Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Obtener los negocios asociados al usuario
  const { data: memberships, error } = await supabase
    .from("business_members")
    .select(`
      id,
      status,
      business:businesses (
        id,
        name,
        business_type,
        status
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) {
    console.error("Error loading businesses:", error);
  }

  // 3. Extraer los negocios de las membresías
  const businesses: Business[] = (memberships ?? []).flatMap(
    (membership) => {
      const relation = membership.business;

      const business = Array.isArray(relation)
        ? relation[0]
        : relation;

      if (!business) {
        return [];
      }

      return [
        {
          id: business.id,
          name: business.name,
          business_type: business.business_type,
          status: business.status,
        },
      ];
    }
  );

  // 4. Mostrar los negocios
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header>
          <h1 className="text-3xl font-bold">
            Mis negocios
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Administra los negocios asociados a tu cuenta.
          </p>
        </header>

        {businesses.length === 0 ? (
          <EmptyBusinesses />
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <Link
                key={business.id}
                href={`/businesses/${business.id}`}
                className="group block rounded-xl border border-gray-800 bg-gray-950 p-6 transition hover:border-gray-600 hover:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {business.name}
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                      {business.business_type}
                    </p>
                  </div>

                  <span className="rounded-full border border-gray-700 px-2.5 py-1 text-xs text-gray-300">
                    {business.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}