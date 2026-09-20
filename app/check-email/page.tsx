import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function CheckEmailPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#031c26] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-6 lg:px-10">
        {/* Logo */}
        <header className="py-8 lg:py-12">
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
        </header>

        {/* Contenido */}
        <section className="relative flex flex-1 items-center justify-center pb-24">
          {/* Brillo de fondo */}
          <div className="pointer-events-none absolute h-80 w-80 rounded-full bg-[#13d6b5]/[0.05] blur-3xl" />

          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[#17424c] bg-[#082630] p-8 text-center shadow-2xl shadow-black/20 sm:p-10">
            {/* Icono correo */}
            <div className="relative mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#13d6b5]/20 bg-[#13d6b5]/10 text-[#13d6b5] shadow-[0_0_30px_rgba(19,214,181,0.10)]">
              <Mail size={36} strokeWidth={1.8} />

              <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-4 border-[#082630] bg-[#13d6b5] text-[#031c26]">
                <CheckCircle2 size={16} strokeWidth={3} />
              </span>
            </div>

            {/* Badge */}
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#13d6b5]/20 bg-[#061f29] px-3 py-1.5 text-xs font-medium text-[#59dac7]">
              <Sparkles size={13} />
              Un paso más
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Revisa tu correo
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#91aab2] sm:text-base">
              Te enviamos un enlace para confirmar tu dirección de correo
              electrónico y activar tu cuenta de K-odia.
            </p>

            {/* Instrucción */}
            <div className="mt-7 rounded-xl border border-[#16414b] bg-[#061f29] p-5 text-left">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#13d6b5]/10 text-[#13d6b5]">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Confirma tu cuenta
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#78939c]">
                    Abre el correo de K-odia y presiona el enlace de
                    confirmación. Después podrás iniciar sesión.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-xs leading-5 text-[#68858e]">
              Si no encuentras el mensaje, revisa también tu carpeta de spam o
              correo no deseado.
            </p>

            {/* Volver al login */}
            <Link
              href="/login"
              className="group mt-7 flex w-full items-center justify-center gap-2 rounded-lg border border-[#24606b] px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:border-[#13d6b5]/70 hover:bg-[#0a3039] hover:shadow-[0_0_20px_rgba(19,214,181,0.08)]"
            >
              <ArrowLeft
                size={16}
                className="transition-transform duration-200 group-hover:-translate-x-0.5"
              />
              Volver a iniciar sesión
            </Link>
          </div>
        </section>

        <footer className="pb-8 text-center text-xs text-[#56737c]">
          © 2026 K-odia. Todos los derechos reservados.
        </footer>
      </div>
    </main>
  );
}
