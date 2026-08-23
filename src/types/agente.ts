export type AgentCategory = 'Comunicação' | 'Liderança' | 'Pessoas' | 'Carreira' | 'Estudo';

export type AgentStatus = 'Disponível' | 'Beta' | 'Em manutenção';

/**
 * Chave visual do agente. O mapa de ícone e tom vive na camada de componentes
 * para que o dado continue serializável — estes registros são criados no admin
 * e um dia virão de uma API.
 */
export type AgentAvatarKey =
  | 'padrao'
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

export interface AgentFile {
  id: string;
  name: string;
  url: string;
  /** Tamanho em bytes, exibido no card do arquivo. */
  sizeBytes?: number;
  /** Caminho dentro do bucket de storage — necessário para apagar o objeto. */
  storagePath?: string;
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
  /** Cor personalizada do agente (hex) */
  themeColor?: string;
  /** Código SVG do ícone personalizado */
  iconSvg?: string;
  /** URL da foto de perfil personalizada do agente */
  photoUrl?: string;
  /** Quem publicou o agente e de qual curso ele nasceu. */
  createdBy: string;
  courseTitle: string;
  courseId?: string;
  /** IDs dos cursos vinculados ao agente. */
  courseIds?: string[];
  /** Nomes dos cursos vinculados ao agente. */
  courseTitles?: string[];
  /** IDs dos planos de assinatura vinculados ao agente. */
  planIds?: string[];
  /** Nomes dos planos de assinatura vinculados ao agente. */
  planNames?: string[];
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
  /** Instruções do sistema (Prompt) para a IA (Generativa) */
  systemPrompt?: string;
  /** Modelo de IA escolhido (ex: gpt-4o, claude-3-5-sonnet) */
  aiModel?: string;
  /** Contexto adicional para a IA (Ementa, regras, histórico) */
  context?: string;
  /** Arquivos para a IA consultar */
  files?: AgentFile[];
}

/** Dados seguros e suficientes para catálogo/workspace no navegador. */
export type AgentCatalogItem = Omit<
  Agent,
  'replies' | 'fallbacks' | 'files' | 'systemPrompt' | 'aiModel' | 'context'
>;

/**
 * O que o admin escreve no formulário. As métricas de uso ficam de fora: quem
 * as move é a conversa do aluno, nunca o formulário. Sem `id`, é uma criação.
 */
export type AgentFormPayload = Omit<Agent, 'id' | 'conversationsCount' | 'rating'> & { id?: string };

export type AgentMessageAuthor = 'student' | 'agent';
export type AgentMessageFeedback = 'up' | 'down';

export interface AgentMessage {
  id: string;
  author: AgentMessageAuthor;
  text: string;
  /** Avaliação do aluno sobre uma resposta do agente. Só se aplica a `author: 'agent'`. */
  feedback?: AgentMessageFeedback | null;
}

export type ConversationStatus = 'resolvida' | 'em_andamento' | 'atencao' | 'duvida_pedagogica';
export type ConversationSentiment = 'positivo' | 'neutro' | 'critico';

/** Uma thread com um agente. O aluno pode ter várias com o mesmo agente. */
export interface AgentConversation {
  id: string;
  agentId: string;
  /** Derivado da primeira mensagem do aluno. */
  title: string;
  messages: AgentMessage[];
  createdAt: string;
  updatedAt: string;
  /** Metadados de telemetria e suporte para alto volume */
  studentName?: string;
  studentEmail?: string;
  studentAvatar?: string;
  rating?: number;
  status?: ConversationStatus;
  sentiment?: ConversationSentiment;
  durationSeconds?: number;
  tokensUsed?: number;
  courseTitle?: string;
  lessonContext?: string;
  aiSummary?: string;
  /** Distingue um resumo paginado de uma thread cujo histórico já foi aberto. */
  messagesLoaded?: boolean;
  messageCount?: number;
}

export type AgentConversationSummary = Omit<AgentConversation, 'messages'> & {
  messages: [];
  messagesLoaded: false;
  messageCount: number;
};

export type AgentConversationPage = {
  items: AgentConversationSummary[];
  nextCursor: string | null;
};
