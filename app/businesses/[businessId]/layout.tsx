import Link from "next/link";

type BusinessLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    businessId: string;
  }>;
};

export default async function BusinessLayout({
  children,
  params,
}: BusinessLayoutProps) {
  const { businessId } = await params;

  return (
    <div className="min-h-screen bg-black text-white">
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-gray-800 bg-gray-950">
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-800 px-6 py-6">
            <Link
              href="/businesses"
              className="text-xl font-bold tracking-tight"
            >
              Kodia
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5">
            <Link
              href={`/businesses/${businessId}`}
              className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href={`/businesses/${businessId}/conversations`}
              className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
            >
              Conversaciones
            </Link>

            <Link
              href={`/businesses/${businessId}/contacts`}
              className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
            >
              Contactos
            </Link>

            <Link
              href={`/businesses/${businessId}/ai`}
              className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
            >
              IA
            </Link>

            <Link
              href={`/businesses/${businessId}/integrations`}
              className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
            >
              Integraciones
            </Link>

            <Link
              href={`/businesses/${businessId}/settings`}
              className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
            >
              Configuración
            </Link>
          </nav>

          <div className="border-t border-gray-800 p-3">
            <Link
              href="/businesses"
              className="block rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-900 hover:text-white"
            >
              ← Cambiar negocio
            </Link>
          </div>
        </div>
      </aside>

      <div className="ml-64 min-h-screen">
        {children}
      </div>
    </div>
  );
}