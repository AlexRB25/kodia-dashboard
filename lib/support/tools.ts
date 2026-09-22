import type { SupabaseClient } from "@supabase/supabase-js";

import { searchHelpArticles } from "./help-articles";
import { notifyTicketCreated } from "./notify";

/**
 * Contexto de una petición de soporte. Todo viene de la sesión y de la base de
 * datos, NUNCA de lo que escriba el usuario o devuelva el modelo: el modelo no
 * puede elegir a qué negocio ni a qué usuario pertenece un ticket.
 */
export type SupportContext = {
  /** Sesión del usuario: las lecturas pasan por RLS. */
  supabase: SupabaseClient;
  /** service_role: solo para escribir tickets y mensajes. */
  admin: SupabaseClient;
  userId: string;
  userEmail: string | null;
  businessId: string;
  conversationId: string;
};

export type ToolResult = {
  content: string;
  isError?: boolean;
  ticketNumber?: number;
};

export const TICKET_CATEGORIES = [
  "integrations",
  "billing",
  "credits",
  "account",
  "bug",
  "feature_request",
  "other",
] as const;

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const OPEN_STATUSES = ["open", "in_progress", "waiting_user"];
const MAX_OPEN_TICKETS = 5;
const TRANSCRIPT_MESSAGES = 30;

/** Definiciones que se envían al modelo. */
export const supportTools = [
  {
    name: "search_help_articles",
    description:
      "Busca en la base de ayuda de Kodia. Úsala ANTES de responder cualquier pregunta sobre cómo funciona el producto. Devuelve hasta 3 artículos; solo puedes afirmar sobre el producto lo que digan.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Palabras clave del problema o pregunta, en español.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_business_diagnostics",
    description:
      "Devuelve el estado real del negocio del usuario: datos del negocio, estado de cada integración, plan y saldo de créditos. Solo lectura. Úsala cuando el problema pueda depender del estado de su cuenta (una integración con error, un límite, créditos).",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "list_my_open_tickets",
    description:
      "Lista los tickets abiertos del usuario en este negocio. Úsala ANTES de crear un ticket, para no duplicar uno que ya cubre el mismo tema.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "create_ticket",
    description:
      "Crea un ticket para que el equipo humano lo atienda. UN SOLO TEMA por ticket: si el usuario tiene varios problemas distintos, crea un ticket por cada uno. Úsala solo cuando no puedes resolverlo con las otras herramientas o cuando el caso requiere aprobación, revisión o un cambio que solo el equipo puede hacer. El resumen debe bastar para que el equipo actúe sin volver a preguntar al usuario. El estado del negocio y la conversación se adjuntan automáticamente: no los copies.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: [...TICKET_CATEGORIES],
          description: "Categoría del único tema del ticket.",
        },
        subject: {
          type: "string",
          description: "Asunto breve y concreto (5 a 140 caracteres).",
        },
        summary: {
          type: "string",
          description:
            "Qué pasa, cuándo empezó, qué espera el usuario y qué datos concretos dio (mensajes de error exactos, nombres de tienda, pasos). 10 a 4000 caracteres.",
        },
        steps_tried: {
          type: "string",
          description: "Qué ya intentaste o comprobaste tú y el usuario, y el resultado.",
        },
        priority: {
          type: "string",
          enum: [...TICKET_PRIORITIES],
          description:
            "urgent solo si el negocio no puede operar; high si una función clave falla; normal por defecto; low para dudas o solicitudes.",
        },
        requires_approval: {
          type: "boolean",
          description:
            "true si la solución exige una aprobación o cambio en la cuenta que solo el equipo puede hacer (plan, límites, permisos, reembolsos, borrado de datos).",
        },
      },
      required: ["category", "subject", "summary", "priority", "requires_approval"],
    },
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

function failure(message: string): ToolResult {
  return { content: json({ error: message }), isError: true };
}

// ---------------------------------------------------------------------------
// Diagnóstico del negocio (lecturas con la sesión del usuario: pasan por RLS)
// ---------------------------------------------------------------------------

async function loadDiagnostics(ctx: SupportContext) {
  const { data: business, error: businessError } = await ctx.supabase
    .from("businesses")
    .select("id, account_id, name, business_type, status, country, currency, timezone")
    .eq("id", ctx.businessId)
    .maybeSingle();

  if (businessError || !business) {
    return null;
  }

  const [integrations, subscription, balance] = await Promise.all([
    ctx.supabase
      .from("business_integrations")
      .select("provider, status, external_account_name, updated_at")
      .eq("business_id", ctx.businessId),
    ctx.supabase
      .from("subscriptions")
      .select("plan_code, status, current_period_end, cancel_at_period_end")
      .eq("account_id", business.account_id)
      .maybeSingle(),
    ctx.supabase
      .from("credit_balances")
      .select("plan_credits, permanent_credits, plan_credits_expire_at")
      .eq("account_id", business.account_id)
      .maybeSingle(),
  ]);

  return {
    business: {
      id: business.id,
      name: business.name,
      type: business.business_type,
      status: business.status,
      country: business.country,
      currency: business.currency,
      timezone: business.timezone,
    },
    integrations: integrations.data ?? [],
    plan: subscription.data ?? null,
    credits: balance.data ?? null,
  };
}

// ---------------------------------------------------------------------------
// Ejecutores
// ---------------------------------------------------------------------------

