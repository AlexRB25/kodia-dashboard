"use client";

import { useState } from "react";
import {
  BarChart3,
  CircleDollarSign,
  MessageCircle,
  PackageX,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";

const widgets = [
  {
    id: "sales_summary",
    name: "Ventas",
    description: "Consulta las ventas del periodo seleccionado.",
    icon: CircleDollarSign,
  },
  {
    id: "orders",
    name: "Pedidos",
    description: "Consulta rápidamente los pedidos recibidos.",
    icon: ReceiptText,
  },
  {
    id: "conversations",
    name: "Conversaciones",
    description: "Mensajes, comentarios y preguntas pendientes de tus canales.",
    icon: MessageCircle,
  },
  {
    id: "average_ticket",
    name: "Ticket promedio",
    description: "Consulta el valor promedio de tus ventas.",
    icon: ShoppingBag,
  },
  {
    id: "sales_chart",
    name: "Gráfica de ventas",
    description: "Visualiza el comportamiento de tus ventas en el tiempo.",
    icon: BarChart3,
  },
  {
    id: "sales_by_channel",
    name: "Ventas por canal",
    description: "Compara las ventas generadas por cada uno de tus canales.",
    icon: BarChart3,
  },
  {
    id: "out_of_stock",
    name: "Productos sin existencia",
    description: "Detecta productos que requieren atención de inventario.",
    icon: PackageX,
  },
];

type WidgetState = Record<string, boolean>;

export default function DashboardWidgetSettings() {
  const [enabledWidgets, setEnabledWidgets] = useState<WidgetState>(() => {
    return Object.fromEntries(widgets.map((widget) => [widget.id, true]));
  });

  function toggleWidget(widgetId: string) {
    setEnabledWidgets((current) => ({
      ...current,
      [widgetId]: !current[widgetId],
    }));
  }

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {widgets.map((widget) => {
        const Icon = widget.icon;
        const enabled = enabledWidgets[widget.id];

        return (
          <div
            key={widget.id}
            className="relative min-w-0 rounded-xl border border-[#17424c] bg-[#062630] p-5 pr-20"
          >
            {/* Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`${enabled ? "Ocultar" : "Mostrar"} ${widget.name}`}
              onClick={() => toggleWidget(widget.id)}
              className={`absolute right-5 top-5 h-6 w-11 shrink-0 rounded-full transition ${
                enabled ? "bg-[#08b89d]" : "bg-[#17424c]"
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                  enabled ? "left-6" : "left-1"
                }`}
              />
            </button>

            {/* Contenido */}
            <div className="flex min-w-0 items-start gap-4">
              {/* Icono */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/5 text-[#13d6b5]">
                <Icon size={20} />
              </div>

              {/* Texto */}
              <div className="min-w-0 flex-1">
                <h3 className="pr-2 font-semibold text-white">{widget.name}</h3>

                <p className="mt-1.5 text-sm leading-5 text-[#78959d]">
                  {widget.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Guardar cambios */}
      <div className="col-span-full flex justify-end border-t border-[#17424c] pt-6">
        <button
          type="button"
          onClick={() => {
            console.log("Widgets a guardar:", enabledWidgets);
          }}
          className="rounded-lg bg-[#08b89d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0cc9ab]"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
