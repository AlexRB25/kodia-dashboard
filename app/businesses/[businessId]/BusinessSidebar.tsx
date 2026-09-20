"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Bot,
  ContactRound,
  LayoutDashboard,
  MessageCircle,
  Plug,
  Settings,
} from "lucide-react";

type BusinessSidebarProps = {
  businessId: string;
};

const menuItems = [
  {
    name: "Dashboard",
    path: "",
    icon: LayoutDashboard,
  },
  {
    name: "Conversaciones",
    path: "/conversations",
    icon: MessageCircle,
  },
  {
    name: "Contactos",
    path: "/contacts",
    icon: ContactRound,
  },
  {
    name: "IA",
    path: "/ai",
    icon: Bot,
  },
  {
    name: "Integraciones",
    path: "/integrations",
    icon: Plug,
  },
  {
    name: "Configuración",
    path: "/settings",
    icon: Settings,
  },
];

export default function BusinessSidebar({ businessId }: BusinessSidebarProps) {
  const pathname = usePathname();
  const basePath = `/businesses/${businessId}`;

  const isActive = (path: string) => {
    const href = `${basePath}${path}`;

    if (path === "") {
      return pathname === basePath;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-[#17424c] bg-[#031c26]">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-[88px] items-center border-b border-[#17424c] px-6">
          <Link
            href="/businesses"
            className="flex items-center transition-opacity duration-200 hover:opacity-80"
          >
            <Image
              src="/kodia-logo.png"
              alt="K-odia"
              width={145}
              height={42}
              priority
              className="h-auto w-auto"
            />
          </Link>
        </div>

        {/* Título del menú */}
        <div className="px-6 pb-3 pt-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#68858e]">
            Principal
          </p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1.5 px-3">
          {menuItems.map((item) => {
            const href = `${basePath}${item.path}`;
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={href}
                className={`group flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "border border-[#13d6b5]/20 bg-[#0a3039] text-white shadow-[0_0_20px_rgba(19,214,181,0.04)]"
                    : "border border-transparent text-[#8ca4ab] hover:bg-[#082832] hover:text-white"
                }`}
              >
                <Icon
                  size={19}
                  strokeWidth={1.8}
                  className={`shrink-0 transition-colors duration-200 ${
                    active
                      ? "text-[#13d6b5]"
                      : "text-[#68858e] group-hover:text-[#13d6b5]"
                  }`}
                />

                <span>{item.name}</span>

                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#13d6b5] shadow-[0_0_8px_rgba(19,214,181,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Cambiar negocio */}
        <div className="border-t border-[#17424c] p-3">
          <Link
            href="/businesses"
            className="group flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-medium text-[#8ca4ab] transition-all duration-200 hover:bg-[#082832] hover:text-white"
          >
            <ArrowLeftRight
              size={19}
              strokeWidth={1.8}
              className="text-[#68858e] transition-colors duration-200 group-hover:text-[#13d6b5]"
            />

            <span>Cambiar negocio</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
