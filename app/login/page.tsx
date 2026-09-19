import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import {
  Bot,
  CalendarDays,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from "lucide-react";

export default function LoginPage() {
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

          {/* Mensaje principal */}
          <div className="relative z-10 my-16 max-w-xl lg:my-0">
            {/* Badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#13d6b5]/20 bg-[#062b35] px-4 py-2 text-sm text-[#59dac7] shadow-[0_0_25px_rgba(19,214,181,0.05)]">
              <Sparkles size={15} className="text-[#13d6b5]" />
              <span>Inteligencia para hacer crecer tu negocio</span>
            </div>

            {/* Título */}
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Tu negocio.
              <br />
              <span className="text-[#13d6b5]">Todo en un solo lugar.</span>
            </h1>

            {/* Descripción */}
            <p className="mt-6 max-w-xl text-base leading-7 text-[#91aab2] sm:text-lg">
              Centraliza tus canales de venta, conversaciones, clientes y
              herramientas de trabajo. K-odia te ayuda a organizar y automatizar
              tu negocio con inteligencia artificial.
            </p>

            {/* Tarjetas */}
            <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3">
              {/* Canales y ventas */}
              <div className="group rounded-xl border border-[#16414b] bg-[#082630]/90 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#13d6b5]/50 hover:bg-[#0a3039] hover:shadow-[0_8px_30px_rgba(19,214,181,0.10)]">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/10 text-[#13d6b5] transition-all duration-300 group-hover:border-[#13d6b5]/40 group-hover:shadow-[0_0_18px_rgba(19,214,181,0.22)]">
                    <Store size={19} />
                  </div>

                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#16414b] bg-[#061f29] text-[#7dded0]">
                    <ShoppingBag size={13} />
                  </div>

                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#16414b] bg-[#061f29] text-[#7dded0]">
                    <MessageCircle size={13} />
                  </div>
                </div>

                <p className="text-sm font-semibold">Canales y ventas</p>

                <p className="mt-1 text-xs leading-5 text-[#78939c]">
                  Gestiona tus canales desde un solo lugar.
                </p>
              </div>

              {/* IA */}
              <div className="group rounded-xl border border-[#16414b] bg-[#082630]/90 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#13d6b5]/50 hover:bg-[#0a3039] hover:shadow-[0_8px_30px_rgba(19,214,181,0.10)]">
                <div className="mb-4 flex items-center gap-2">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/10 text-[#13d6b5] transition-all duration-300 group-hover:border-[#13d6b5]/40 group-hover:shadow-[0_0_18px_rgba(19,214,181,0.25)]">
                    <Bot size={20} />

                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#13d6b5] opacity-30" />
                      <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[#082630] bg-[#13d6b5]" />
                    </span>
                  </div>

                  <Sparkles
                    size={16}
                    className="text-[#13d6b5]/70 transition group-hover:text-[#13d6b5]"
                  />
                </div>

                <p className="text-sm font-semibold">IA integrada</p>

                <p className="mt-1 text-xs leading-5 text-[#78939c]">
                  Automatiza atención, tareas y procesos.
                </p>
              </div>

              {/* Clientes y agenda */}
              <div className="group rounded-xl border border-[#16414b] bg-[#082630]/90 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#13d6b5]/50 hover:bg-[#0a3039] hover:shadow-[0_8px_30px_rgba(19,214,181,0.10)]">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/10 text-[#13d6b5] transition-all duration-300 group-hover:border-[#13d6b5]/40 group-hover:shadow-[0_0_18px_rgba(19,214,181,0.22)]">
                    <Users size={19} />
                  </div>

                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#16414b] bg-[#061f29] text-[#7dded0]">
                    <CalendarDays size={13} />
                  </div>
                </div>

                <p className="text-sm font-semibold">Clientes y agenda</p>

                <p className="mt-1 text-xs leading-5 text-[#78939c]">
                  Organiza clientes, citas y seguimiento.
                </p>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <p className="relative z-10 hidden text-xs text-[#56737c] lg:block">
            © 2026 K-odia. Todos los derechos reservados.
          </p>
        </section>

        {/* Lado derecho */}
        <section className="flex w-full items-center justify-center pb-12 lg:w-[520px] lg:py-12">
          <div className="w-full max-w-md rounded-2xl border border-[#17424c] bg-[#082630] p-7 shadow-2xl shadow-black/20 sm:p-9">
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#13d6b5]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#13d6b5] opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#13d6b5]" />
                </span>
                Bienvenido de nuevo
              </div>

              <h2 className="text-3xl font-bold tracking-tight">
                Inicia sesión
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#8ca4ac]">
                Ingresa a tu cuenta para administrar tus negocios desde K-odia.
              </p>
            </div>

            <LoginForm />

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#17424c]" />

              <span className="text-xs text-[#68858e]">¿Nuevo en K-odia?</span>

              <div className="h-px flex-1 bg-[#17424c]" />
            </div>

            <Link
              href="/register"
              className="flex w-full items-center justify-center rounded-lg border border-[#24606b] px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:border-[#13d6b5]/70 hover:bg-[#0a3039] hover:shadow-[0_0_20px_rgba(19,214,181,0.08)]"
            >
              Crear una cuenta
            </Link>

            <p className="mt-7 text-center text-xs leading-5 text-[#68858e]">
              Al continuar aceptas nuestros términos de servicio y política de
              privacidad.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
