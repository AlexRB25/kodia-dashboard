"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Plus, Send } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  conversationId?: string;
  reply?: string;
  ticketNumbers?: number[];
  error?: string;
};

type SupportChatProps = {
  businessId: string;
  initialConversationId: string | null;
  initialMessages: ChatMessage[];
};

const MAX_MESSAGE_LENGTH = 2000;

export default function SupportChat({
  businessId,
  initialConversationId,
  initialMessages,
}: SupportChatProps) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function sendMessage() {
    const text = input.trim();

    if (!text || sending) {
      return;
    }

    setError(null);
    setInput("");
    setSending(true);
    setMessages((current) => [...current, { role: "user", content: text }]);

    // Si algo falla, el servidor no guarda nada: se deja el texto listo para reenviar
    function rollback(message: string) {
      setMessages((current) => current.slice(0, -1));
      setInput(text);
      setError(message);
    }

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, conversationId, message: text }),
      });

      const data: ChatResponse = await response.json().catch(() => ({}));

      if (!response.ok || !data.reply) {
        rollback(
          data.error ?? "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        );
        return;
      }

      const reply = data.reply;

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      setMessages((current) => [...current, { role: "assistant", content: reply }]);

      // Se creó un ticket: refresca la lista de tickets de la página
      if (data.ticketNumbers && data.ticketNumbers.length > 0) {
        router.refresh();
      }
    } catch {
      rollback("No hay conexión con el servidor. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function startNewConversation() {
    if (sending) {
      return;
    }

    setConversationId(null);
    setMessages([]);
    setError(null);
    setInput("");
  }

  return (
    <div className="flex h-[560px] flex-col rounded-xl border border-[#17424c] bg-[#062630]">
      {/* Encabezado del chat */}
      <div className="flex items-center justify-between gap-4 border-b border-[#17424c] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#13d6b5]/20 bg-[#13d6b5]/5 text-[#13d6b5]">
            <Bot size={18} />
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Asistente de soporte</p>
            <p className="text-xs text-[#68858e]">No consume tus créditos</p>
          </div>
        </div>

        <button
          type="button"
          onClick={startNewConversation}
          disabled={sending || messages.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#17424c] bg-[#061f29] px-3 py-1.5 text-xs font-medium text-[#b6cbd1] transition hover:border-[#13d6b5]/40 hover:text-[#13d6b5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} />
          Nueva conversación
        </button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-sm">
              <p className="text-sm font-medium text-[#c4d5da]">
                ¿En qué podemos ayudarte?
              </p>
              <p className="mt-1 text-xs leading-5 text-[#68858e]">
                Cuéntame tu problema o duda. Si necesita al equipo de Kodia, abro
                un ticket por ti. Cada ticket trata un solo tema.
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-4 py-2.5 text-sm leading-6 ${
                message.role === "user"
                  ? "bg-[#08b89d] text-white"
                  : "border border-[#17424c] bg-[#031c26] text-[#dce8eb]"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-xl border border-[#17424c] bg-[#031c26] px-4 py-2.5 text-sm text-[#68858e]">
              Escribiendo…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Entrada */}
      <div className="border-t border-[#17424c] px-5 py-4">
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={2}
            disabled={sending}
            placeholder="Escribe tu mensaje… (Enter para enviar, Shift+Enter para salto de línea)"
            className="min-h-[44px] flex-1 resize-none rounded-lg border border-[#17424c] bg-[#061f29] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-[#56737c] focus:border-[#13d6b5]/70 disabled:opacity-60"
          />

          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={sending || input.trim().length === 0}
            aria-label="Enviar mensaje"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#08b89d] text-white transition hover:bg-[#0cc9ab] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