async function searchHelp(input: unknown): Promise<ToolResult> {
  const query = isRecord(input) && typeof input.query === "string" ? input.query : "";

  if (query.trim().length < 2) {
    return failure("Falta la consulta de búsqueda.");
  }

  const articles = searchHelpArticles(query).map((article) => ({
    title: article.title,
    content: article.body,
  }));

  return {
    content: json(
      articles.length > 0
        ? { articles }
        : { articles: [], note: "No hay artículos sobre esto en la base de ayuda." },
    ),
  };
}

async function getDiagnostics(ctx: SupportContext): Promise<ToolResult> {
  const diagnostics = await loadDiagnostics(ctx);

  if (!diagnostics) {
    return failure("No se pudo leer el estado del negocio.");
  }

  return { content: json(diagnostics) };
}

async function listOpenTickets(ctx: SupportContext): Promise<ToolResult> {
  const { data, error } = await ctx.admin
    .from("support_tickets")
    .select("number, category, subject, status, created_at")
    .eq("created_by", ctx.userId)
    .eq("business_id", ctx.businessId)
    .in("status", OPEN_STATUSES)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error listing support tickets:", error);
    return failure("No se pudieron consultar los tickets.");
  }

  return { content: json({ open_tickets: data ?? [] }) };
}

async function createTicket(ctx: SupportContext, input: unknown): Promise<ToolResult> {
  if (!isRecord(input)) {
    return failure("Datos del ticket inválidos.");
  }

  const category = input.category;
  const priority = input.priority;
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const stepsTried =
    typeof input.steps_tried === "string" && input.steps_tried.trim()
      ? input.steps_tried.trim().slice(0, 4000)
      : null;
  const requiresApproval = input.requires_approval === true;

  if (!TICKET_CATEGORIES.includes(category as (typeof TICKET_CATEGORIES)[number])) {
    return failure("Categoría inválida.");
  }

  if (!TICKET_PRIORITIES.includes(priority as (typeof TICKET_PRIORITIES)[number])) {
    return failure("Prioridad inválida.");
  }

  if (subject.length < 5 || subject.length > 140) {
    return failure("El asunto debe tener entre 5 y 140 caracteres.");
  }

  if (summary.length < 10 || summary.length > 4000) {
    return failure("El resumen debe tener entre 10 y 4000 caracteres.");
  }

  // Tope de tickets abiertos por usuario y negocio (evita spam)
  const { count, error: countError } = await ctx.admin
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("created_by", ctx.userId)
    .eq("business_id", ctx.businessId)
    .in("status", OPEN_STATUSES);

  if (countError) {
    console.error("Error counting support tickets:", countError);
    return failure("No se pudo crear el ticket en este momento.");
  }

  if ((count ?? 0) >= MAX_OPEN_TICKETS) {
    return failure(
      `El usuario ya tiene ${MAX_OPEN_TICKETS} tickets abiertos. Pídele que espere respuesta del equipo antes de abrir otro.`,
    );
  }

  // Transcripción y diagnóstico los adjunta el servidor, no el modelo
  const [diagnostics, transcript] = await Promise.all([
    loadDiagnostics(ctx),
    ctx.admin
      .from("support_messages")
      .select("role, content, created_at")
      .eq("conversation_id", ctx.conversationId)
      .order("created_at", { ascending: false })
      .limit(TRANSCRIPT_MESSAGES),
  ]);

  const { data: ticket, error: insertError } = await ctx.admin
    .from("support_tickets")
    .insert({
      business_id: ctx.businessId,
      created_by: ctx.userId,
      conversation_id: ctx.conversationId,
      category,
      subject,
      summary,
      steps_tried: stepsTried,
      priority,
      requires_approval: requiresApproval,
      diagnostics: diagnostics ?? {},
      transcript: (transcript.data ?? []).reverse(),
    })
    .select("id, number")
    .single();

  if (insertError || !ticket) {
    console.error("Error creating support ticket:", insertError);
    return failure("No se pudo crear el ticket en este momento.");
  }

  // Aviso al equipo: mejor esfuerzo; el ticket ya está guardado
  const notification = await notifyTicketCreated({
    number: ticket.number,
    subject,
    summary,
    category: category as string,
    priority: priority as string,
    requiresApproval,
    businessId: ctx.businessId,
    businessName: diagnostics?.business.name ?? "desconocido",
    userEmail: ctx.userEmail,
  });

  await ctx.admin
    .from("support_tickets")
    .update(
      notification.ok
        ? { notified_at: new Date().toISOString(), notification_error: null }
        : { notification_error: notification.error },
    )
    .eq("id", ticket.id);

  if (!notification.ok) {
    console.error("Support ticket notification failed:", notification.error);
  }

  return {
    content: json({
      created: true,
      ticket_number: ticket.number,
      note: "Ticket creado. El equipo de Kodia lo revisará.",
    }),
    ticketNumber: ticket.number,
  };
}

export async function executeSupportTool(
  name: string,
  input: unknown,
  ctx: SupportContext,
): Promise<ToolResult> {
  try {
    switch (name) {
      case "search_help_articles":
        return await searchHelp(input);
      case "get_business_diagnostics":
        return await getDiagnostics(ctx);
      case "list_my_open_tickets":
        return await listOpenTickets(ctx);
      case "create_ticket":
        return await createTicket(ctx, input);
      default:
        return failure(`Herramienta desconocida: ${name}`);
    }
  } catch (error) {
    console.error(`Support tool ${name} failed:`, error);
    return failure("La herramienta falló. Continúa sin ella.");
  }
}
