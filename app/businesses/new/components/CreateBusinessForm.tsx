"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ArrowRight, Building2, BriefcaseBusiness } from "lucide-react";

import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { createBusiness } from "../../actions/createBusiness";

export default function CreateBusinessForm() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    const result = await createBusiness({
      businessName,
      businessType,
    });

    if (!result.success) {
      setError(result.error ?? "No fue posible crear el negocio.");
      setLoading(false);
      return;
    }

    router.push("/businesses");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {loading && <LoadingOverlay />}

      {/* Nombre del negocio */}
      <div>
        <label
          htmlFor="businessName"
          className="mb-2 block text-sm font-medium text-[#dce8eb]"
        >
          Nombre del negocio
        </label>

        <div className="group relative">
          <Building2
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#68858e] transition-colors group-focus-within:text-[#13d6b5]"
          />

          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Ej. Kubbo 3D"
            required
            disabled={loading}
            className="w-full rounded-lg border border-[#17424c] bg-[#061f29] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-200 placeholder:text-[#56737c] hover:border-[#24606b] focus:border-[#13d6b5]/70 focus:shadow-[0_0_0_3px_rgba(19,214,181,0.08)] disabled:opacity-50"
          />
        </div>

        <p className="mt-2 text-xs leading-5 text-[#68858e]">
          Usa el nombre con el que identificas este negocio.
        </p>
      </div>

      {/* Tipo de negocio */}
      <div>
        <label
          htmlFor="businessType"
          className="mb-2 block text-sm font-medium text-[#dce8eb]"
        >
          Tipo de negocio
        </label>

        <div className="group relative">
          <BriefcaseBusiness
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#68858e] transition-colors group-focus-within:text-[#13d6b5]"
          />

          <select
            id="businessType"
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            required
            disabled={loading}
            className="w-full appearance-none rounded-lg border border-[#17424c] bg-[#061f29] py-3 pl-11 pr-10 text-sm text-white outline-none transition-all duration-200 hover:border-[#24606b] focus:border-[#13d6b5]/70 focus:shadow-[0_0_0_3px_rgba(19,214,181,0.08)] disabled:opacity-50"
          >
            <option value="">Selecciona una opción</option>
            <option value="restaurant">Restaurante</option>
            <option value="retail">Tienda</option>
            <option value="services">Servicios</option>
            <option value="other">Otro</option>
          </select>

          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#68858e]">
            ▼
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-between gap-3 border-t border-[#17424c] pt-6">
        <button
          type="button"
          onClick={() => router.push("/businesses")}
          disabled={loading}
          className="rounded-lg border border-[#24606b] px-5 py-3 text-sm font-medium text-[#b5c8ce] transition-all duration-200 hover:border-[#3b7180] hover:bg-[#0a3039] hover:text-white disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading}
          className="group flex items-center justify-center gap-2 rounded-lg bg-[#08b89d] px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(8,184,157,0.15)] transition-all duration-300 hover:bg-[#0cc9ab] hover:shadow-[0_8px_30px_rgba(8,184,157,0.30)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Creando...
            </>
          ) : (
            <>
              Crear negocio
              <ArrowRight
                size={17}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
