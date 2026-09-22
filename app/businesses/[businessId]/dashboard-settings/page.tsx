import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getDashboardWidgetState } from "@/lib/dashboard/preferences";
import { createClient } from "@/lib/supabase/server";
import DashboardWidgetSettings from "./DashboardWidgetSettings";

type DashboardSettingsPageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function DashboardSettingsPage({
  params,
}: DashboardSettingsPageProps) {
  const { businessId } = await params;
  const supabase = await createClient();

  // 1. Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Membresía y widgets activados: consultas independientes, en paralelo
  const [{ data: membership, error: membershipError }, widgets] =
    await Promise.all([
      supabase
        .from("business_members")
        .select("business_id")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .eq("status", "active")
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

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto w-full max-w-[1100px]">
        <Link
          href={`/businesses/${businessId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#8ca4ab] transition hover:text-[#13d6b5]"
        >
          <ArrowLeft size={16} />
          Volver al dashboard
        </Link>

        <header className="mt-7 border-b border-[#17424c] pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Personalizar dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8ca4ab]">
            Elige la información que quieres tener disponible al entrar a este
            negocio.
          </p>
        </header>

        <section className="pt-8">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Widgets disponibles
            </h2>

            <p className="mt-1 text-sm text-[#68858e]">
              Podrás mostrar u ocultar cada widget de acuerdo con las
              necesidades de tu negocio.
            </p>
          </div>

          <DashboardWidgetSettings
            businessId={businessId}
            initialWidgets={widgets}
          />

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-[#17424c] pt-6">
            <Link
              href={`/businesses/${businessId}`}
              className="rounded-lg border border-[#24606b] px-5 py-2.5 text-sm font-medium text-[#b5c8ce] transition hover:bg-[#082832] hover:text-white"
            >
              Cancelar
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
