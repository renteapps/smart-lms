"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "sonner";
import {
  Sparkles,
  Key,
  Cpu,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Play,
  Send,
  ShieldCheck,
  Layers,
  Settings2,
  Activity,
  Info,
  Search,
  Sliders,
  Zap,
  BookOpen,
  Eye,
  EyeOff,
  Flame,
  CheckCheck,
  Bot,
  HelpCircle,
} from "lucide-react";
import {
  OpenRouterConfig,
  OpenRouterKeyInfo,
  OpenRouterLog,
  OpenRouterModel,
} from "@/types/openrouter";
import {
  CURATED_OPENROUTER_MODELS,
  DEFAULT_OPENROUTER_CONFIG,
  getOpenRouterConfig,
  saveOpenRouterConfig,
  getOpenRouterLogs,
  clearOpenRouterLogs,
} from "@/lib/openrouterService";

const SYSTEM_PROMPT_PRESETS = [
  {
    name: "Tutor Socrático & Didático",
    prompt:
      "Você é um tutor acadêmico no Smart LMS. Guie o aluno através de perguntas reflexivas e analogias claras, estimulando o pensamento crítico sem entregar a resposta imediatamente.",
  },
  {
    name: "Mentor de Carreira & Feedback",
    prompt:
      "Você é um mentor executivo no Smart LMS. Ajude o profissional a estruturar metas de carreira e feedbacks claros com empatia e direcionamento prático.",
  },
  {
    name: "Instrutor Técnico & Programação",
    prompt:
      "Você é um especialista sênior em desenvolvimento de software no Smart LMS. Forneça explicações técnicas precisas, boas práticas e exemplos de código limpos e modernos.",
  },
];

const USER_MESSAGE_PRESETS = [
  "Qual a diferença entre Next.js App Router e Pages Router? Explique para um desenvolvedor iniciante.",
  "Como posso dar um feedback construtivo para um liderado que está atrasando entregas?",
  "O que são View Transitions e como elas melhoram a experiência do usuário em aplicações web?",
];

