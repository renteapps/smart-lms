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
>;

export type PlatformAssistantGetResponse = {
  config: PlatformAssistantPublicConfig;
  conversation: AssistantConversation | null;
};

export type PlatformAssistantPostResponse = {
  conversationId: string;
  userMessage: AssistantMessage;
  assistantMessage: AssistantMessage;
};
