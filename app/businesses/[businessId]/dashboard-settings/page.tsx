import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CircleDollarSign,
  MessageCircle,
  PackageX,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";
import DashboardWidgetSettings from "./DashboardWidgetSettings";

type DashboardSettingsPageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

const widgets = [
  {
    id: "sales_summary",
    name: "Ventas",
    description: "Consulta las ventas del periodo seleccionado.",
    icon: CircleDollarSign,
    enabled: true,
  },
  {
    id: "orders",
    name: "Pedidos",
    description: "Consulta rápidamente los pedidos recibidos.",
    icon: ReceiptText,
    enabled: true,
  },
  {
    id: "conversations",
    name: "Conversaciones",
    description: "Mensajes, comentarios y preguntas pendientes de tus canales.",
    icon: MessageCircle,
    enabled: true,
  },
  {
    id: "average_ticket",
    name: "Ticket promedio",
    description: "Consulta el valor promedio de tus ventas.",
    icon: ShoppingBag,
    enabled: true,
  },
  {
    id: "sales_chart",
    name: "Gráfica de ventas",
    description: "Visualiza el comportamiento de tus ventas en el tiempo.",
    icon: BarChart3,
    enabled: true,
  },
  {
    id: "sales_by_channel",
    name: "Ventas por canal",
    description: "Compara las ventas generadas por cada uno de tus canales.",
    icon: BarChart3,
    enabled: true,
  },
  {
    id: "out_of_stock",
    name: "Productos sin existencia",
    description: "Detecta productos que requieren atención de inventario.",
    icon: PackageX,
    enabled: true,
  },
];

export default async function DashboardSettingsPage({
  params,
}: DashboardSettingsPageProps) {
  const { businessId } = await params;

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

          <DashboardWidgetSettings />

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
