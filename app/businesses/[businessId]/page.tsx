import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  CircleDollarSign,
  MessageCircle,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type BusinessPageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

const businessTypeLabels: Record<string, string> = {
  restaurant: "Restaurante",
  retail: "Tienda",
  ecommerce: "E-commerce",
  services: "Servicios",
  hybrid: "Híbrido",
  other: "Otro",
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

  const businessType =
    businessTypeLabels[business.business_type] ?? business.business_type;

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Encabezado */}
        <Link
          href="/businesses"
          className="inline-flex items-center gap-2 text-sm text-[#7ea5af] transition hover:text-[#13d6b5]"
        >
          ← Mis negocios
        </Link>

        <header className="mt-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#13d6b5]">
                <ShoppingBag size={16} />
                {businessType}
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
                {business.name}
              </h1>

              <p className="mt-3 text-sm text-[#7ea5af]">
                Consulta rápidamente el estado y actividad de tu negocio.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/businesses/${businessId}/dashboard-settings`}
                className="rounded-lg border border-[#17424c] bg-[#061f29] px-4 py-2 text-sm font-medium text-[#b6cbd1] transition hover:border-[#13d6b5]/40 hover:text-[#13d6b5]"
              >
                Personalizar dashboard
              </Link>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#13d6b5]/25 bg-[#13d6b5]/5 px-3 py-1.5 text-xs font-medium text-[#13d6b5]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#13d6b5]" />
                {business.status === "active" ? "Activo" : business.status}
              </span>

              <button
                type="button"
                className="rounded-lg border border-[#17424c] bg-[#061f29] px-4 py-2 text-sm text-[#b6cbd1] transition hover:border-[#24606b] hover:text-white"
              >
                Hoy
              </button>
            </div>
          </div>
        </header>

        <div className="my-8 border-t border-[#17424c]" />

        {/* Resumen */}
        <section>
          <div>
            <h2 className="text-lg font-semibold text-white">Resumen</h2>
            <p className="mt-1 text-sm text-[#68858e]">
              Vista rápida de la actividad de hoy.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Ventas hoy"
              value="$0.00"
              detail="Sin datos todavía"
              icon={<CircleDollarSign size={20} />}
            />

            <MetricCard
              title="Pedidos hoy"
              value="0"
              detail="Sin pedidos registrados"
              icon={<ReceiptText size={20} />}
            />

            <MetricCard
              title="Conversaciones"
              value="0"
              detail="0 pendientes"
              icon={<MessageCircle size={20} />}
            />

            <MetricCard
              title="Ticket promedio"
              value="$0.00"
              detail="Basado en ventas de hoy"
              icon={<ShoppingBag size={20} />}
            />
          </div>
        </section>

        {/* Actividad */}
        <section className="mt-8 grid gap-4 xl:grid-cols-3">
          {/* Ventas */}
          <div className="rounded-xl border border-[#17424c] bg-[#062630] p-6 xl:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-white">Ventas</h2>
                <p className="mt-1 text-sm text-[#68858e]">
                  Rendimiento de ventas del periodo seleccionado.
                </p>
              </div>

              <span className="text-xs text-[#68858e]">Hoy</span>
            </div>

            <div className="flex min-h-[220px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-[#13d6b5]/20 bg-[#13d6b5]/5 text-[#13d6b5]">
                  <CircleDollarSign size={21} />
                </div>

                <p className="mt-4 text-sm font-medium text-[#c4d5da]">
                  Aún no hay ventas para mostrar
                </p>

                <p className="mt-1 text-xs text-[#68858e]">
                  Aquí aparecerá el comportamiento de tus ventas.
                </p>
              </div>
            </div>
          </div>

          {/* Ventas por canal */}
          <div className="rounded-xl border border-[#17424c] bg-[#062630] p-6">
            <h2 className="font-semibold text-white">Ventas por canal</h2>

            <p className="mt-1 text-sm text-[#68858e]">
              Distribución de tus ventas.
            </p>

            <div className="mt-6 space-y-3">
              <ChannelRow name="TikTok Shop" value="$0.00" />
              <ChannelRow name="Mercado Libre" value="$0.00" />
              <ChannelRow name="Tienda" value="$0.00" />
            </div>

            <Link
              href={`/businesses/${businessId}/integrations`}
              className="mt-6 flex items-center justify-between border-t border-[#17424c] pt-4 text-sm text-[#8fb3bc] transition hover:text-[#13d6b5]"
            >
              Administrar canales
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* Atención e inventario */}
        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[#17424c] bg-[#062630] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-white">
                  Conversaciones pendientes
                </h2>

                <p className="mt-1 text-sm text-[#68858e]">
                  Mensajes que requieren atención.
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/5 text-[#13d6b5]">
                <MessageCircle size={19} />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <ChannelRow name="WhatsApp" value="0" />
              <ChannelRow name="Instagram" value="0" />
              <ChannelRow name="Facebook" value="0" />
              <ChannelRow name="TikTok" value="0" />
              <ChannelRow name="Mercado Libre" value="0" />
            </div>

            <Link
              href={`/businesses/${businessId}/conversations`}
              className="mt-6 flex items-center justify-between border-t border-[#17424c] pt-4 text-sm text-[#8fb3bc] transition hover:text-[#13d6b5]"
            >
              Ver conversaciones
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="rounded-xl border border-[#17424c] bg-[#062630] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-white">
                  Productos sin existencia
                </h2>

                <p className="mt-1 text-sm text-[#68858e]">
                  Productos que requieren atención.
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/5 text-[#13d6b5]">
                <ShoppingBag size={19} />
              </div>
            </div>

            <div className="flex min-h-[105px] items-center justify-center">
              <p className="text-sm text-[#68858e]">
                No hay productos sin existencia.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#17424c] bg-[#062630] p-5 transition duration-200 hover:border-[#24606b]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#7ea5af]">{title}</p>

          <p className="mt-3 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/5 text-[#13d6b5]">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-xs text-[#68858e]">{detail}</p>
    </div>
  );
}

function ChannelRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#17424c]/70 bg-[#031c26]/60 px-4 py-3">
      <span className="text-sm text-[#9db9c0]">{name}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}
