import {
  BarChart3,
  CircleDollarSign,
  MessageCircle,
  PackageX,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";

export const dashboardWidgets = [
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
] as const;

export type DashboardWidgetId = (typeof dashboardWidgets)[number]["id"];

export type DashboardWidgetState = Record<DashboardWidgetId, boolean>;

/**
 * Convierte lo guardado en `dashboard_preferences.widgets` en un estado
 * completo. Un widget solo se oculta si está guardado explícitamente como
 * `false`; los widgets nuevos o desconocidos se muestran por defecto.
 */
export function resolveWidgetState(stored: unknown): DashboardWidgetState {
  const source =
    stored && typeof stored === "object" && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    dashboardWidgets.map((widget) => [widget.id, source[widget.id] !== false]),
  ) as DashboardWidgetState;
}
