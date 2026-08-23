export const AGENT_MESSAGE_MAX_CHARS = 4_000;

export type AgentChatRequest = {
  agentId: string;
  conversationId: string | null;
  message: string;
  /** Regenera a última resposta do agente em vez de enviar uma nova pergunta. */
  regenerate?: boolean;
  /** Edita esta mensagem do aluno, descarta tudo depois dela e reenvia. */
  editMessageId?: string;
};

type UnknownChatBody = {
  agentId?: unknown;
  conversationId?: unknown;
  message?: unknown;
  messages?: unknown;
  regenerate?: unknown;
  editMessageId?: unknown;
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
  const regenerate = body.regenerate === true;
  const editMessageId = typeof body.editMessageId === "string" ? body.editMessageId : undefined;

  if (!agentId) throw new Error("Agente é obrigatório.");
  if (regenerate) {
    if (!conversationId) throw new Error("Conversa é obrigatória para regenerar uma resposta.");
    return { agentId, conversationId, message: "", regenerate: true };
  }
  if (!message) throw new Error("Agente e mensagem são obrigatórios.");
  if (message.length > AGENT_MESSAGE_MAX_CHARS) {
    throw new Error(`A mensagem deve ter no máximo ${AGENT_MESSAGE_MAX_CHARS.toLocaleString("pt-BR")} caracteres.`);
  }
  if (editMessageId && !conversationId) throw new Error("Conversa é obrigatória para editar uma mensagem.");
  return { agentId, conversationId, message, editMessageId };
}
