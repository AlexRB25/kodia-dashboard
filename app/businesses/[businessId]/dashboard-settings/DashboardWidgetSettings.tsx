"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import LoadingOverlay from "@/components/ui/LoadingOverlay";
import {
  dashboardWidgets,
  type DashboardWidgetId,
  type DashboardWidgetState,
} from "@/lib/dashboard/widgets";
import { saveDashboardWidgets } from "./actions";

type DashboardWidgetSettingsProps = {
  businessId: string;
  initialWidgets: DashboardWidgetState;
};

export default function DashboardWidgetSettings({
  businessId,
  initialWidgets,
}: DashboardWidgetSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enabledWidgets, setEnabledWidgets] =
    useState<DashboardWidgetState>(initialWidgets);
  const [error, setError] = useState<string | null>(null);

  function toggleWidget(widgetId: DashboardWidgetId) {
    setError(null);
    setEnabledWidgets((current) => ({
      ...current,
      [widgetId]: !current[widgetId],
    }));
  }

  function handleSave() {
    setError(null);

    startTransition(async () => {
      const result = await saveDashboardWidgets(businessId, enabledWidgets);

      if (!result.success) {
        setError(result.error ?? "No se pudieron guardar los cambios.");
        return;
      }

      router.push(`/businesses/${businessId}`);
    });
  }

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {isPending && <LoadingOverlay />}

      {dashboardWidgets.map((widget) => {
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
              disabled={isPending}
              onClick={() => toggleWidget(widget.id)}
              className={`absolute right-5 top-5 h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${
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
      <div className="col-span-full flex items-center justify-end gap-4 border-t border-[#17424c] pt-6">
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-[#08b89d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0cc9ab] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
