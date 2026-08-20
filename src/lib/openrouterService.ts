import {
  OpenRouterConfig,
  OpenRouterKeyInfo,
  OpenRouterLog,
  OpenRouterModel,
  OpenRouterChatPayload,
  OpenRouterChatResponse,
  OpenRouterStatus,
} from "@/types/openrouter";
import { createAdminClient } from "@/lib/supabase/admin";

const OPENROUTER_CONFIG_KEY = "@smartlms:openrouter_config";
const OPENROUTER_LOGS_KEY = "@smartlms:openrouter_logs";

export const CURATED_OPENROUTER_MODELS: OpenRouterModel[] = [
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    description: "Modelo multimodal de última geração do Google. Extremamente rápido, contextualização massiva de 1M de tokens e excelente custo-benefício.",
    contextLength: 1048576,
    badge: "Mais Rápido & Econômico",
    badgeTone: "success",
    speed: "Muito alta",
    reasoning: "Excelente",
    pricing: {
      promptPerMillion: 0.1,
      completionPerMillion: 0.4,
    },
    recommendedFor: "Tutores em tempo real, correção de exercícios e diálogos com alto volume.",
    isPopular: true,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Referência da indústria em didática, escrita humanizada, empatia pedagógica e raciocínio complexo estruturado.",
    contextLength: 200000,
    badge: "Melhor Didática & Escrita",
    badgeTone: "accent",
    speed: "Alta",
    reasoning: "Excepcional",
    pricing: {
      promptPerMillion: 3.0,
      completionPerMillion: 15.0,
    },
    recommendedFor: "Mentores de carreira, simulações avançadas e feedbacks profundos.",
    isPopular: true,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Modelo topo de linha da OpenAI com precisão máxima para resolução de problemas multidisciplinares e raciocínio lógico.",
    contextLength: 128000,
    badge: "Alta Precisão Multidisciplinar",
    badgeTone: "accent",
    speed: "Alta",
    reasoning: "Excelente",
    pricing: {
      promptPerMillion: 2.5,
      completionPerMillion: 10.0,
    },
    recommendedFor: "Análises críticas, estruturação de cursos e avaliações de código.",
    isPopular: true,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Versão compacta e ágil do GPT-4o. Alta velocidade com custo extremamente acessível para tarefas rotineiras.",
    contextLength: 128000,
    badge: "Ultra Rápido OpenAI",
    badgeTone: "success",
    speed: "Muito alta",
    reasoning: "Boa",
    pricing: {
      promptPerMillion: 0.15,
      completionPerMillion: 0.6,
    },
    recommendedFor: "Interações rápidas, resumos de aulas e chatbots de dúvidas frequentes.",
    isPopular: true,
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    description: "Modelo de raciocínio profundo de código aberto comparável aos melhores modelos de benchmark com cadeia de pensamento explícita.",
    contextLength: 64000,
    badge: "Raciocínio & Lógica Pura",
    badgeTone: "warning",
    speed: "Média",
    reasoning: "Excepcional",
    pricing: {
      promptPerMillion: 0.55,
      completionPerMillion: 2.19,
    },
    recommendedFor: "Matemática, lógica, resolução de desafios técnicos e análises passo a passo.",
    isPopular: true,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    provider: "Meta",
    description: "O modelo open-weights topo de linha da Meta. Excelente desempenho geral com forte adesão a instruções e tom natural.",
    contextLength: 131072,
    badge: "Open Source de Elite",
    badgeTone: "default",
    speed: "Alta",
    reasoning: "Excelente",
    pricing: {
      promptPerMillion: 0.12,
      completionPerMillion: 0.3,
    },
    recommendedFor: "Conversações flexíveis, resumos e geração de roteiros de estudo.",
    isPopular: true,
  },
  {
    id: "mistralai/mistral-large-2411",
    name: "Mistral Large",
    provider: "Mistral",
    description: "Modelo insignia da francesa Mistral AI. Excelente fluência multilíngue e aderência a instruções rígidas.",
    contextLength: 128000,
    badge: "Multilíngue Avançado",
    badgeTone: "default",
    speed: "Alta",
    reasoning: "Excelente",
    pricing: {
      promptPerMillion: 2.0,
      completionPerMillion: 6.0,
    },
    recommendedFor: "Cursos em múltiplos idiomas e traduções conceituais.",
    isPopular: false,
  },
];

export const DEFAULT_OPENROUTER_CONFIG: OpenRouterConfig = {
  apiKey: "",
  enabled: true,
  defaultModel: "google/gemini-2.0-flash-001",
  siteUrl: typeof window !== "undefined" ? window.location.origin : "https://smartlms.app",
  siteName: "Smart LMS",
  temperature: 0.7,
  maxTokens: 1500,
  status: "disconnected",
  updatedAt: new Date().toISOString(),
};

// In-memory cache for server-side execution
let serverConfig: OpenRouterConfig = { ...DEFAULT_OPENROUTER_CONFIG };
let serverLogs: OpenRouterLog[] = [];

