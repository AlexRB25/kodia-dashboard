import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CreateBusinessForm from "./components/CreateBusinessForm";

export default async function NewBusinessPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#031c26] text-white">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10 lg:py-12">
        {/* Logo */}
        <Link href="/businesses" className="inline-block">
          <Image
            src="/kodia-logo.png"
            alt="K-odia"
            width={180}
            height={55}
            priority
            className="h-auto w-[150px]"
          />
        </Link>

        <div className="mx-auto mt-12 w-full max-w-2xl">
          {/* Regresar */}
          <Link
            href="/businesses"
            className="group inline-flex items-center gap-2 text-sm text-[#78939c] transition-colors hover:text-[#13d6b5]"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />
            Mis negocios
          </Link>

          {/* Encabezado */}
          <div className="mt-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#13d6b5]/20 bg-[#062b35] px-3 py-1.5 text-xs font-medium text-[#59dac7]">
              <Sparkles size={13} />
              Configura tu espacio
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#13d6b5]/20 bg-[#13d6b5]/10 text-[#13d6b5]">
                <Building2 size={23} />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Crea tu negocio
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#91aab2]">
                  Cuéntanos un poco sobre tu negocio. Esta información nos
                  ayudará a preparar tu espacio de trabajo en K-odia.
                </p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="mt-9 rounded-2xl border border-[#17424c] bg-[#082630] p-6 shadow-2xl shadow-black/20 sm:p-8">
            <CreateBusinessForm />
          </div>

          <p className="mt-5 text-center text-xs text-[#56737c]">
            Podrás modificar esta información más adelante.
          </p>
        </div>
      </div>
    </main>
  );
}
