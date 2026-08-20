export type AgentChatRequest = {
  agentId: string;
  conversationId: string | null;
  message: string;
};

type UnknownChatBody = {
  agentId?: unknown;
  conversationId?: unknown;
  message?: unknown;
  messages?: unknown;
};

/** Aceita o wire shape novo e, temporariamente, o histórico legado. */
export function parseAgentChatRequest(input: unknown): AgentChatRequest {
  const body = (input && typeof input === "object" ? input : {}) as UnknownChatBody;
  const legacyMessages = Array.isArray(body.messages) ? body.messages : [];
  const legacyMessage = [...legacyMessages].reverse().find((item) =>
    item && typeof item === "object" && (item as { role?: unknown }).role === "user",
  ) as { content?: unknown } | undefined;
  const rawMessage = typeof body.message === "string" ? body.message : legacyMessage?.content;
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  const agentId = typeof body.agentId === "string" ? body.agentId : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;

  if (!agentId || !message) throw new Error("Agente e mensagem são obrigatórios.");
  if (message.length > 4_000) throw new Error("A mensagem deve ter no máximo 4.000 caracteres.");
  return { agentId, conversationId, message };
}