export function getOpenRouterConfig(): OpenRouterConfig {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(OPENROUTER_CONFIG_KEY);
      if (stored) {
        return { ...DEFAULT_OPENROUTER_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Erro ao ler configuração do OpenRouter do localStorage:", e);
    }
  }

  // Check server environment variables
  if (process.env.OPENROUTER_API_KEY) {
    return {
      ...serverConfig,
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || serverConfig.defaultModel,
      status: "connected",
    };
  }

  return serverConfig;
}

/**
 * Configuração real para o backend atender alunos: a chave nunca mora só no
 * localStorage do navegador do admin (isso nunca chegaria ao servidor). Ela
 * vem da tabela `integrations` (RLS restrita a admin, lida aqui com o client
 * de serviço) e cai para a env var como último recurso.
 */
export async function getOpenRouterServerConfig(): Promise<OpenRouterConfig> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("integrations")
      .select("enabled, config, secrets, status")
      .eq("slug", "openrouter")
      .maybeSingle();

    const storedConfig = (data?.config ?? {}) as Partial<OpenRouterConfig>;
    const apiKey = ((data?.secrets as { apiKey?: string } | null)?.apiKey ?? "").trim();

    return {
      ...DEFAULT_OPENROUTER_CONFIG,
      ...storedConfig,
      apiKey: apiKey || process.env.OPENROUTER_API_KEY || "",
      enabled: data ? Boolean(data.enabled) : Boolean(process.env.OPENROUTER_API_KEY),
      status:
        (data?.status as OpenRouterStatus | undefined) ??
        (process.env.OPENROUTER_API_KEY ? "connected" : "disconnected"),
    };
  } catch (e) {
    console.error("Erro ao carregar configuração do OpenRouter do Supabase:", e);
    return {
      ...DEFAULT_OPENROUTER_CONFIG,
      apiKey: process.env.OPENROUTER_API_KEY || "",
      enabled: Boolean(process.env.OPENROUTER_API_KEY),
    };
  }
}

export function saveOpenRouterConfig(config: Partial<OpenRouterConfig>): OpenRouterConfig {
  const current = getOpenRouterConfig();
  const updated: OpenRouterConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(OPENROUTER_CONFIG_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao salvar configuração do OpenRouter no localStorage:", e);
    }
  }

  serverConfig = updated;
  return updated;
}

/**
 * Valida a chave de API do OpenRouter consultando a rota /api/v1/auth/key.
 */
export async function validateOpenRouterKey(apiKey: string): Promise<{
  valid: boolean;
  message: string;
  keyInfo?: OpenRouterKeyInfo;
}> {
  const keyToTest = apiKey?.trim();
  if (!keyToTest) {
    return {
      valid: false,
      message: "Chave de API vazia. Insira uma chave OpenRouter válida (iniciando em sk-or-v1-).",
    };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${keyToTest}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      const keyData = data.data;

      const keyInfo: OpenRouterKeyInfo = {
        label: keyData?.label || "Chave OpenRouter",
        usage: typeof keyData?.usage === "number" ? keyData.usage : 0,
        limit: typeof keyData?.limit === "number" ? keyData.limit : null,
        isFreeTier: Boolean(keyData?.is_free_tier),
        rateLimit: keyData?.rate_limit
          ? {
              requests: keyData.rate_limit.requests,
              interval: keyData.rate_limit.interval,
            }
          : undefined,
      };

      return {
        valid: true,
        message: "Chave do OpenRouter autenticada com sucesso!",
        keyInfo,
      };
    } else if (response.status === 401) {
      return {
        valid: false,
        message: "Chave de API inválida ou revogada. Verifique suas chaves no painel do OpenRouter.",
      };
    } else if (response.status === 429) {
      return {
        valid: false,
        message: "Limite de requisições atingido no OpenRouter. Tente novamente mais tarde.",
      };
    } else {
      const err = await response.json().catch(() => ({}));
      return {
        valid: false,
        message: err?.error?.message || `Falha na verificação da chave (Status ${response.status}).`,
      };
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Erro de conexão";
    return {
      valid: false,
      message: `Não foi possível conectar aos servidores do OpenRouter: ${errorMsg}`,
    };
  }
}

/**
 * Consulta a lista de modelos disponíveis na API do OpenRouter.
 */
