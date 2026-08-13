export type AgentCategory = 'Comunicação' | 'Liderança' | 'Pessoas' | 'Carreira' | 'Estudo';

export type AgentStatus = 'Disponível' | 'Beta' | 'Em manutenção';

/**
 * Chave visual do agente. O mapa de ícone e tom vive na camada de componentes
 * para que o dado continue serializável — estes registros são criados no admin
 * e um dia virão de uma API.
 */
export type AgentAvatarKey =
  | 'feedback'
  | 'contratacao'
  | 'simulacao'
  | 'tutor'
  | 'rotina'
  | 'um-a-um'
  | 'carreira'
  | 'apresentacao';

/** Sugestão de primeira mensagem, exibida enquanto a conversa está vazia. */
export interface AgentStarter {
  id: string;
  /** Texto curto do botão. */
  label: string;
  /** Mensagem realmente enviada ao agente. */
  message: string;
}

/** Resposta roteirizada pelo admin, escolhida por palavras-chave. */
export interface AgentScriptedReply {
  id: string;
  keywords: string[];
  text: string;
}

export interface Agent {
  id: string;
  /** Segmento da URL em /agentes/[slug]. */
  slug: string;
  name: string;
  role: string;
  description: string;
  category: AgentCategory;
  status: AgentStatus;
  avatar: AgentAvatarKey;
  /** Quem publicou o agente e de qual curso ele nasceu. */
  createdBy: string;
  courseTitle: string;
  skills: string[];
  conversationsCount: number;
  rating: number;
  /** Duração típica de uma conversa, em minutos. */
  avgMinutes: number;
  greeting: string;
  starters: AgentStarter[];
  replies: AgentScriptedReply[];
  /** Usadas quando nada casa: devolvem a conversa ao aluno em vez de inventar. */
  fallbacks: string[];
  /** Só preenchido quando o agente está fora do ar. */
  unavailableNote?: string;
}

export type AgentMessageAuthor = 'student' | 'agent';

export interface AgentMessage {
  id: string;
  author: AgentMessageAuthor;
  text: string;
}

/** Uma thread com um agente. O aluno pode ter várias com o mesmo agente. */
export interface AgentConversation {
  id: string;
  agentId: string;
  /** Derivado da primeira mensagem do aluno. */
  title: string;
  messages: AgentMessage[];
  createdAt: string;
  updatedAt: string;
}