export function OpenRouterIntegrationContent() {
  const [activeTab, setActiveTab] = useState<
    "credentials" | "catalog" | "sandbox" | "logs" | "guide"
  >("credentials");

  const [config, setConfig] = useState<OpenRouterConfig>(DEFAULT_OPENROUTER_CONFIG);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Models catalog state
  const [models, setModels] = useState<OpenRouterModel[]>(CURATED_OPENROUTER_MODELS);
  const [searchModel, setSearchModel] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Sandbox state
  const [sandboxModel, setSandboxModel] = useState("google/gemini-2.0-flash-001");
  const [sandboxSystemPrompt, setSandboxSystemPrompt] = useState(
    "Você é um tutor especialista de IA integrado ao Smart LMS. Seu papel é explicar conceitos complexos de forma didática, acolhedora e prática."
  );
  const [sandboxUserPrompt, setSandboxUserPrompt] = useState(
    "Olá! Como a inteligência artificial integrada ao Smart LMS pode acelerar a aprendizagem dos alunos?"
  );
  const [sandboxTemperature, setSandboxTemperature] = useState(0.7);
  const [sandboxMaxTokens, setSandboxMaxTokens] = useState(1500);
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<{
    text: string;
    model: string;
    latencyMs: number;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    simulated?: boolean;
    error?: string;
  } | null>(null);

  // Logs state
  const [logs, setLogs] = useState<OpenRouterLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<OpenRouterLog | null>(null);

  // Load initial data
  useEffect(() => {
    loadConfig();
    refreshLogs();
  }, []);

  const loadConfig = () => {
    const current = getOpenRouterConfig();
    setConfig(current);
    setApiKeyInput(current.apiKey || "");
    if (current.defaultModel) {
      setSandboxModel(current.defaultModel);
    }
  };

  const refreshLogs = () => {
    setLogs(getOpenRouterLogs());
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleValidateAndSave = async (forceKey?: string) => {
    const keyToValidate = forceKey !== undefined ? forceKey : apiKeyInput.trim();

    if (!keyToValidate) {
      const updated = saveOpenRouterConfig({
        apiKey: "",
        status: "disconnected",
        keyInfo: undefined,
      });
      setConfig(updated);
      toast.info("Chave removida. A integração está no modo de simulação.");
      return;
    }

    setIsValidatingKey(true);
    try {
      const res = await fetch("/api/admin/integracoes/openrouter/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate_key",
          apiKey: keyToValidate,
        }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        const updated = saveOpenRouterConfig({
          apiKey: keyToValidate,
          status: "connected",
          keyInfo: data.keyInfo,
        });
        setConfig(updated);
        toast.success("Autenticação com o OpenRouter realizada com sucesso!", {
          description: `Chave conectada (${data.keyInfo?.label || "OpenRouter"}).`,
        });
      } else {
        const updated = saveOpenRouterConfig({
          apiKey: keyToValidate,
          status: "invalid_key",
        });
        setConfig(updated);
        toast.error("Falha ao validar chave OpenRouter", {
          description: data.message || "Verifique se a chave está correta no painel do OpenRouter.",
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro de conexão";
      toast.error("Erro na validação", { description: msg });
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleSaveSettings = () => {
    setIsSaving(true);
    try {
      const updated = saveOpenRouterConfig({
        defaultModel: config.defaultModel,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        siteName: config.siteName,
        siteUrl: config.siteUrl,
        enabled: config.enabled,
      });
      setConfig(updated);
      toast.success("Configurações salvas com sucesso!");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchRemoteModels = async () => {
    setIsLoadingModels(true);
    try {
      const res = await fetch("/api/admin/integracoes/openrouter/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fetch_models",
          apiKey: config.apiKey,
        }),
      });

      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        setModels(data.models);
        toast.success(`Catálogo atualizado! ${data.models.length} modelos disponíveis.`);
      }
    } catch (e) {
      toast.error("Não foi possível carregar modelos remotos.");
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSetDefaultModel = (modelId: string) => {
    const updated = saveOpenRouterConfig({ defaultModel: modelId });
    setConfig(updated);
    setSandboxModel(modelId);
    toast.success("Modelo padrão atualizado!", {
      description: `${modelId} será usado como padrão para novos Agentes e Tutores.`,
    });
  };

  const handleRunSandbox = async () => {
    if (!sandboxUserPrompt.trim()) {
      toast.error("Digite uma mensagem de teste.");
      return;
    }

    setIsRunningSandbox(true);
    setSandboxResult(null);

    try {
      const res = await fetch("/api/admin/integracoes/openrouter/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat_test",
          apiKey: config.apiKey,
          model: sandboxModel,
          temperature: sandboxTemperature,
          maxTokens: sandboxMaxTokens,
          messages: [
            { role: "system", content: sandboxSystemPrompt },
            { role: "user", content: sandboxUserPrompt },
          ],
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSandboxResult({
          text: data.text,
          model: data.model,
          latencyMs: data.latencyMs,
          usage: data.usage,
          simulated: data.simulated,
        });
        refreshLogs();
        toast.success("Resposta gerada com sucesso!");
      } else {
        setSandboxResult({
          text: "",
          model: sandboxModel,
          latencyMs: data.latencyMs || 0,
          error: data.error || "Falha ao gerar resposta.",
        });
        refreshLogs();
        toast.error("Erro na geração do OpenRouter", {
          description: data.error,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Erro de comunicação", { description: msg });
    } finally {
      setIsRunningSandbox(false);
    }
  };

  const handleClearLogs = () => {
    clearOpenRouterLogs();
    setLogs([]);
    setSelectedLog(null);
    toast.success("Histórico de logs de IA limpo com sucesso!");
  };

  const filteredModels = models.filter((m) => {
    const matchesProvider =
      providerFilter === "all" || m.provider.toLowerCase() === providerFilter.toLowerCase();
    const query = searchModel.toLowerCase().trim();
    const matchesQuery =
      !query ||
      m.name.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query) ||
      m.provider.toLowerCase().includes(query);
    return matchesProvider && matchesQuery;
  });

  const providers = ["all", "Google", "Anthropic", "OpenAI", "DeepSeek", "Meta", "Mistral"];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <PageHeader
        eyebrow="Integrações & Inteligência Artificial"
        title="OpenRouter"
        description="Acesse os modelos de IA mais avançados do mundo (Claude 3.5, GPT-4o, Gemini 2.0, DeepSeek R1) com uma única chave de API unificada."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-surface-hover"
            >
              <Key className="size-3.5 text-accent" />
              Obter Chave OpenRouter
              <ExternalLink className="size-3 text-muted" />
            </a>
            <a
              href="https://openrouter.ai/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-surface-hover"
            >
              <BookOpen className="size-3.5 text-muted" />
              Documentação Oficial
              <ExternalLink className="size-3 text-muted" />
            </a>
          </div>
        }
      />

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Status da Integração</span>
            <span
              className={`size-2.5 rounded-full ${
                config.status === "connected"
                  ? "bg-success ring-4 ring-success/20 animate-pulse"
                  : config.status === "invalid_key"
                  ? "bg-danger ring-4 ring-danger/20"
                  : "bg-warning ring-4 ring-warning/20"
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">
              {config.status === "connected"
                ? "Conectado & Ativo"
                : config.status === "invalid_key"
                ? "Chave Inválida"
                : "Modo Demonstração"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {config.status === "connected"
              ? "Pronto para atender chamadas reais de IA"
              : "Respostas simuladas ativas"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Modelo Padrão</span>
            <Cpu className="size-4 text-accent" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-foreground truncate block">
              {config.defaultModel.split("/").pop() || "Gemini 2.0 Flash"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted truncate font-mono">
            {config.defaultModel}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Saldo / Limite</span>
            <Activity className="size-4 text-warning" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">
              {config.keyInfo?.limit !== null && config.keyInfo?.limit !== undefined
                ? `$${config.keyInfo.limit.toFixed(2)}`
                : config.status === "connected"
                ? "Ilimitado"
                : "Sandbox"}
            </span>
            {config.keyInfo?.usage !== undefined && (
              <span className="text-xs text-muted">
                (Uso: ${config.keyInfo.usage.toFixed(2)})
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {config.keyInfo?.isFreeTier ? "Nível Gratuito OpenRouter" : "Crédito Pré-pago"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Requisições Registradas</span>
            <Flame className="size-4 text-accent" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">{logs.length}</span>
            <span className="text-xs text-muted">chamadas</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Últimos registros de telemetria
          </p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
          {[
            { id: "credentials", label: "Credenciais & Conexão", icon: Key },
            { id: "catalog", label: "Catálogo de Modelos (Hub)", icon: Layers },
            { id: "sandbox", label: "Playground & Testes", icon: Play },
            { id: "logs", label: "Logs & Telemetria", icon: Activity },
            { id: "guide", label: "Guia Rápido", icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? "border-accent text-foreground font-semibold"
                    : "border-transparent text-muted hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className={`size-4 ${isActive ? "text-accent" : "text-muted"}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CREDENCIAIS & CONEXÃO */}
      {/* ========================================================================= */}
      {activeTab === "credentials" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-5 text-accent" />
                  Chave de API do OpenRouter
                </h3>
                <p className="text-xs text-muted mt-1">
                  Sua chave fornece acesso direto a OpenAI, Anthropic, Google, DeepSeek e dezenas de outros provedores com fatura única.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    config.status === "connected"
                      ? "bg-success-soft text-success-soft-foreground"
                      : "bg-surface-secondary text-muted"
                  }`}
                >
                  {config.status === "connected" ? (
                    <>
                      <CheckCheck className="size-3.5 text-success" />
                      Conectado
                    </>
                  ) : (
                    <>
                      <Info className="size-3.5" />
                      Desconectado
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  OpenRouter API Key
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition"
                      title={showApiKey ? "Ocultar" : "Mostrar"}
                    >
                      {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleValidateAndSave()}
                    disabled={isValidatingKey}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {isValidatingKey ? (
                      <>
                        <RotateCcw className="size-3.5 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3.5" />
                        Validar & Conectar
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-muted flex items-center gap-1.5">
                  <Info className="size-3.5 shrink-0" />
                  Gere sua chave gratuitamente no painel em{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-0.5"
                  >
                    openrouter.ai/keys <ExternalLink className="size-2.5" />
                  </a>
                </p>
              </div>

              {config.keyInfo && (
                <div className="rounded-xl border border-border bg-background-secondary p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-muted font-medium block">Rótulo da Chave:</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {config.keyInfo.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted font-medium block">Consumo Acumulado:</span>
                    <span className="font-semibold text-foreground mt-0.5 block font-mono">
                      ${config.keyInfo.usage.toFixed(4)} USD
                    </span>
                  </div>
                  <div>
                    <span className="text-muted font-medium block">Limite Definido:</span>
                    <span className="font-semibold text-foreground mt-0.5 block font-mono">
                      {config.keyInfo.limit !== null ? `$${config.keyInfo.limit} USD` : "Sem limite"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Configuration Parameters */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-4 border-b border-border">
              <Settings2 className="size-5 text-accent" />
              Parâmetros Globais de IA
            </h3>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Modelo Padrão */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Modelo Padrão da Plataforma
                </label>
                <select
                  value={config.defaultModel}
                  onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <optgroup label="Recomendados & Populares">
                    {CURATED_OPENROUTER_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider}) - {m.badge || "Recomendado"}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="mt-1.5 text-[11px] text-muted">
                  Utilizado caso um Agente de IA específico não tenha modelo customizado definido.
                </p>
              </div>

              {/* Ativação Global */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Status de Operação da IA
                </label>
                <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Habilitar chamadas do OpenRouter
                    </span>
                    <span className="text-[11px] text-muted block">
                      Quando ativo, os Agentes conversam usando os modelos de IA reais.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    className="size-5 rounded border-border text-accent focus:ring-accent"
                  />
                </div>
              </div>

              {/* Temperatura Padrão */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Temperatura Padrão: {config.temperature}
                  </label>
                  <span className="text-[10px] text-muted">
                    {config.temperature < 0.4
                      ? "Preciso & Objetivo"
                      : config.temperature > 0.8
                      ? "Criativo & Flexível"
                      : "Equilibrado"}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between text-[10px] text-muted mt-1">
                  <span>0.0 (Focado)</span>
                  <span>0.7 (Padrão)</span>
                  <span>1.5 (Criativo)</span>
                </div>
              </div>

              {/* Limite de Tokens */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Limite Máximo de Tokens por Resposta (Max Tokens)
                </label>
                <input
                  type="number"
                  min="256"
                  max="8192"
                  step="256"
                  value={config.maxTokens}
                  onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 1500 })}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <p className="mt-1.5 text-[11px] text-muted">
                  Aproximadamente 1.500 tokens equivalem a ~1.100 palavras em português.
                </p>
              </div>

              {/* HTTP-Referer (Ranking) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  URL da Aplicação (HTTP-Referer)
                </label>
                <input
                  type="text"
                  value={config.siteUrl}
                  onChange={(e) => setConfig({ ...config, siteUrl: e.target.value })}
                  placeholder="https://meusmartlms.com"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <p className="mt-1.5 text-[11px] text-muted">
                  Recomendado pelo OpenRouter para identificação nas métricas de ranking de apps.
                </p>
              </div>

              {/* X-Title */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Nome da Aplicação (X-Title)
                </label>
                <input
                  type="text"
                  value={config.siteName}
                  onChange={(e) => setConfig({ ...config, siteName: e.target.value })}
                  placeholder="Smart LMS"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <p className="mt-1.5 text-[11px] text-muted">
                  Nome exibido nos relatórios de telemetria do seu console OpenRouter.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition"
              >
                <Check className="size-4" />
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CATÁLOGO DE MODELOS */}
      {/* ========================================================================= */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
              <input
                type="text"
                placeholder="Buscar por nome, provedor ou capacidade..."
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted mr-1">Provedor:</span>
              {providers.map((p) => (
                <button
                  key={p}
                  onClick={() => setProviderFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    providerFilter === p
                      ? "bg-accent text-accent-foreground font-bold shadow-sm"
                      : "bg-surface-secondary text-muted hover:text-foreground"
                  }`}
                >
                  {p === "all" ? "Todos" : p}
                </button>
              ))}

              <button
                onClick={handleFetchRemoteModels}
                disabled={isLoadingModels}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground transition"
                title="Sincronizar novos modelos diretamente da API do OpenRouter"
              >
                <RotateCcw className={`size-3.5 ${isLoadingModels ? "animate-spin" : ""}`} />
                Atualizar Lista
              </button>
            </div>
          </div>

          {/* Model Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels.map((model) => {
              const isDefault = config.defaultModel === model.id;
              return (
                <div
                  key={model.id}
                  className={`rounded-2xl border bg-surface p-5 flex flex-col justify-between transition-all ${
                    isDefault
                      ? "border-accent ring-2 ring-accent/30 shadow-md"
                      : "border-border hover:border-accent/40 hover:shadow-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                          {model.provider}
                        </span>
                        <h4 className="text-base font-bold text-foreground mt-0.5">
                          {model.name}
                        </h4>
                      </div>

                      {model.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            model.badgeTone === "success"
                              ? "bg-success-soft text-success-soft-foreground"
                              : model.badgeTone === "accent"
                              ? "bg-accent-soft text-accent-soft-foreground"
                              : model.badgeTone === "warning"
                              ? "bg-warning-soft text-warning-soft-foreground"
                              : "bg-surface-secondary text-muted"
                          }`}
                        >
                          {model.badge}
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-muted line-clamp-3">
                      {model.description}
                    </p>

                    {model.recommendedFor && (
                      <div className="mt-3 rounded-lg bg-background-secondary p-2.5 text-[11px] text-muted">
                        <strong className="text-foreground">Ideal para:</strong> {model.recommendedFor}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/80 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-muted">
                      <div>
                        <span className="block text-[10px] text-muted/70">Contexto</span>
                        <span className="font-semibold text-foreground">
                          {model.contextLength >= 1000000
                            ? `${(model.contextLength / 1000000).toFixed(0)}M tokens`
                            : `${Math.round(model.contextLength / 1000)}k tokens`}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted/70">Velocidade</span>
                        <span className="font-semibold text-foreground">{model.speed}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted/70">Raciocínio</span>
                        <span className="font-semibold text-foreground">{model.reasoning}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted font-mono bg-background px-2.5 py-1.5 rounded-md">
                      <span>In: ${model.pricing.promptPerMillion.toFixed(2)}/1M</span>
                      <span>Out: ${model.pricing.completionPerMillion.toFixed(2)}/1M</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSetDefaultModel(model.id)}
                        className={`flex-1 rounded-xl py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          isDefault
                            ? "bg-success text-white shadow-sm"
                            : "bg-surface-secondary text-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        {isDefault ? (
                          <>
                            <Check className="size-3.5" /> Modelo Ativo
                          </>
                        ) : (
                          "Definir como Padrão"
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSandboxModel(model.id);
                          setActiveTab("sandbox");
                        }}
                        className="rounded-xl border border-border p-2 text-muted hover:text-foreground hover:bg-surface-hover transition"
                        title="Testar este modelo no Sandbox"
                      >
                        <Play className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PLAYGROUND & SANDBOX */}
      {/* ========================================================================= */}
      {activeTab === "sandbox" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Controls & Inputs (Left / 7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sliders className="size-4 text-accent" />
                    Parâmetros do Teste
                  </h3>
                  <span className="text-[11px] text-muted font-mono">{sandboxModel}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">
                      Modelo
                    </label>
                    <select
                      value={sandboxModel}
                      onChange={(e) => setSandboxModel(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background p-2 text-xs text-foreground focus:border-accent focus:outline-none"
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.provider})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">
                      Temperatura: {sandboxTemperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.1"
                      value={sandboxTemperature}
                      onChange={(e) => setSandboxTemperature(parseFloat(e.target.value))}
                      className="w-full accent-accent mt-2"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      value={sandboxMaxTokens}
                      onChange={(e) => setSandboxMaxTokens(parseInt(e.target.value) || 1000)}
                      className="w-full rounded-xl border border-border bg-background p-2 text-xs text-foreground focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                {/* System Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Instruções do Sistema (System Prompt)
                    </label>
                    <div className="flex items-center gap-1 text-[11px] text-muted">
                      <span>Presets:</span>
                      {SYSTEM_PROMPT_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setSandboxSystemPrompt(p.prompt)}
                          className="hover:text-accent underline text-[10px] ml-1"
                        >
                          {p.name.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={sandboxSystemPrompt}
                    onChange={(e) => setSandboxSystemPrompt(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Instruções de como o modelo deve agir..."
                  />
                </div>

                {/* User Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Mensagem do Aluno (User Message)
                    </label>
                    <div className="flex items-center gap-1 text-[11px] text-muted">
                      <span>Exemplos:</span>
                      {USER_MESSAGE_PRESETS.map((msg, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSandboxUserPrompt(msg)}
                          className="hover:text-accent underline text-[10px] ml-1"
                        >
                          Exemplo {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={sandboxUserPrompt}
                    onChange={(e) => setSandboxUserPrompt(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Escreva a dúvida ou interação que o aluno teria..."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRunSandbox}
                  disabled={isRunningSandbox}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent py-3 px-4 text-xs font-bold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition"
                >
                  {isRunningSandbox ? (
                    <>
                      <RotateCcw className="size-4 animate-spin" />
                      Processando com OpenRouter ({sandboxModel.split("/").pop()})...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Disparar Prompt de Teste
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Output Display (Right / 5 cols) */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="flex-1 rounded-2xl border border-border bg-surface p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Bot className="size-4 text-accent" />
                      Resposta da IA
                    </h3>

                    {sandboxResult && (
                      <span className="text-[11px] font-mono text-muted">
                        ⏱️ {sandboxResult.latencyMs}ms
                      </span>
                    )}
                  </div>

                  <div className="mt-4 min-h-[220px]">
                    {isRunningSandbox ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted space-y-3">
                        <RotateCcw className="size-6 animate-spin text-accent" />
                        <p className="text-xs">Aguardando geração pelo modelo...</p>
                      </div>
                    ) : sandboxResult?.error ? (
                      <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs text-danger-soft-foreground space-y-2">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertCircle className="size-4 text-danger" />
                          Erro ao executar prompt
                        </div>
                        <p>{sandboxResult.error}</p>
                      </div>
                    ) : sandboxResult?.text ? (
                      <div className="space-y-4">
                        {sandboxResult.simulated && (
                          <div className="rounded-lg bg-warning-soft px-3 py-1.5 text-[11px] text-warning-soft-foreground flex items-center gap-1.5">
                            <Info className="size-3.5" />
                            Modo Demonstração (Adicione sua chave OpenRouter para respostas reais).
                          </div>
                        )}

                        <div className="prose prose-sm max-w-none text-foreground text-xs leading-relaxed whitespace-pre-wrap rounded-xl bg-background-secondary p-4 border border-border">
                          {sandboxResult.text}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted space-y-2">
                        <Sparkles className="size-8 text-muted/40" />
                        <p className="text-xs">
                          Configure o prompt e clique em "Disparar Prompt de Teste" para ver a resposta ao vivo.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {sandboxResult?.usage && (
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted font-mono">
                    <span>Prompt: {sandboxResult.usage.promptTokens} tok</span>
                    <span>Compl: {sandboxResult.usage.completionTokens} tok</span>
                    <span className="font-bold text-foreground">
                      Total: {sandboxResult.usage.totalTokens} tok
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(sandboxResult.text, "result")}
                      className="text-accent hover:underline flex items-center gap-1 font-sans font-semibold text-xs"
                    >
                      <Copy className="size-3" /> Copiar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LOGS & TELEMETRIA */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Activity className="size-5 text-accent" />
                  Telemetria de Requisições de IA
                </h3>
                <p className="text-xs text-muted mt-1">
                  Acompanhe em tempo real latência, consumo de tokens e modelos executados.
                </p>
              </div>

              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-danger hover:border-danger/30 transition"
                >
                  <Trash2 className="size-3.5" />
                  Limpar Histórico
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="py-12 text-center text-muted space-y-2">
                <Activity className="size-8 mx-auto text-muted/40" />
                <p className="text-sm font-semibold text-foreground">Nenhuma requisição registrada ainda</p>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Execute testes no Sandbox ou interaja com um Agente de IA para visualizar as métricas aqui.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted uppercase text-[10px] tracking-wider">
                      <th className="pb-3 font-semibold">Data / Hora</th>
                      <th className="pb-3 font-semibold">Modelo</th>
                      <th className="pb-3 font-semibold">Origem</th>
                      <th className="pb-3 font-semibold">Tokens (In / Out / Tot)</th>
                      <th className="pb-3 font-semibold">Latência</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Prévia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-hover/50 transition">
                        <td className="py-3 text-muted font-mono">
                          {new Date(log.timestamp).toLocaleTimeString("pt-BR")}
                        </td>
                        <td className="py-3 font-semibold text-foreground">
                          {log.model.split("/").pop()}
                        </td>
                        <td className="py-3 text-muted capitalize">{log.source}</td>
                        <td className="py-3 font-mono text-muted">
                          {log.promptTokens} / {log.completionTokens} /{" "}
                          <strong className="text-foreground">{log.totalTokens}</strong>
                        </td>
                        <td className="py-3 font-mono text-muted">{log.latencyMs}ms</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === "success"
                                ? "bg-success-soft text-success-soft-foreground"
                                : "bg-danger-soft text-danger-soft-foreground"
                            }`}
                          >
                            {log.status === "success" ? "OK" : "Erro"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="text-accent hover:underline text-xs font-semibold"
                          >
                            Ver detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal / Dialog for Log Details */}
          {selectedLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-base font-bold text-foreground">Detalhes da Chamada de IA</h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-muted hover:text-foreground text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-background-secondary p-3.5 rounded-xl">
                  <div>
                    <span className="text-muted block text-[10px]">Modelo:</span>
                    <span className="font-semibold text-foreground">{selectedLog.model}</span>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px]">Tokens Totais:</span>
                    <span className="font-semibold text-foreground font-mono">{selectedLog.totalTokens}</span>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px]">Latência:</span>
                    <span className="font-semibold text-foreground font-mono">{selectedLog.latencyMs}ms</span>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px]">Status:</span>
                    <span className="font-semibold text-foreground capitalize">{selectedLog.status}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-muted block mb-1">Prompt do Aluno:</span>
                  <div className="rounded-xl border border-border bg-background p-3 text-xs text-foreground max-h-32 overflow-y-auto">
                    {selectedLog.userPromptPreview || "(Vazio)"}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-muted block mb-1">Resposta Gerada:</span>
                  <div className="rounded-xl border border-border bg-background p-3 text-xs text-foreground max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {selectedLog.responsePreview || selectedLog.error || "(Vazio)"}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: GUIA & DOCUMENTAÇÃO */}
      {/* ========================================================================= */}
      {activeTab === "guide" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <BookOpen className="size-5 text-accent" />
                Guia Rápido de Configuração do OpenRouter
              </h3>
              <p className="text-xs text-muted mt-1">
                Siga os 4 passos simples para ativar a inteligência artificial de ponta em toda a sua plataforma.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-background-secondary p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                    1
                  </span>
                  Crie sua conta no OpenRouter
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Acesse <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="text-accent underline font-semibold">openrouter.ai</a> e faça login com seu Google ou GitHub. O cadastro é gratuito e dá acesso a dezenas de IAs.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background-secondary p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                    2
                  </span>
                  Gere sua Chave de API
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  No menu do OpenRouter, clique em <strong>Keys</strong> ou acesse <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-accent underline font-semibold">openrouter.ai/keys</a>. Clique em <em>Create Key</em>, atribua um nome (ex: "Smart LMS") e copie a chave.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background-secondary p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                    3
                  </span>
                  Cole a Chave & Valide
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Cole sua chave na aba <strong>Credenciais & Conexão</strong> desta página e clique em <em>Validar & Conectar</em>. A plataforma confirmará a conexão e lerá seu saldo imediatamente.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background-secondary p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                    4
                  </span>
                  Escolha Modelos por Agente
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  No menu <strong>Agentes de IA</strong>, edite qualquer agente e selecione o modelo ideal: Claude 3.5 Sonnet para tutoria e escrita, Gemini 2.0 Flash para velocidade ou DeepSeek R1 para raciocínio lógico profundo.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-accent/20 bg-accent-soft p-5 text-xs text-accent-soft-foreground space-y-2">
              <h4 className="font-bold flex items-center gap-2 text-sm">
                <Sparkles className="size-4" /> Vantagens da Integração Unificada
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Uma única fatura e saldo compartilhado para OpenAI, Anthropic, Google, DeepSeek e Meta.</li>
                <li>Roteamento inteligente de fallback automático caso algum provedor fique temporariamente instável.</li>
                <li>Transparência total de custos e tokens consumidos por aluno e por agente.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
