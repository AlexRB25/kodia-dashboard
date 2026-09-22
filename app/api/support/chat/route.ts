import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  runSupportAgent,
  SupportAgentError,
  type HistoryMessage,
} from "@/lib/support/agent";

// El agente puede encadenar varias herramientas antes de responder
export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 2000;
const MAX_USER_MESSAGES_PER_HOUR = 30;
const HISTORY_MESSAGES = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  // 1. Entrada
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return fail(400, "Solicitud inválida.");
  }

  const input = (typeof body === "object" && body !== null ? body : {}) as Record<
    string,
    unknown
  >;

  const businessId = typeof input.businessId === "string" ? input.businessId : "";
  const conversationId =
    typeof input.conversationId === "string" ? input.conversationId : null;
  const message = typeof input.message === "string" ? input.message.trim() : "";

  if (!UUID_PATTERN.test(businessId) || (conversationId && !UUID_PATTERN.test(conversationId))) {
    return fail(400, "Solicitud inválida.");
  }

  if (message.length === 0) {
    return fail(400, "Escribe un mensaje.");
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return fail(400, `El mensaje no puede pasar de ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  // 2. Configuración del servidor
  if (!process.env.ANTHROPIC_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Support chat: faltan ANTHROPIC_API_KEY o SUPABASE_SERVICE_ROLE_KEY");
    return fail(503, "El asistente de soporte todavía no está disponible.");
  }

  // 3. Sesión y membresía (con la sesión del usuario, bajo RLS)
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return fail(401, "Tu sesión no es válida. Inicia sesión nuevamente.");
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return fail(403, "No tienes acceso a este negocio.");
  }

  // 4. Límite de mensajes por usuario
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: recentCount } = await supabase
    .from("support_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "user")
    .gte("created_at", oneHourAgo);

  if ((recentCount ?? 0) >= MAX_USER_MESSAGES_PER_HOUR) {
    return fail(429, "Has enviado muchos mensajes. Inténtalo de nuevo en un rato.");
  }

  const admin = createAdminClient();

  // 5. Conversación: existente (del usuario y de este negocio) o nueva
  let activeConversationId = conversationId;
  let createdConversation = false;

  if (activeConversationId) {
    const { data: existing } = await supabase
      .from("support_conversations")
      .select("id")
      .eq("id", activeConversationId)
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return fail(404, "No se encontró la conversación.");
    }
  } else {
    const { data: created, error: createError } = await admin
      .from("support_conversations")
      .insert({ business_id: businessId, user_id: user.id })
      .select("id")
      .single();

    if (createError || !created) {
      console.error("Support chat: no se pudo crear la conversación:", createError);
      return fail(500, "No se pudo iniciar la conversación.");
    }

    activeConversationId = created.id as string;
    createdConversation = true;
  }

  const conversation = activeConversationId as string;

  // 6. Historial previo (los últimos mensajes, en orden cronológico)
  const { data: historyRows } = await supabase
    .from("support_messages")
    .select("role, content")
    .eq("conversation_id", conversation)
    .order("created_at", { ascending: false })
    .limit(HISTORY_MESSAGES);

  const history: HistoryMessage[] = (historyRows ?? [])
    .reverse()
    .flatMap((row) =>
      row.role === "user" || row.role === "assistant"
        ? [{ role: row.role as "user" | "assistant", content: row.content as string }]
        : [],
    );

  // 7. Se guarda el mensaje del usuario antes de correr el agente, para que la
  //    transcripción de un ticket lo incluya
  const { data: savedUserMessage, error: saveError } = await admin
    .from("support_messages")
    .insert({
      conversation_id: conversation,
      user_id: user.id,
      role: "user",
      content: message,
    })
    .select("id")
    .single();

  if (saveError || !savedUserMessage) {
    console.error("Support chat: no se pudo guardar el mensaje:", saveError);
    return fail(500, "No se pudo enviar el mensaje. Inténtalo de nuevo.");
  }

  // 8. Agente
  try {
    const result = await runSupportAgent(
      {
        supabase,
        admin,
        userId: user.id,
        userEmail: user.email ?? null,
        businessId,
        conversationId: conversation,
      },
      message,
      history,
    );

    const { error: replyError } = await admin.from("support_messages").insert({
      conversation_id: conversation,
      user_id: user.id,
      role: "assistant",
      content: result.reply.slice(0, 8000),
    });

    if (replyError) {
      console.error("Support chat: no se pudo guardar la respuesta:", replyError);
    }

    await admin
      .from("support_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation);

    return NextResponse.json({
      conversationId: conversation,
      reply: result.reply,
      ticketNumbers: result.ticketNumbers,
    });
  } catch (error) {
    // El intento no cuenta: se retira el mensaje para que el usuario pueda reenviarlo
    await admin.from("support_messages").delete().eq("id", savedUserMessage.id);

    if (createdConversation) {
      await admin.from("support_conversations").delete().eq("id", conversation);
    }

    if (error instanceof SupportAgentError) {
      console.error("Support chat:", error.message);
      return fail(error.status, error.userMessage);
    }

    console.error("Support chat: error inesperado:", error);
    return fail(500, "No se pudo procesar tu mensaje. Inténtalo de nuevo.");
  }
}
