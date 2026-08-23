export const ASSISTANT_ICON_KEYS = [
  "sparkles",
  "bot",
  "message",
  "brain",
  "graduation",
  "headset",
] as const;

export type AssistantIconKey = (typeof ASSISTANT_ICON_KEYS)[number];
export type AssistantAvatarType = "icon" | "photo";

export type AssistantScope =
  | { kind: "platform" }
  | { kind: "course"; courseId: string; lessonId?: string };

/**
 * Modo de conhecimento escolhido no /admin/chat.
 *
 * - `course_strict`: dentro de um curso o agente só enxerga aquele curso.
 * - `adaptive`: dentro de um curso o curso vem primeiro, mas ele pode
 *   complementar com o resto da plataforma quando a pergunta sai do curso.
 * - `platform_always`: conhecimento global em qualquer tela, com o curso
 *   aberto apenas priorizado.
 */
export const ASSISTANT_KNOWLEDGE_MODES = ["course_strict", "adaptive", "platform_always"] as const;
export type AssistantKnowledgeMode = (typeof ASSISTANT_KNOWLEDGE_MODES)[number];

export const ASSISTANT_SOURCE_KEYS = [
  "manual",
  "courses",
  "lessons",
  "transcriptions",
  "articles",
  "plans",
  "pilulas",
] as const;
export type AssistantSourceKey = (typeof ASSISTANT_SOURCE_KEYS)[number];
export type AssistantKnowledgeSources = Record<AssistantSourceKey, boolean>;

export const DEFAULT_ASSISTANT_SOURCES: AssistantKnowledgeSources = {
  manual: true,
  courses: true,
  lessons: true,
  transcriptions: true,
  articles: true,
  plans: true,
  pilulas: true,
};

/** Exceção por curso: substitui o modo global quando o chat é aberto nele. */
export type AssistantCourseRule = {
  courseId: string;
  courseTitle: string;
  knowledgeMode: AssistantKnowledgeMode;
};

/**
 * O que o agente pode alcançar nesta conversa, já resolvido no servidor.
 *
 * `course_first` é o adaptativo dentro de um curso: o curso domina o contexto
 * e a plataforma entra como complemento.
 */
export type AssistantReach = "course" | "course_first" | "platform";

/**
 * Traduz modo + tela em alcance.
 *
 * Fora de um curso não existe "curso atual" para restringir, então qualquer
 * modo alcança a plataforma — é o que o admin espera ao abrir o chat na home
 * ou na trilha. Servidor e sticker usam esta mesma função para o rótulo nunca
 * prometer um alcance diferente do que o backend aplica.
 */
export function reachFor(mode: AssistantKnowledgeMode, kind: "platform" | "course"): AssistantReach {
  if (kind === "platform") return "platform";
  if (mode === "course_strict") return "course";
  if (mode === "platform_always") return "platform";
  return "course_first";
}

export type AssistantMessage = {
  id: string;
  author: "user" | "assistant";
  content: string;
  model?: string;
  usage?: { promptTokens: number; completionTokens: number };
  contextSources?: Array<{ id: string; kind: string; title: string; characters: number }>;
  createdAt: string;
};

export type AssistantConversation = {
  id: string;
  userId: string;
  scope: "platform" | "course";
  contextKey: string;
  courseId?: string;
  courseTitle?: string;
  lastLessonId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Última limpeza feita pelo aluno: o que veio antes só existe para o admin. */
  clearedAt?: string;
  studentName?: string;
  studentEmail?: string;
  messages: AssistantMessage[];
};

export type PlatformAssistantSettings = {
  id: 1;
  enabled: boolean;
  displayName: string;
  avatarType: AssistantAvatarType;
  iconKey: AssistantIconKey;
  avatarUrl?: string;
  primaryColor: string;
  welcomeMessage: string;
  systemPrompt: string;
  model: string;
  platformKnowledge: string;
  knowledgeMode: AssistantKnowledgeMode;
  knowledgeSources: AssistantKnowledgeSources;
  updatedAt: string;
};

export type PlatformAssistantPublicConfig = Pick<
  PlatformAssistantSettings,
  | "enabled"
  | "displayName"
  | "avatarType"
  | "iconKey"
  | "avatarUrl"
  | "primaryColor"
  | "welcomeMessage"
  | "knowledgeMode"
>;

export type PlatformAssistantGetResponse = {
  config: PlatformAssistantPublicConfig;
  conversation: AssistantConversation | null;
  /** Alcance real desta conversa, já considerando a exceção do curso. */
  reach: AssistantReach;
  /** Saldo de créditos de IA do aluno, ou `null` quando indisponível. */
  credits: number | null;
};

export type PlatformAssistantClearResponse = {
  cleared: true;
};

export type PlatformAssistantConfigResponse = {
  config: PlatformAssistantPublicConfig;
};

export type PlatformAssistantPostResponse = {
  conversationId: string;
  userMessage: AssistantMessage;
  assistantMessage: AssistantMessage;
  creditsCharged: number;
  creditsRemaining: number;
};
