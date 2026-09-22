import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import SupportChat from "./SupportChat";

// El agente puede encadenar varias herramientas antes de responder
export const maxDuration = 60;

type SupportPageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

const statusLabels: Record<string, string> = {
  open: "Abierto",
  in_progress: "En revisión",
  waiting_user: "Esperando tu respuesta",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const categoryLabels: Record<string, string> = {
  integrations: "Integraciones",
  billing: "Facturación",
  credits: "Créditos",
  account: "Cuenta",
  bug: "Error",
  feature_request: "Solicitud de función",
  other: "Otro",
};

export default async function SupportPage({ params }: SupportPageProps) {
  const { businessId } = await params;
  const supabase = await createClient();

  // 1. Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Membresía, última conversación y tickets: consultas independientes
  const [
    { data: membership, error: membershipError },
    { data: conversation },
    { data: tickets },
  ] = await Promise.all([
    supabase
      .from("business_members")
      .select("business_id")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("support_conversations")
      .select("id")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("support_tickets")
      .select("id, number, subject, category, status, created_at")
      .eq("business_id", businessId)
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (membershipError) {
    console.error("Error checking membership:", membershipError);
  }

  // 3. El usuario debe pertenecer al negocio
  if (!membership) {
    notFound();
  }

  const { data: storedMessages } = conversation
    ? await supabase
        .from("support_messages")
        .select("role, content")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(100)
    : { data: [] };

  const initialMessages = (storedMessages ?? []).flatMap((message) =>
    message.role === "user" || message.role === "assistant"
      ? [{ role: message.role as "user" | "assistant", content: message.content as string }]
      : [],
  );

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto w-full max-w-[900px]">
        <header className="border-b border-[#17424c] pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Soporte</h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8ca4ab]">
            Cuéntanos tu problema. El asistente intenta resolverlo y, si hace falta,
            abre un ticket para el equipo de Kodia con todo lo necesario.
          </p>
        </header>

        <section className="mt-8">
          <SupportChat
            businessId={businessId}
            initialConversationId={conversation?.id ?? null}
            initialMessages={initialMessages}
          />
        </section>

        <section className="mt-10 pb-10">
          <h2 className="text-lg font-semibold text-white">Mis tickets</h2>

          <p className="mt-1 text-sm text-[#68858e]">
            Cada ticket trata un solo tema.
          </p>

          {tickets && tickets.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {tickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className="flex flex-col gap-2 rounded-xl border border-[#17424c] bg-[#062630] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      #{ticket.number} · {ticket.subject}
                    </p>

                    <p className="mt-1 text-xs text-[#68858e]">
                      {categoryLabels[ticket.category] ?? ticket.category} ·{" "}
                      {new Date(ticket.created_at).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-[#13d6b5]/25 bg-[#13d6b5]/5 px-3 py-1 text-xs font-medium text-[#13d6b5]">
                    {statusLabels[ticket.status] ?? ticket.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-[#17424c] bg-[#062630] px-6 py-10 text-center">
              <p className="text-sm text-[#68858e]">Aún no has abierto ningún ticket.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
