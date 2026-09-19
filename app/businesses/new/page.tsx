import { redirect } from "next/navigation";
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
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <p className="text-sm text-gray-400">
          Mis negocios / Nuevo negocio
        </p>

        <h1 className="mt-4 text-3xl font-bold">
          Crear negocio
        </h1>

        <p className="mt-2 text-sm text-gray-400">
          Configura la información básica de tu negocio.
        </p>

        <CreateBusinessForm />
      </div>
    </main>
  );
}