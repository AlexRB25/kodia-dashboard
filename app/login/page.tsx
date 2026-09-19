import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <section className="w-full max-w-md">
        <header>
          <h1 className="text-4xl font-bold">
            Kodia
          </h1>

          <p className="mt-2 text-gray-400">
            Inicia sesión para administrar tus negocios.
          </p>
        </header>

        <LoginForm />
      </section>
    </main>
  );
}