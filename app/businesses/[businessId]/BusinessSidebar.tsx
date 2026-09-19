"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type BusinessSidebarProps = {
  businessId: string;
};

const menuItems = [
  {
    name: "Dashboard",
    path: "",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    name: "Conversaciones",
    path: "/conversations",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M8 10h8M8 14h5M6.5 19 3 21v-4.5A8 8 0 1 1 19.5 18H8.8L6.5 19Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    name: "Contactos",
    path: "/contacts",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 8h4M19 6v4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    name: "IA",
    path: "/ai",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM18.5 13l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3ZM6 14l.8 2.7L9.5 18l-2.7.8L6 21.5l-.8-2.7L2.5 18l2.7-1.3L6 14Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    name: "Integraciones",
    path: "/integrations",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M8 12h8M12 8v8M7 4v3M17 4v3M7 17v3M17 17v3M4 7h3M17 7h3M4 17h3M17 17h3"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <rect
          x="7"
          y="7"
          width="10"
          height="10"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    ),
  },
  {
    name: "Configuración",
    path: "/settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M19 13.5v-3l-2-.7a7 7 0 0 0-.6-1.4l.9-1.9-2.1-2.1-1.9.9a7 7 0 0 0-1.4-.6L11.2 3h-3l-.7 1.7a7 7 0 0 0-1.4.6l-1.9-.9-2.1 2.1.9 1.9a7 7 0 0 0-.6 1.4l-1.7.7v3l1.7.7a7 7 0 0 0 .6 1.4l-.9 1.9 2.1 2.1 1.9-.9a7 7 0 0 0 1.4.6l.7 1.7h3l.7-1.7a7 7 0 0 0 1.4-.6l1.9.9 2.1-2.1-.9-1.9a7 7 0 0 0 .6-1.4l2-.7Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    ),
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/[0.06] bg-[#0a0a0b]">
      <div className="flex h-full flex-col">
        <div className="flex h-[72px] items-center border-b border-white/[0.06] px-5">
          <Link href="/businesses" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-black">
              K
            </div>

            <div>
              <div className="text-[17px] font-bold tracking-tight text-white">
                kod<span className="text-blue-500">ia</span>
              </div>
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                Workspace
              </div>
            </div>
          </Link>
        </div>

        <div className="px-5 pb-2 pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
            Principal
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {menuItems.map((item) => {
            const href = `${basePath}${item.path}`;
            const active = isActive(item.path);

            return (
              <Link
                key={item.name}
                href={href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
              >
                <span
                  className={`transition-colors ${
                    active
                      ? "text-blue-500"
                      : "text-zinc-600 group-hover:text-zinc-400"
                  }`}
                >
                  {item.icon}
                </span>

                <span>{item.name}</span>

                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <Link
            href="/businesses"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-zinc-600 transition group-hover:text-zinc-400"
            >
              <path
                d="m10 7-5 5 5 5M5 12h14"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Cambiar negocio
          </Link>
        </div>
      </div>
    </aside>
  );
}
