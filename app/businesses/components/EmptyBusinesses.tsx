import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Sparkles } from "lucide-react";

export default function EmptyBusinesses() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center py-12">
      <div className="relative w-full max-w-xl text-center">
        {/* Brillo de fondo */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#13d6b5]/[0.04] blur-3xl" />

        <div className="relative">
          {/* Icono */}
          <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#13d6b5]/20 bg-[#13d6b5]/10 text-[#13d6b5] shadow-[0_0_30px_rgba(19,214,181,0.08)]">
            <Building2 size={34} strokeWidth={1.8} />
          </div>

          {/* Badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#13d6b5]/20 bg-[#062b35] px-3 py-1.5 text-xs font-medium text-[#59dac7]">
            <Sparkles size={13} />
            Comienza con K-odia
          </div>

          {/* Titulo */}
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Crea tu primer negocio
          </h2>

          {/* Descripcion */}
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#91aab2] sm:text-base">
            Agrega tu negocio para comenzar a centralizar tus canales, clientes,
            conversaciones y herramientas en K-odia.
          </p>

          {/* Beneficios */}
          <div className="mx-auto mt-7 flex max-w-md flex-wrap justify-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[#16414b] bg-[#082630] px-3 py-2 text-xs text-[#91aab2]">
              <CheckCircle2 size={14} className="text-[#13d6b5]" />
              Configuración sencilla
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[#16414b] bg-[#082630] px-3 py-2 text-xs text-[#91aab2]">
              <CheckCircle2 size={14} className="text-[#13d6b5]" />
              Todo en un solo lugar
            </div>
          </div>

          {/* Boton */}
          <Link
            href="/businesses/new"
            className="group mx-auto mt-8 flex w-fit items-center justify-center gap-2 rounded-lg bg-[#08b89d] px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(8,184,157,0.15)] transition-all duration-300 hover:bg-[#0cc9ab] hover:shadow-[0_8px_30px_rgba(8,184,157,0.30)]"
          >
            Crear mi negocio
            <ArrowRight
              size={17}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>

          <p className="mt-4 text-xs text-[#56737c]">
            Solo necesitas algunos datos para comenzar.
          </p>
        </div>
      </div>
    </div>
  );
}
