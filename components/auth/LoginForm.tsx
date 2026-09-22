"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from "lucide-react";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/businesses");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {loading && <LoadingOverlay />}

      {/* Correo */}
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-[#dce8eb]"
        >
          Correo electrónico
        </label>

        <div className="group relative">
          <Mail
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#68858e] transition-colors group-focus-within:text-[#13d6b5]"
          />

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full rounded-lg border border-[#17424c] bg-[#061f29] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-200 placeholder:text-[#56737c] hover:border-[#24606b] focus:border-[#13d6b5]/70 focus:shadow-[0_0_0_3px_rgba(19,214,181,0.08)]"
          />
        </div>
      </div>

      {/* Contraseña */}
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-[#dce8eb]"
        >
          Contraseña
        </label>

        <div className="group relative">
          <LockKeyhole
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#68858e] transition-colors group-focus-within:text-[#13d6b5]"
          />

          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-[#17424c] bg-[#061f29] py-3 pl-11 pr-12 text-sm text-white outline-none transition-all duration-200 placeholder:text-[#56737c] hover:border-[#24606b] focus:border-[#13d6b5]/70 focus:shadow-[0_0_0_3px_rgba(19,214,181,0.08)]"
          />

          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md p-1.5 text-[#68858e] transition-colors hover:bg-[#0b3039] hover:text-[#13d6b5]"
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Botón */}
      <button
        type="submit"
        disabled={loading}
        className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#08b89d] px-4 py-3 font-semibold text-white shadow-[0_6px_20px_rgba(8,184,157,0.15)] transition-all duration-300 hover:bg-[#0cc9ab] hover:shadow-[0_8px_30px_rgba(8,184,157,0.30)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Ingresando...
          </>
        ) : (
          <>
            Iniciar sesión
            <LogIn
              size={17}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </>
        )}
      </button>
    </form>
  );
}
