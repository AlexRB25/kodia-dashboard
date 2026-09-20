import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Plus,
  Store,
  UtensilsCrossed,
  ShoppingBag,
  BriefcaseBusiness,
  Layers3,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import EmptyBusinesses from "./components/EmptyBusinesses";

type Business = {
  id: string;
  name: string;
  business_type: string;
  status: string;
};

function getBusinessTypeLabel(type: string) {
  const labels: Record<string, string> = {
    retail: "Tienda",
    restaurant: "Restaurante",
    ecommerce: "Tienda en línea",
    services: "Servicios",
    hybrid: "Híbrido",
    other: "Otro",
  };

  return labels[type] ?? type;
}

function getBusinessIcon(type: string) {
  switch (type) {
    case "retail":
      return Store;

    case "restaurant":
      return UtensilsCrossed;

    case "ecommerce":
      return ShoppingBag;

    case "services":
      return BriefcaseBusiness;

    case "hybrid":
      return Layers3;

    default:
      return Building2;
  }
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Activo",
    inactive: "Inactivo",
    suspended: "Suspendido",
  };

  return labels[status] ?? status;
}

export default async function BusinessesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships, error } = await supabase
    .from("business_members")
    .select(
      `
        id,
        status,
        business:businesses (
          id,
          name,
          business_type,
          status
        )
      `,
    )
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) {
    console.error("Error loading businesses:", error);
  }

  const businesses: Business[] = (memberships ?? []).flatMap((membership) => {
    const relation = membership.business;
    const business = Array.isArray(relation) ? relation[0] : relation;

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
  });

  return (
    <main className="min-h-screen bg-[#031c26] text-white">
      {/* Header */}
      <div className="border-b border-[#17424c]/70 bg-[#041922]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Image
            src="/kodia-logo.png"
            alt="K-odia"
            width={145}
            height={42}
            priority
            className="h-auto w-auto"
          />

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-[#68858e]">Sesión iniciada como</p>
              <p className="max-w-[220px] truncate text-sm text-[#b9cdd2]">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-6xl px-6 py-10 md:py-14">
        <header className="flex flex-col gap-6 border-b border-[#17424c]/60 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#13d6b5]">
              <Building2 size={16} />
              Tus negocios
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Mis negocios
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#829da5]">
              Selecciona el negocio que deseas administrar o crea uno nuevo.
            </p>
          </div>

          <Link
            href="/businesses/new"
            className="group flex w-fit items-center justify-center gap-2 rounded-lg bg-[#08b89d] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(8,184,157,0.15)] transition-all duration-300 hover:bg-[#0cc9ab] hover:shadow-[0_10px_35px_rgba(8,184,157,0.25)]"
          >
            <Plus size={18} />
            Crear negocio
          </Link>
        </header>

        {businesses.length === 0 ? (
          <EmptyBusinesses />
        ) : (
          <>
            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm text-[#68858e]">
                {businesses.length}{" "}
                {businesses.length === 1 ? "negocio" : "negocios"}
              </p>
            </div>

            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((business) => {
                const BusinessIcon = getBusinessIcon(business.business_type);

                return (
                  <Link
                    key={business.id}
                    href={`/businesses/${business.id}`}
                    className="group relative overflow-hidden rounded-xl border border-[#17424c] bg-[#061f29] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#13d6b5]/50 hover:bg-[#082630] hover:shadow-[0_15px_40px_rgba(0,0,0,0.25)]"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#13d6b5]/0 to-transparent transition-all duration-300 group-hover:via-[#13d6b5]/70" />

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#1c4b55] bg-[#082b34] text-[#13d6b5] transition-all duration-300 group-hover:border-[#13d6b5]/40 group-hover:bg-[#0a343d]">
                        <BusinessIcon size={21} />
                      </div>

                      <span className="flex items-center gap-1.5 rounded-full border border-[#13d6b5]/20 bg-[#13d6b5]/5 px-2.5 py-1 text-xs font-medium text-[#70e5d1]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#13d6b5]" />
                        {getStatusLabel(business.status)}
                      </span>
                    </div>

                    <div className="mt-6">
                      <h2 className="text-lg font-semibold text-white transition-colors group-hover:text-[#eafffb]">
                        {business.name}
                      </h2>

                      <p className="mt-1.5 text-sm text-[#78959d]">
                        {getBusinessTypeLabel(business.business_type)}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-[#17424c]/60 pt-4">
                      <span className="text-sm font-medium text-[#9bb2b8] transition-colors group-hover:text-white">
                        Administrar
                      </span>

                      <ArrowRight
                        size={17}
                        className="text-[#68858e] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#13d6b5]"
                      />
                    </div>
                  </Link>
                );
              })}

              {/* Nueva tarjeta */}
              <Link
                href="/businesses/new"
                className="group flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-[#24606b] bg-[#061f29]/40 p-6 text-center transition-all duration-300 hover:border-[#13d6b5]/60 hover:bg-[#082630]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#24606b] bg-[#082b34] text-[#13d6b5] transition-all duration-300 group-hover:border-[#13d6b5]/50">
                  <Plus size={21} />
                </div>

                <p className="mt-4 text-sm font-semibold text-[#c8d8dc] group-hover:text-white">
                  Agregar otro negocio
                </p>

                <p className="mt-1.5 max-w-[200px] text-xs leading-5 text-[#68858e]">
                  Crea un nuevo negocio y administra sus canales por separado.
                </p>
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
