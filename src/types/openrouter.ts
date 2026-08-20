export type OpenRouterStatus = "connected" | "invalid_key" | "disconnected" | "rate_limited";

export interface OpenRouterKeyInfo {
  label: string;
  usage: number; // in USD
  limit: number | null; // in USD (null if unlimited)
  isFreeTier: boolean;
  rateLimit?: {
    requests: number;
    interval: string;
  };
}

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: "OpenAI" | "Anthropic" | "Google" | "DeepSeek" | "Meta" | "Mistral" | "Outro";
  description: string;
  contextLength: number; // e.g. 128000
  badge?: string;
  badgeTone?: "accent" | "success" | "warning" | "default";
  speed: "Muito alta" | "Alta" | "Média";
  reasoning: "Excepcional" | "Excelente" | "Boa" | "Básica";
  pricing: {
    promptPerMillion: number; // USD per 1M tokens
    completionPerMillion: number; // USD per 1M tokens
  };
  recommendedFor?: string;
  isPopular?: boolean;
}

export interface OpenRouterConfig {
  apiKey: string;
  enabled: boolean;
  defaultModel: string;
  siteUrl: string;
  siteName: string;
  temperature: number;
  maxTokens: number;
  status: OpenRouterStatus;
  keyInfo?: OpenRouterKeyInfo;
  updatedAt: string;
}

export interface OpenRouterChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterChatPayload {
  model?: string;
  messages: OpenRouterChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  agentId?: string;
  agentName?: string;
}

export interface OpenRouterChatResponse {
  success: boolean;
  text?: string;
  model?: string;
  generationId?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd?: number;
    upstreamCostUsd?: number;
    reasoningTokens?: number;
    cachedTokens?: number;
  };
  latencyMs?: number;
  error?: string;
  simulated?: boolean;
}

export interface OpenRouterLog {
  id: string;
  timestamp: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: "success" | "error";
  error?: string;
  userPromptPreview: string;
  responsePreview: string;
  source: "agent" | "sandbox" | "automation" | "tutor";
}
