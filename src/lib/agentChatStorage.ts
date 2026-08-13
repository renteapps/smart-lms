import { AgentConversation } from '@/types/agente';

export const AGENT_CHAT_STORAGE_KEY = '@smartlms:agent-chats:v1';

const MAX_TITLE_LENGTH = 52;

/**
 * Título da thread a partir da primeira mensagem do aluno — o mesmo contrato do
 * ChatGPT e do Claude: quem nomeia a conversa é a pergunta, não o aluno.
 */
export function deriveConversationTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Nova conversa';
  if (clean.length <= MAX_TITLE_LENGTH) return clean;

  const cut = clean.slice(0, MAX_TITLE_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  // Corta na palavra inteira quando sobra texto suficiente; senão, corta seco.
  return `${(lastSpace > MAX_TITLE_LENGTH * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function isConversation(value: unknown): value is AgentConversation {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<AgentConversation>;
  return (
    typeof item.id === 'string' &&
    typeof item.agentId === 'string' &&
    typeof item.title === 'string' &&
    Array.isArray(item.messages)
  );
}

export function readAgentConversations(): AgentConversation[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(AGENT_CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const conversations = (parsed as { conversations?: unknown })?.conversations;
    if (!Array.isArray(conversations)) return [];
    return conversations.filter(isConversation);
  } catch {
    // Histórico corrompido não pode impedir o aluno de conversar de novo.
    return [];
  }
}

export function saveAgentConversations(conversations: AgentConversation[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      AGENT_CHAT_STORAGE_KEY,
      JSON.stringify({ formatVersion: 1, conversations }),
    );
  } catch {
    // Cota cheia ou armazenamento bloqueado: a conversa segue viva em memória.
  }
}
