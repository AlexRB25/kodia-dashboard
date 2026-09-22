/**
 * Aviso al equipo cuando se crea un ticket.
 *
 * Hoy solo Discord (webhook entrante). Es "mejor esfuerzo": si falla, el ticket
 * ya está guardado en la base de datos y el error queda en el propio ticket.
 * Para añadir ClickUp u otro canal, agrega otra función y llámala desde
 * `notifyTicketCreated`.
 */

export type TicketNotification = {
  number: number;
  subject: string;
  summary: string;
  category: string;
  priority: string;
  requiresApproval: boolean;
  businessId: string;
  businessName: string;
  userEmail: string | null;
};

export type NotifyResult = { ok: true } | { ok: false; error: string };

const PRIORITY_COLORS: Record<string, number> = {
  low: 0x64748b,
  normal: 0x3b82f6,
  high: 0xf59e0b,
  urgent: 0xef4444,
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function sendToDiscord(ticket: TicketNotification): Promise<NotifyResult> {
  const webhookUrl = process.env.SUPPORT_DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return { ok: false, error: "SUPPORT_DISCORD_WEBHOOK_URL no está configurada" };
  }

  const body = {
    username: "Kodia Soporte",
    // El texto del ticket lo escribe un usuario: que nunca pueda mencionar a
    // @everyone ni a roles del servidor.
    allowed_mentions: { parse: [] as string[] },
    embeds: [
      {
        title: truncate(`Ticket #${ticket.number} · ${ticket.subject}`, 250),
        description: truncate(ticket.summary, 1800),
        color: PRIORITY_COLORS[ticket.priority] ?? PRIORITY_COLORS.normal,
        fields: [
          { name: "Categoría", value: truncate(ticket.category, 100), inline: true },
          { name: "Prioridad", value: truncate(ticket.priority, 100), inline: true },
          {
            name: "Requiere aprobación",
            value: ticket.requiresApproval ? "Sí" : "No",
            inline: true,
          },
          {
            name: "Negocio",
            value: truncate(`${ticket.businessName}\n${ticket.businessId}`, 1000),
          },
          { name: "Usuario", value: truncate(ticket.userEmail ?? "desconocido", 200) },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { ok: false, error: `Discord respondió ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error desconocido al avisar a Discord",
    };
  }
}

export async function notifyTicketCreated(
  ticket: TicketNotification,
): Promise<NotifyResult> {
  return sendToDiscord(ticket);
}
