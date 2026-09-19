"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium"
        >
          Correo electrónico
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="correo@ejemplo.com"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium"
        >
          Contraseña
        </label>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 outline-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-white p-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}