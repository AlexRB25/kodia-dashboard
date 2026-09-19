"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBusiness } from "../../actions/createBusiness";

export default function CreateBusinessForm() {
  const router = useRouter();

  const [accountName, setAccountName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    const result = await createBusiness({
      accountName,
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
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">

      <div>
        <label
          htmlFor="accountName"
          className="mb-2 block text-sm font-medium text-white"
        >
          Nombre de la cuenta
        </label>

        <input
          id="accountName"
          type="text"
          value={accountName}
          onChange={(event) => setAccountName(event.target.value)}
          placeholder="Ej. Grupo Mi Empresa"
          required
          disabled={loading}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-gray-500 disabled:opacity-50"
        />

        <p className="mt-2 text-xs text-gray-500">
          La cuenta agrupa tus negocios dentro de Kodia.
        </p>
      </div>

      <div>
        <label
          htmlFor="businessName"
          className="mb-2 block text-sm font-medium text-white"
        >
          Nombre del negocio
        </label>

        <input
          id="businessName"
          type="text"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="Ej. Hamburguesas Alex"
          required
          disabled={loading}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-gray-500 disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="businessType"
          className="mb-2 block text-sm font-medium text-white"
        >
          Tipo de negocio
        </label>

        <select
          id="businessType"
          value={businessType}
          onChange={(event) => setBusinessType(event.target.value)}
          required
          disabled={loading}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-gray-500 disabled:opacity-50"
        >
          <option value="">Selecciona una opción</option>
          <option value="restaurant">Restaurante</option>
          <option value="store">Tienda</option>
          <option value="services">Servicios</option>
          <option value="other">Otro</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3">
          <p className="text-sm text-red-400">
            {error}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">

        <button
          type="button"
          onClick={() => router.push("/businesses")}
          disabled={loading}
          className="rounded-lg border border-gray-700 px-5 py-3 text-sm font-medium text-gray-300 transition hover:bg-gray-900 disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear negocio"}
        </button>

      </div>

    </form>
  );
}