export async function fetchOpenRouterModels(apiKey?: string): Promise<OpenRouterModel[]> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      return CURATED_OPENROUTER_MODELS;
    }

    const data = await res.json();
    if (!Array.isArray(data.data)) {
      return CURATED_OPENROUTER_MODELS;
    }

    // Merge or format remote models
    const curatedIds = new Set(CURATED_OPENROUTER_MODELS.map((m) => m.id));
    const remoteModels: OpenRouterModel[] = data.data
      .filter((m: { id: string }) => !curatedIds.has(m.id))
      .slice(0, 30) // limit extra models for fast performance
      .map((m: { id: string; name?: string; description?: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }) => {
        let provider: OpenRouterModel["provider"] = "Outro";
        if (m.id.startsWith("openai/")) provider = "OpenAI";
        else if (m.id.startsWith("anthropic/")) provider = "Anthropic";
        else if (m.id.startsWith("google/")) provider = "Google";
        else if (m.id.startsWith("deepseek/")) provider = "DeepSeek";
        else if (m.id.startsWith("meta-llama/")) provider = "Meta";
        else if (m.id.startsWith("mistralai/")) provider = "Mistral";

        const promptPrice = m.pricing?.prompt ? parseFloat(m.pricing.prompt) * 1000000 : 0;
        const compPrice = m.pricing?.completion ? parseFloat(m.pricing.completion) * 1000000 : 0;

        return {
          id: m.id,
          name: m.name || m.id,
          provider,
          description: m.description || "Modelo de inteligência artificial via OpenRouter.",
          contextLength: m.context_length || 32000,
          speed: "Alta" as const,
          reasoning: "Boa" as const,
          pricing: {
            promptPerMillion: Math.round(promptPrice * 100) / 100,
            completionPerMillion: Math.round(compPrice * 100) / 100,
          },
        };
      });

    return [...CURATED_OPENROUTER_MODELS, ...remoteModels];
  } catch (e) {
    console.error("Erro ao buscar modelos do OpenRouter:", e);
    return CURATED_OPENROUTER_MODELS;
  }
}

/**
 * Envia uma mensagem para o OpenRouter e gera a resposta via Chat Completions.
 */
export async function sendOpenRouterChatCompletion(
  payload: OpenRouterChatPayload,
  configOverride?: Partial<OpenRouterConfig>
): Promise<OpenRouterChatResponse> {
  const config = { ...getOpenRouterConfig(), ...configOverride };
  const startTime = Date.now();

  const apiKey = config.apiKey?.trim();
  const model = payload.model || config.defaultModel || "google/gemini-2.0-flash-001";
  const temperature = typeof payload.temperature === "number" ? payload.temperature : config.temperature ?? 0.7;
  const maxTokens = payload.maxTokens || config.maxTokens || 1500;

  const userPromptPreview =
    payload.messages.filter((m) => m.role === "user").pop()?.content || "Mensagem de teste";

  // Se não há chave configurada ou está desativado, retorna simulação com aviso claro
  if (!apiKey || !config.enabled) {
    const latencyMs = 350;
    const simulatedText = `[Modo Simulado OpenRouter] Esta é uma resposta de demonstração usando o modelo ${model}. Para respostas reais com os modelos de IA mais avançados do mundo, adicione sua chave de API nas configurações de Integração do OpenRouter.`;

    const simulatedResponse: OpenRouterChatResponse = {
      success: true,
      text: simulatedText,
      model,
      usage: {
        promptTokens: 42,
        completionTokens: 38,
        totalTokens: 80,
      },
      latencyMs,
      simulated: true,
    };

    addOpenRouterLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      model,
      promptTokens: 42,
      completionTokens: 38,
      totalTokens: 80,
      latencyMs,
      status: "success",
      userPromptPreview,
      responsePreview: simulatedText,
      source: (payload.agentId ? "agent" : "sandbox") as OpenRouterLog["source"],
    });

    return simulatedResponse;
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.siteUrl || "https://smartlms.app",
      "X-Title": config.siteName || "Smart LMS",
    };

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: payload.messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errorMsg =
        errData?.error?.message ||
        `Erro ${res.status}: ${res.statusText || "Falha na requisição ao OpenRouter"}`;

      addOpenRouterLog({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs,
        status: "error",
        error: errorMsg,
        userPromptPreview,
        responsePreview: "",
        source: (payload.agentId ? "agent" : "sandbox") as OpenRouterLog["source"],
      });

      return {
        success: false,
        error: errorMsg,
        latencyMs,
      };
    }

    const data = await res.json();
    const messageContent = data.choices?.[0]?.message?.content || "";
    const usage = {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    };

    addOpenRouterLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      model: data.model || model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      latencyMs,
      status: "success",
      userPromptPreview,
      responsePreview: messageContent.slice(0, 160),
      source: (payload.agentId ? "agent" : "sandbox") as OpenRouterLog["source"],
    });

    return {
      success: true,
      text: messageContent,
      model: data.model || model,
      usage,
      latencyMs,
    };
  } catch (error: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : "Erro ao enviar requisição para o OpenRouter.";

    addOpenRouterLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs,
      status: "error",
      error: errorMsg,
      userPromptPreview,
      responsePreview: "",
      source: (payload.agentId ? "agent" : "sandbox") as OpenRouterLog["source"],
    });

    return {
      success: false,
      error: errorMsg,
      latencyMs,
    };
  }
}

export function getOpenRouterLogs(): OpenRouterLog[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(OPENROUTER_LOGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Erro ao ler logs do OpenRouter:", e);
    }
  }
  return serverLogs;
}

export function addOpenRouterLog(log: OpenRouterLog): void {
  const current = getOpenRouterLogs();
  const updated = [log, ...current].slice(0, 100); // keep last 100 logs

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(OPENROUTER_LOGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao salvar log do OpenRouter:", e);
    }
  }

  serverLogs = updated;
}

export function clearOpenRouterLogs(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(OPENROUTER_LOGS_KEY);
    } catch (e) {
      console.error("Erro ao limpar logs do OpenRouter:", e);
    }
  }
  serverLogs = [];
}
