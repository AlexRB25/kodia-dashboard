import RegisterForm from "@/components/auth/RegisterForm";
import Image from "next/image";
import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Store,
} from "lucide-react";

export default function RegisterPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#031c26] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-6 lg:flex-row lg:px-10">
        {/* Lado izquierdo */}
        <section className="relative flex flex-1 flex-col justify-between py-8 lg:py-12">
          {/* Brillo decorativo */}
          <div className="pointer-events-none absolute left-[15%] top-[35%] h-72 w-72 rounded-full bg-[#13d6b5]/[0.03] blur-3xl" />

          {/* Logo */}
          <div className="relative z-10">
            <Link href="/" className="inline-block">
              <Image
                src="/kodia-logo.png"
                alt="K-odia"
                width={180}
                height={55}
                priority
                className="h-auto w-[150px]"
              />
            </Link>
          </div>

          {/* Contenido */}
          <div className="relative z-10 my-16 max-w-xl lg:my-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#13d6b5]/20 bg-[#062b35] px-4 py-2 text-sm text-[#59dac7] shadow-[0_0_25px_rgba(19,214,181,0.05)]">
              <Sparkles size={15} />
              Empieza a organizar tu negocio
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Lleva tu negocio
              <br />
              <span className="text-[#13d6b5]">al siguiente nivel.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[#91aab2] sm:text-lg">
              Crea tu cuenta y comienza a centralizar tus canales, clientes,
              conversaciones y herramientas en K-odia.
            </p>

            {/* Beneficios */}
            <div className="mt-9 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/10 text-[#13d6b5]">
                  <Store size={17} />
                </div>

                <div>
                  <p className="text-sm font-semibold">Centraliza tu negocio</p>
                  <p className="text-xs text-[#78939c]">
                    Administra canales y herramientas desde un solo lugar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/10 text-[#13d6b5]">
                  <Bot size={17} />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Inteligencia artificial
                  </p>
                  <p className="text-xs text-[#78939c]">
                    Automatiza atención, tareas y procesos.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/10 text-[#13d6b5]">
                  <MessageCircle size={17} />
                </div>

                <div>
                  <p className="text-sm font-semibold">Conecta tus canales</p>
                  <p className="text-xs text-[#78939c]">
                    Mantén tus conversaciones y clientes organizados.
                  </p>
                </div>
              </div>
            </div>

            {/* Mini indicadores */}
            <div className="mt-10 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full border border-[#16414b] bg-[#082630] px-3 py-2 text-xs text-[#91aab2]">
                <CheckCircle2 size={14} className="text-[#13d6b5]" />
                Configuración sencilla
              </div>

              <div className="flex items-center gap-2 rounded-full border border-[#16414b] bg-[#082630] px-3 py-2 text-xs text-[#91aab2]">
                <ShoppingBag size={14} className="text-[#13d6b5]" />
                Múltiples canales
              </div>
            </div>
          </div>

          <p className="relative z-10 hidden text-xs text-[#56737c] lg:block">
            © 2026 K-odia. Todos los derechos reservados.
          </p>
        </section>

        {/* Lado derecho */}
        <section className="flex w-full items-center justify-center pb-12 lg:w-[520px] lg:py-12">
          <div className="w-full max-w-md rounded-2xl border border-[#17424c] bg-[#082630] p-7 shadow-2xl shadow-black/20 sm:p-9">
            <div className="mb-7">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#13d6b5]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#13d6b5] opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#13d6b5]" />
                </span>
                Comienza con K-odia
              </div>

              <h2 className="text-3xl font-bold tracking-tight">
                Crea tu cuenta
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#8ca4ac]">
                Regístrate para comenzar a administrar tu negocio.
              </p>
            </div>

            {/* Aquí pondremos el formulario */}
            <RegisterForm />

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#17424c]" />

              <span className="text-xs text-[#68858e]">
                ¿Ya tienes una cuenta?
              </span>

              <div className="h-px flex-1 bg-[#17424c]" />
            </div>

            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-lg border border-[#24606b] px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:border-[#13d6b5]/70 hover:bg-[#0a3039] hover:shadow-[0_0_20px_rgba(19,214,181,0.08)]"
            >
              Iniciar sesión
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
