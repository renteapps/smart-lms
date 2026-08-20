"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "sonner";
import {
  Mail,
  Key,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  Globe,
  FileText,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Bell,
  Sparkles,
  Upload,
  RotateCcw,
  Code2,
  FileCode,
  Tag,
  Laptop,
  Smartphone,
  Info,
} from "lucide-react";
import {
  ResendConfig,
  EmailLog,
  EmailTemplateType,
  CustomEmailTemplate,
} from "@/types/resend";
import { DEFAULT_RESEND_CONFIG, getResendConfig, saveResendConfig } from "@/lib/resendService";
import {
  generateEmailHtml,
  getCustomTemplates,
  getDefaultTemplateDefinitions,
  interpolateVariables,
  saveCustomTemplate,
  resetCustomTemplate,
} from "@/lib/emailTemplates";

export function ResendIntegrationContent() {
  const [activeTab, setActiveTab] = useState<
    "credentials" | "categories" | "templates" | "sandbox" | "dns" | "logs"
  >("credentials");
  const [config, setConfig] = useState<ResendConfig>(DEFAULT_RESEND_CONFIG);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Templates Management State
  const [templates, setTemplates] = useState<Record<string, CustomEmailTemplate>>({});
  const [selectedTemplateType, setSelectedTemplateType] = useState<EmailTemplateType>("welcome");
  const [templateFilter, setTemplateFilter] = useState<"all" | "platform" | "notification">("all");
  const [editedSubject, setEditedSubject] = useState("");
  const [editedPreviewText, setEditedPreviewText] = useState("");
  const [editedHtml, setEditedHtml] = useState("");
  const [editorMode, setEditorMode] = useState<"split" | "code" | "preview">("split");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [useSampleData, setUseSampleData] = useState(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isResettingTemplate, setIsResettingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sandbox Test State
  const [testEmail, setTestEmail] = useState("");
  const [testName, setTestName] = useState("Carlos Silva");
  const [testTemplate, setTestTemplate] = useState<EmailTemplateType>("welcome");
  const [testCourseTitle, setTestCourseTitle] = useState("Especialista em Next.js & IA");
  const [testMessage, setTestMessage] = useState(
    "Seja muito bem-vindo ao Smart LMS! Seu acesso está liberado."
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    id?: string;
    simulated?: boolean;
    timestamp?: string;
  } | null>(null);

  // Logs State
  const [logs, setLogs] = useState<EmailLog[]>([]);

  // Load config, templates and logs
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/integracoes/resend");
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setApiKeyInput(data.config.apiKey || "");
        if (data.logs) {
          setLogs(data.logs);
        }
        if (data.templates) {
          setTemplates(data.templates);
          loadTemplateIntoEditor(selectedTemplateType, data.templates);
        } else {
          const localTemplates = getCustomTemplates();
          setTemplates(localTemplates);
          loadTemplateIntoEditor(selectedTemplateType, localTemplates);
        }
      } else {
        const local = getResendConfig();
        const localTemplates = getCustomTemplates();
        setConfig(local);
        setApiKeyInput(local.apiKey || "");
        setTemplates(localTemplates);
        loadTemplateIntoEditor(selectedTemplateType, localTemplates);
      }
    } catch (_e) {
      const local = getResendConfig();
      const localTemplates = getCustomTemplates();
      setConfig(local);
      setApiKeyInput(local.apiKey || "");
      setTemplates(localTemplates);
      loadTemplateIntoEditor(selectedTemplateType, localTemplates);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplateIntoEditor = (
    type: EmailTemplateType,
    templatesMap: Record<string, CustomEmailTemplate> = templates
  ) => {
    const template = templatesMap[type] || getDefaultTemplateDefinitions()[0];
    setEditedSubject(template.subject);
    setEditedPreviewText(template.previewText || "");
    setEditedHtml(template.html);
  };

  const handleSelectTemplate = (type: EmailTemplateType) => {
    setSelectedTemplateType(type);
    loadTemplateIntoEditor(type);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const updatedConfig: ResendConfig = {
        ...config,
        apiKey: apiKeyInput.trim(),
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch("/api/admin/integracoes/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: updatedConfig }),
      });

      const data = await res.json();
      if (data.success) {
        setConfig(updatedConfig);
        saveResendConfig(updatedConfig);
        toast.success("Configurações do Resend salvas com sucesso!");
      } else {
        toast.error(data.error || "Erro ao salvar configurações.");
      }
    } catch (_e) {
      saveResendConfig({ ...config, apiKey: apiKeyInput.trim() });
      toast.success("Configurações salvas localmente!");
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateKey = async () => {
    if (!apiKeyInput.trim()) {
      toast.error("Informe a chave de API do Resend antes de validar.");
      return;
    }

    setIsValidatingKey(true);
    try {
      const res = await fetch("/api/admin/integracoes/resend/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate_key", apiKey: apiKeyInput.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Chave de API válida!");
      } else {
        toast.warning(data.message || "Não foi possível validar a chave online.");
      }
    } catch (_e) {
      toast.info("Chave com formato padrão detectada (re_...).");
    } finally {
      setIsValidatingKey(false);
    }
  };

  // Save customized template
  const handleSaveTemplate = async () => {
    const currentTpl = templates[selectedTemplateType];
    if (!currentTpl) return;

    setIsSavingTemplate(true);
    try {
      const updatedTemplate: CustomEmailTemplate = {
        ...currentTpl,
        subject: editedSubject,
        previewText: editedPreviewText,
        html: editedHtml,
        isCustomized: true,
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch("/api/admin/integracoes/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_template",
          template: updatedTemplate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        saveCustomTemplate(updatedTemplate);
        setTemplates((prev) => ({
          ...prev,
          [selectedTemplateType]: updatedTemplate,
        }));
        toast.success(`Modelo "${updatedTemplate.name}" salvo com sucesso!`);
      } else {
        toast.error(data.error || "Erro ao salvar modelo de e-mail.");
      }
    } catch (_e) {
      const current = templates[selectedTemplateType];
      if (current) {
        const fallback: CustomEmailTemplate = {
          ...current,
          subject: editedSubject,
          previewText: editedPreviewText,
          html: editedHtml,
          isCustomized: true,
        };
        saveCustomTemplate(fallback);
        setTemplates((prev) => ({ ...prev, [selectedTemplateType]: fallback }));
        toast.success("Modelo salvo localmente!");
      }
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Reset template to default
  const handleResetTemplate = async () => {
    if (!confirm("Deseja realmente restaurar este modelo para o HTML original do sistema?")) {
      return;
    }

    setIsResettingTemplate(true);
    try {
      const res = await fetch("/api/admin/integracoes/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_template",
          templateType: selectedTemplateType,
        }),
      });

      const data = await res.json();
      if (data.success && data.template) {
        resetCustomTemplate(selectedTemplateType);
        setTemplates((prev) => ({
          ...prev,
          [selectedTemplateType]: data.template,
        }));
        loadTemplateIntoEditor(selectedTemplateType, {
          ...templates,
          [selectedTemplateType]: data.template,
        });
        toast.success("Modelo restaurado para o padrão original!");
      } else {
        const reset = resetCustomTemplate(selectedTemplateType);
        setTemplates((prev) => ({
          ...prev,
          [selectedTemplateType]: reset,
        }));
        loadTemplateIntoEditor(selectedTemplateType, {
          ...templates,
          [selectedTemplateType]: reset,
        });
        toast.success("Modelo restaurado!");
      }
    } catch (_e) {
      const reset = resetCustomTemplate(selectedTemplateType);
      setTemplates((prev) => ({
        ...prev,
        [selectedTemplateType]: reset,
      }));
      loadTemplateIntoEditor(selectedTemplateType);
      toast.success("Modelo restaurado localmente!");
    } finally {
      setIsResettingTemplate(false);
    }
  };

  // Upload custom HTML file from disk
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".html") && !file.name.endsWith(".htm") && !file.type.includes("html")) {
      toast.error("Por favor, selecione um arquivo HTML válido (.html ou .htm).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setEditedHtml(content);
        toast.success(`Arquivo "${file.name}" carregado com sucesso no editor!`);
      }
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo selecionado.");
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Insert variable tag into HTML or Subject
  const handleInsertVariable = (tag: string) => {
    // Copy to clipboard
    navigator.clipboard.writeText(tag);
    setCopiedField(tag);
    toast.success(`Variável ${tag} copiada para a área de transferência!`);
    setTimeout(() => setCopiedField(null), 2000);

    // Insert at cursor in textarea if focused
    const textarea = codeTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + tag + text.substring(end);
      setEditedHtml(newText);

      // restore cursor
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) {
      toast.error("Informe o e-mail de destino para o teste.");
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/integracoes/resend/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          template: testTemplate,
          apiKey: apiKeyInput.trim() || undefined,
          data: {
            name: testName,
            nome: testName,
            courseTitle: testCourseTitle,
            nome_curso: testCourseTitle,
            notificationTitle: `Teste: ${testTemplate}`,
            titulo_notificacao: `Teste: ${testTemplate}`,
            notificationMessage: testMessage,
            mensagem_notificacao: testMessage,
            daysInactive: 7,
            dias_inativo: 7,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message,
          id: data.id,
          simulated: data.simulated,
          timestamp: new Date().toLocaleTimeString("pt-BR"),
        });
        toast.success(data.message);
        fetchConfig(); // refresh logs
      } else {
        setTestResult({
          success: false,
          message: data.error || "Falha no envio de teste.",
          timestamp: new Date().toLocaleTimeString("pt-BR"),
        });
        toast.error(data.error || "Erro no envio de teste.");
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Erro na requisição de teste: " + errorMsg);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Deseja realmente limpar todo o histórico de envios de e-mail?")) return;
    try {
      await fetch("/api/admin/integracoes/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_logs" }),
      });
      setLogs([]);
      toast.success("Histórico de envios limpo.");
    } catch (_e) {
      toast.error("Erro ao limpar logs.");
    }
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const currentTemplate =
    templates[selectedTemplateType] ||
    getDefaultTemplateDefinitions().find((t) => t.type === selectedTemplateType) ||
    getDefaultTemplateDefinitions()[0];

  // Dynamic preview computation
  const previewHtml = useSampleData
    ? interpolateVariables(editedHtml, {
        nome: "Carlos Silva",
        email: "carlos.silva@exemplo.com",
        nome_plataforma: config.fromName || "Smart LMS",
        nome_curso: "Especialista em Next.js & IA",
        link_curso: "https://smartlms.com/cursos/nextjs",
        link_login: "https://smartlms.com/login",
        link_recuperacao: "https://smartlms.com/recuperar-senha?token=exemplo123",
        codigo_certificado: "CERT-849201",
        link_certificado: "https://smartlms.com/certificados/849201",
        nome_plano: "Plano Pro Mensal",
        valor_plano: "R$ 59,90/mês",
        dias_inativo: 7,
        titulo_notificacao: "Novo Módulo Prático Liberado!",
        mensagem_notificacao:
          "Publicamos hoje a aula com o passo a passo completo sobre criação de Agentes de IA customizados no Smart LMS.",
        link_acao: "https://smartlms.com/cursos",
        texto_acao: "Acessar Aula Agora",
      })
    : editedHtml;

  const previewSubject = useSampleData
    ? interpolateVariables(editedSubject, {
        nome: "Carlos Silva",
        nome_plataforma: config.fromName || "Smart LMS",
        nome_curso: "Especialista em Next.js & IA",
        nome_plano: "Plano Pro Mensal",
        titulo_notificacao: "Novo Módulo Prático Liberado!",
      })
    : editedSubject;

  const filteredTemplateList = Object.values(templates).filter((tpl) => {
    if (templateFilter === "all") return true;
    return tpl.category === templateFilter;
  });

  const isConnected = !!apiKeyInput.trim() && apiKeyInput.startsWith("re_");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrações"
        title="Configurar Resend"
        description="Gerencie os disparos de e-mails transacionais, edite templates HTML com tags dinâmicas e monitore notificações em tempo real."
        actions={
          <div className="flex items-center gap-3">
            <a
              href="https://resend.com/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-background-secondary transition-colors"
            >
              <ExternalLink className="size-3.5" /> Docs Resend
            </a>
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Salvar Alterações
            </button>
          </div>
        }
      />

      {/* Top Banner Status */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="editorial-card p-4 flex items-center gap-4">
          <div
            className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${
              !config.enabled
                ? "bg-muted/10 text-muted"
                : isConnected
                ? "bg-success-soft text-success"
                : "bg-warning-soft text-warning"
            }`}
          >
            <Mail className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Status da Conexão</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`size-2 rounded-full ${
                  !config.enabled ? "bg-muted" : isConnected ? "bg-success" : "bg-warning"
                }`}
              />
              <p className="font-bold text-sm text-foreground">
                {!config.enabled
                  ? "Desativado"
                  : isConnected
                  ? "Conectado (Live API)"
                  : "Modo Sandbox (Simulado)"}
              </p>
            </div>
          </div>
        </div>

        <div className="editorial-card p-4 flex items-center gap-4">
          <div className="size-11 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <FileCode className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Modelos Customizados</p>
            <p className="font-display text-xl font-bold text-foreground">
              {Object.values(templates).filter((t) => t.isCustomized).length} de{" "}
              {Object.values(templates).length || 7}
            </p>
            <p className="text-[11px] text-muted">HTML & tags editáveis</p>
          </div>
        </div>

        <div className="editorial-card p-4 flex items-center gap-4">
          <div className="size-11 rounded-xl bg-primary-soft text-accent flex items-center justify-center shrink-0">
            <Send className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Total de Envios</p>
            <p className="font-display text-xl font-bold text-foreground">{logs.length}</p>
            <p className="text-[11px] text-muted">
              {logs.filter((l) => l.status === "sent").length} reais •{" "}
              {logs.filter((l) => l.status === "simulated").length} simulados
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("credentials")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "credentials"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Key className="size-4" /> Credenciais & Remetente
        </button>

        <button
          onClick={() => setActiveTab("templates")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "templates"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <FileCode className="size-4" /> Modelos & HTML
          {Object.values(templates).some((t) => t.isCustomized) && (
            <span className="size-2 rounded-full bg-accent animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "categories"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Bell className="size-4" /> Gatilhos Ativos
        </button>

        <button
          onClick={() => setActiveTab("sandbox")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "sandbox"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="size-4" /> Sandbox de Teste
        </button>

        <button
          onClick={() => setActiveTab("dns")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "dns"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Globe className="size-4" /> Domínio & DNS
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "logs"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <FileText className="size-4" /> Histórico de Envios
          {logs.length > 0 && (
            <span className="text-[10px] bg-background-secondary text-foreground px-1.5 py-0.5 rounded-full font-mono">
              {logs.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CREDENCIAIS & REMETENTE */}
      {activeTab === "credentials" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="editorial-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Chave de API (Resend)</h2>
                  <p className="text-xs text-muted mt-0.5">
                    Gere sua chave com permissão de envio (Sending Access) no painel do Resend.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-semibold text-foreground">Ativar Resend</span>
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-primary"
                  />
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Resend API Key
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="re_123456789_abcdefghijklmnopqrstuvwxyz"
                      className="w-full min-h-11 rounded-xl border border-border bg-background-secondary pl-4 pr-24 font-mono text-sm text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1.5 text-muted hover:text-foreground transition-colors rounded-md"
                        title={showApiKey ? "Ocultar" : "Mostrar"}
                      >
                        {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted mt-1.5 flex items-center gap-1">
                    <span>Não possui uma chave?</span>
                    <a
                      href="https://resend.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline font-semibold"
                    >
                      Criar API Key no Resend →
                    </a>
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleValidateKey}
                    disabled={isValidatingKey}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-background-secondary transition-colors disabled:opacity-50"
                  >
                    {isValidatingKey ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="size-3.5" />
                    )}
                    Validar Chave
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    Salvar Credenciais
                  </button>
                </div>
              </div>
            </div>

            {/* Sender Info */}
            <div className="editorial-card p-6 space-y-6">
              <div className="border-b border-border/60 pb-4">
                <h2 className="text-lg font-bold text-foreground">Informações do Remetente</h2>
                <p className="text-xs text-muted mt-0.5">
                  Estes dados serão exibidos no cabeçalho dos e-mails recebidos pelos alunos.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Nome do Remetente
                  </label>
                  <input
                    type="text"
                    value={config.fromName}
                    onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                    placeholder="Ex: Smart LMS ou Academia Digital"
                    className="w-full min-h-11 rounded-xl border border-border bg-background-secondary px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    Nome exibido na caixa de entrada do aluno.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    E-mail do Remetente (From)
                  </label>
                  <input
                    type="email"
                    value={config.fromEmail}
                    onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                    placeholder="Ex: notificacoes@seudominio.com"
                    className="w-full min-h-11 rounded-xl border border-border bg-background-secondary px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    Para testes rápidos sem domínio próprio, use <code>onboarding@resend.dev</code>.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    E-mail de Resposta (Reply-To){" "}
                    <span className="text-muted/60 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={config.replyTo || ""}
                    onChange={(e) => setConfig({ ...config, replyTo: e.target.value })}
                    placeholder="Ex: suporte@seudominio.com"
                    className="w-full min-h-11 rounded-xl border border-border bg-background-secondary px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    Se o aluno responder à mensagem, o e-mail será entregue nesta caixa.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-accent/20 bg-accent-soft p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-accent-soft-foreground text-sm">
                <Sparkles className="size-4" /> Dica de Entrega
              </div>
              <p className="text-xs text-accent-soft-foreground/90 leading-relaxed">
                Ao configurar um <strong>domínio próprio verificado</strong> no Resend, seus e-mails
                ganham reputação máxima e caem direto na caixa de entrada dos alunos (evitando a
                pasta de Spam).
              </p>
            </div>

            <div className="editorial-card p-5 space-y-3">
              <h3 className="font-bold text-sm text-foreground">Como funciona o Modo Sandbox?</h3>
              <p className="text-xs text-muted leading-relaxed">
                Se você não informar uma chave de API ou se estiver em ambiente local, o Smart LMS
                simula os disparos gerando os templates HTML completos e gravando o histórico de
                envios sem custos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MODELOS & EDITOR DE HTML (NOVO!) */}
      {activeTab === "templates" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Template Selector List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="editorial-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Selecione o Modelo
                </h3>
                <span className="text-[11px] font-semibold text-muted">
                  {filteredTemplateList.length} disponíveis
                </span>
              </div>

              {/* Category Filter */}
              <div className="grid grid-cols-3 gap-1 bg-background-secondary p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTemplateFilter("all")}
                  className={`py-1.5 rounded-md transition-all ${
                    templateFilter === "all"
                      ? "bg-surface shadow-sm text-foreground font-bold"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateFilter("platform")}
                  className={`py-1.5 rounded-md transition-all ${
                    templateFilter === "platform"
                      ? "bg-surface shadow-sm text-foreground font-bold"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Plataforma
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateFilter("notification")}
                  className={`py-1.5 rounded-md transition-all ${
                    templateFilter === "notification"
                      ? "bg-surface shadow-sm text-foreground font-bold"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Notificações
                </button>
              </div>

              {/* List */}
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {filteredTemplateList.map((tpl) => {
                  const isSelected = tpl.type === selectedTemplateType;
                  return (
                    <button
                      key={tpl.type}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl.type)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? "border-accent bg-accent/5 shadow-sm"
                          : "border-border/70 bg-background-secondary hover:bg-surface hover:border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-bold text-xs ${isSelected ? "text-accent" : "text-foreground"}`}>
                          {tpl.name}
                        </p>
                        {tpl.isCustomized ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-soft text-accent whitespace-nowrap">
                            Customizado
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-background-secondary text-muted whitespace-nowrap">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted mt-1 line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick tips */}
            <div className="rounded-xl border border-border bg-background-secondary p-4 space-y-2 text-xs text-muted">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Info className="size-3.5 text-accent" /> Sobre a Customização
              </p>
              <p className="leading-relaxed">
                Você pode colar qualquer código HTML personalizado ou subir um arquivo <code>.html</code> pronto de ferramentas como Canva, Stripo, Mailchimp ou Figma.
              </p>
            </div>
          </div>

          {/* Right Column: Code / HTML Editor & Preview */}
          <div className="lg:col-span-8 space-y-4">
            <div className="editorial-card p-6 space-y-6">
              {/* Header with Title & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">{currentTemplate.name}</h2>
                    {currentTemplate.isCustomized ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-soft text-accent">
                        HTML Customizado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-background-secondary text-muted">
                        HTML Padrão do Sistema
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{currentTemplate.description}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Hidden file input for uploading HTML */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".html,.htm,text/html"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-background-secondary transition-colors"
                    title="Subir arquivo .html do seu computador"
                  >
                    <Upload className="size-3.5" /> Subir HTML (.html)
                  </button>

                  {currentTemplate.isCustomized && (
                    <button
                      type="button"
                      onClick={handleResetTemplate}
                      disabled={isResettingTemplate}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted hover:text-danger hover:border-danger/30 transition-colors disabled:opacity-50"
                      title="Restaurar para o layout original"
                    >
                      <RotateCcw className="size-3.5" /> Restaurar Padrão
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={isSavingTemplate}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {isSavingTemplate ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Salvar Modelo
                  </button>
                </div>
              </div>

              {/* Subject & Preheader Inputs */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Assunto do E-mail (Subject)
                  </label>
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    placeholder="Ex: Boas-vindas ao {{nome_plataforma}}!"
                    className="w-full min-h-10 rounded-lg border border-border bg-background-secondary px-3 text-xs font-mono text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                  />
                  <p className="text-[10px] text-muted mt-1">
                    Suporta variáveis dinâmicas como <code>{"{{nome}}"}</code> ou <code>{"{{nome_curso}}"}</code>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Texto de Prévia (Preheader)
                  </label>
                  <input
                    type="text"
                    value={editedPreviewText}
                    onChange={(e) => setEditedPreviewText(e.target.value)}
                    placeholder="Texto curto exibido na caixa de entrada..."
                    className="w-full min-h-10 rounded-lg border border-border bg-background-secondary px-3 text-xs font-mono text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                  />
                  <p className="text-[10px] text-muted mt-1">
                    Snippet exibido ao lado do assunto no Gmail / Outlook.
                  </p>
                </div>
              </div>

              {/* Variable Chips Drawer */}
              <div className="rounded-xl border border-border bg-background-secondary p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Tag className="size-3.5 text-accent" /> Campos Personalizados Disponíveis
                  </p>
                  <span className="text-[10px] text-muted">
                    Clique em uma tag para copiar ou inserir
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {currentTemplate.variables.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertVariable(v.tag)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface hover:border-accent hover:bg-accent/5 text-xs font-mono text-foreground transition-colors group"
                      title={`${v.label} - ${v.description} (Ex: ${v.example})`}
                    >
                      <span className="text-accent font-bold">{v.tag}</span>
                      <span className="text-[10px] text-muted group-hover:text-foreground font-sans">
                        {v.label}
                      </span>
                      {copiedField === v.tag ? (
                        <Check className="size-3 text-success" />
                      ) : (
                        <Copy className="size-3 text-muted opacity-50 group-hover:opacity-100" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor & Preview Header Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <div className="flex items-center gap-1 bg-background-secondary p-1 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditorMode("code")}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                      editorMode === "code"
                        ? "bg-surface shadow-sm text-foreground font-bold"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Code2 className="size-3.5" /> Código HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("preview")}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                      editorMode === "preview"
                        ? "bg-surface shadow-sm text-foreground font-bold"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Eye className="size-3.5" /> Prévia
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("split")}
                    className={`hidden md:flex px-3 py-1.5 rounded-md items-center gap-1.5 transition-all ${
                      editorMode === "split"
                        ? "bg-surface shadow-sm text-foreground font-bold"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="size-3.5" /> Lado a Lado
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-muted hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={useSampleData}
                      onChange={(e) => setUseSampleData(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-primary"
                    />
                    <span>Interpolar Dados de Exemplo</span>
                  </label>

                  <div className="flex items-center gap-1 border-l border-border pl-3">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={`p-1.5 rounded-md text-xs ${
                        previewDevice === "desktop"
                          ? "bg-primary-soft text-accent font-bold"
                          : "text-muted hover:text-foreground"
                      }`}
                      title="Visualização Desktop"
                    >
                      <Laptop className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("mobile")}
                      className={`p-1.5 rounded-md text-xs ${
                        previewDevice === "mobile"
                          ? "bg-primary-soft text-accent font-bold"
                          : "text-muted hover:text-foreground"
                      }`}
                      title="Visualização Mobile"
                    >
                      <Smartphone className="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor / Live Preview Panes */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-12">
                {/* HTML Code Textarea */}
                {(editorMode === "code" || editorMode === "split") && (
                  <div
                    className={
                      editorMode === "split" ? "md:col-span-6 space-y-2" : "col-span-12 space-y-2"
                    }
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted font-mono">
                      <span>HTML do E-mail</span>
                      <span>{editedHtml.length} caracteres</span>
                    </div>
                    <div className="relative">
                      <textarea
                        ref={codeTextareaRef}
                        value={editedHtml}
                        onChange={(e) => setEditedHtml(e.target.value)}
                        rows={22}
                        placeholder="Cole seu código HTML aqui ou arraste um arquivo..."
                        className="w-full rounded-xl border border-border bg-slate-950 p-4 font-mono text-xs text-emerald-400 placeholder:text-slate-600 focus:border-accent focus:outline-none leading-relaxed resize-y selection:bg-emerald-950 selection:text-emerald-200"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                )}

                {/* Live Preview Iframe */}
                {(editorMode === "preview" || editorMode === "split") && (
                  <div
                    className={
                      editorMode === "split" ? "md:col-span-6 space-y-2" : "col-span-12 space-y-2"
                    }
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted font-mono">
                      <span>Pré-visualização em Tempo Real</span>
                      <span className="truncate max-w-[200px]">Assunto: {previewSubject}</span>
                    </div>

                    <div
                      className={`rounded-xl border border-border bg-white shadow-sm overflow-hidden flex flex-col mx-auto transition-all ${
                        previewDevice === "mobile" ? "max-w-[360px]" : "w-full"
                      }`}
                    >
                      {/* Fake Client Header */}
                      <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center justify-between text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-red-400" />
                          <span className="size-2 rounded-full bg-amber-400" />
                          <span className="size-2 rounded-full bg-emerald-400" />
                          <span className="font-semibold ml-1.5 truncate max-w-[160px]">
                            {config.fromName || "Smart LMS"}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[10px] truncate max-w-[120px]">
                          Para: carlos@exemplo.com
                        </span>
                      </div>

                      {/* Iframe View */}
                      <div className="p-1 bg-slate-50 min-h-[460px] overflow-y-auto">
                        <iframe
                          title="Prévia do E-mail Customizado"
                          srcDoc={previewHtml}
                          className="w-full h-[450px] border-0 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GATILHOS ATIVOS */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          {/* Platform Emails */}
          <div className="editorial-card p-6 space-y-4">
            <div className="border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                ✉️ E-mails Transacionais da Plataforma
              </h2>
              <p className="text-xs text-muted">
                E-mails disparados por ações diretas do usuário ou eventos de ciclo de vida da conta.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 bg-background-secondary hover:bg-surface transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.categories.platform.welcome}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      categories: {
                        ...config.categories,
                        platform: { ...config.categories.platform, welcome: e.target.checked },
                      },
                    })
                  }
                  className="w-4 h-4 mt-0.5 rounded border-border text-accent focus:ring-primary"
                />
                <div className="text-xs">
                  <p className="font-bold text-foreground">Boas-vindas ao Aluno</p>
                  <p className="text-muted mt-0.5">
                    Enviado assim que o aluno se cadastra ou é criado na plataforma.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 bg-background-secondary hover:bg-surface transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.categories.platform.passwordReset}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      categories: {
                        ...config.categories,
                        platform: { ...config.categories.platform, passwordReset: e.target.checked },
                      },
                    })
                  }
                  className="w-4 h-4 mt-0.5 rounded border-border text-accent focus:ring-primary"
                />
                <div className="text-xs">
                  <p className="font-bold text-foreground">Recuperação de Senha</p>
                  <p className="text-muted mt-0.5">
                    Link seguro para redefinição de acesso à conta.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 bg-background-secondary hover:bg-surface transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.categories.platform.courseEnrollment}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      categories: {
                        ...config.categories,
                        platform: { ...config.categories.platform, courseEnrollment: e.target.checked },
                      },
                    })
                  }
                  className="w-4 h-4 mt-0.5 rounded border-border text-accent focus:ring-primary"
                />
                <div className="text-xs">
                  <p className="font-bold text-foreground">Confirmação de Matrícula</p>
                  <p className="text-muted mt-0.5">
                    Disparado quando um curso é adquirido ou liberado manualmente.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 bg-background-secondary hover:bg-surface transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.categories.platform.certificateIssued}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      categories: {
                        ...config.categories,
                        platform: { ...config.categories.platform, certificateIssued: e.target.checked },
                      },
                    })
                  }
                  className="w-4 h-4 mt-0.5 rounded border-border text-accent focus:ring-primary"
                />
                <div className="text-xs">
                  <p className="font-bold text-foreground">Emissão de Certificado</p>
                  <p className="text-muted mt-0.5">
                    Aviso e link do certificado oficial quando o curso é concluído.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 bg-background-secondary hover:bg-surface transition-colors cursor-pointer sm:col-span-2">
                <input
                  type="checkbox"
                  checked={config.categories.platform.subscriptionConfirmation}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      categories: {
                        ...config.categories,
                        platform: {
                          ...config.categories.platform,
                          subscriptionConfirmation: e.target.checked,
                        },
                      },
                    })
                  }
                  className="w-4 h-4 mt-0.5 rounded border-border text-accent focus:ring-primary"
                />
                <div className="text-xs">
                  <p className="font-bold text-foreground">Confirmação de Assinatura & Fatura</p>
                  <p className="text-muted mt-0.5">
                    Recibo e confirmação de renovação ou contratação de plano de assinatura.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Notifications & Engagement Emails */}
          <div className="editorial-card p-6 space-y-4">
            <div className="border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                🔔 E-mails de Notificação & Engajamento
              </h2>
              <p className="text-xs text-muted">
                E-mails enviados pelo painel de Notificações, automações comportamentais e
                interações da comunidade.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 bg-background-secondary hover:bg-surface transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.categories.notifications.newContent}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      categories: {
                        ...config.categories,
                        notifications: {
                          ...config.categories.notifications,
                          newContent: e.target.checked,
                        },
                      },
                    })
                  }
                  className="w-4 h-4 mt-0.5 rounded border-border text-accent focus:ring-primary"
                />
                <div className="text-xs">
                  <p className="font-bold text-foreground">Novos Módulos & Aulas</p>
                  <p className="text-muted mt-0.5">
                    Aviso automático aos matriculados quando novo conteúdo é publicado.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 bg-background-secondary hover:bg-surface transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.categories.notifications.communityReplies}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      categories: {
                        ...config.categories,
                        notifications: {
                          ...config.categories.notifications,
                          communityReplies: e.target.checked,
                        },
                      },
                    })
                  }
                  className="w-4 h-4 mt-0.5 rounded border-border text-accent focus:ring-primary"
                />
                <div className="text-xs">
                  <p className="font-bold text-foreground">Respostas na Comunidade</p>
                  <p className="text-muted mt-0.5">
                    Notifica o aluno quando um professor ou colega responde sua dúvida.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 bg-background-secondary hover:bg-surface transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.categories.notifications.broadcasts}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      categories: {
                        ...config.categories,
                        notifications: {
                          ...config.categories.notifications,
                          broadcasts: e.target.checked,
                        },
                      },
                    })
                  }
                  className="w-4 h-4 mt-0.5 rounded border-border text-accent focus:ring-primary"
                />
                <div className="text-xs">
                  <p className="font-bold text-foreground">Comunicados Gerais (Admin)</p>
                  <p className="text-muted mt-0.5">
                    Envios manuais realizados na aba de Notificações com canal Email marcado.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 bg-background-secondary hover:bg-surface transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.categories.notifications.inactivityReengagement}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      categories: {
                        ...config.categories,
                        notifications: {
                          ...config.categories.notifications,
                          inactivityReengagement: e.target.checked,
                        },
                      },
                    })
                  }
                  className="w-4 h-4 mt-0.5 rounded border-border text-accent focus:ring-primary"
                />
                <div className="text-xs">
                  <p className="font-bold text-foreground">Automações de Reengajamento</p>
                  <p className="text-muted mt-0.5">
                    Lembrete para alunos ausentes há 7 ou 30 dias retornarem aos estudos.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Salvar Categorias
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: SANDBOX DE TESTE */}
      {activeTab === "sandbox" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Test Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="editorial-card p-6 space-y-4">
              <div className="border-b border-border/60 pb-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Send className="size-4 text-accent" /> Teste de Disparo
                </h2>
                <p className="text-xs text-muted">
                  Envie um e-mail de teste para verificar a formatação e entrega na caixa de entrada.
                </p>
              </div>

              <form onSubmit={handleSendTestEmail} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    E-mail de Destino
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="seu-email@teste.com"
                    required
                    className="w-full min-h-10 rounded-lg border border-border bg-background-secondary px-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Modelo do Teste
                  </label>
                  <select
                    value={testTemplate}
                    onChange={(e) => setTestTemplate(e.target.value as EmailTemplateType)}
                    className="w-full min-h-10 rounded-lg border border-border bg-background-secondary px-3 text-sm text-foreground focus:border-accent focus:bg-surface focus:outline-none"
                  >
                    <option value="welcome">🎉 Boas-vindas (Cadastro)</option>
                    <option value="password_reset">🔒 Recuperação de Senha</option>
                    <option value="course_enrollment">🎓 Matrícula em Curso</option>
                    <option value="certificate">🏆 Certificado de Conclusão</option>
                    <option value="subscription">⭐ Assinatura Confirmada</option>
                    <option value="notification">📢 Notificação / Comunicado</option>
                    <option value="inactivity">⏱️ Reengajamento (Ausente)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                    Nome do Destinatário
                  </label>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full min-h-10 rounded-lg border border-border bg-background-secondary px-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                  />
                </div>

                {testTemplate === "course_enrollment" && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                      Título do Curso
                    </label>
                    <input
                      type="text"
                      value={testCourseTitle}
                      onChange={(e) => setTestCourseTitle(e.target.value)}
                      className="w-full min-h-10 rounded-lg border border-border bg-background-secondary px-3 text-sm text-foreground focus:border-accent focus:bg-surface focus:outline-none"
                    />
                  </div>
                )}

                {testTemplate === "notification" && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                      Mensagem da Notificação
                    </label>
                    <textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:bg-surface focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-xs font-bold text-primary-foreground hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Disparar E-mail de Teste
                </button>
              </form>

              {testResult && (
                <div
                  className={`mt-4 p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    testResult.success
                      ? "bg-success-soft border-success/20 text-success-soft-foreground"
                      : "bg-danger-soft border-danger/20 text-danger-soft-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.success ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <AlertCircle className="size-4 text-danger" />
                    )}
                    <span>{testResult.success ? "Envio Realizado" : "Erro no Envio"}</span>
                    {testResult.timestamp && (
                      <span className="text-[10px] font-mono opacity-70 ml-auto">
                        {testResult.timestamp}
                      </span>
                    )}
                  </div>
                  <p className="leading-relaxed">{testResult.message}</p>
                  {testResult.id && (
                    <p className="font-mono text-[10px] opacity-80 pt-1">ID: {testResult.id}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sandbox Live Preview */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Eye className="size-3.5" /> Pré-visualização do Modelo Selecionado
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateType(testTemplate);
                  loadTemplateIntoEditor(testTemplate);
                  setActiveTab("templates");
                }}
                className="text-xs text-accent hover:underline font-bold flex items-center gap-1"
              >
                <Code2 className="size-3.5" /> Editar HTML deste modelo
              </button>
            </div>

            <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden min-h-[500px] flex flex-col">
              {/* Fake Email Client Bar */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-400" />
                    <span className="size-2.5 rounded-full bg-amber-400" />
                    <span className="size-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="font-medium ml-2">
                    De: {config.fromName || "Smart LMS"} &lt;
                    {config.fromEmail || "onboarding@resend.dev"}&gt;
                  </span>
                </div>
                <span className="text-slate-400 text-[11px]">
                  Para: {testEmail || "aluno@exemplo.com"}
                </span>
              </div>

              {/* HTML iframe */}
              <div className="flex-1 p-2 bg-slate-50 overflow-y-auto">
                <iframe
                  title="Prévia do E-mail do Sandbox"
                  srcDoc={
                    generateEmailHtml(testTemplate, {
                      name: testName,
                      nome: testName,
                      courseTitle: testCourseTitle,
                      nome_curso: testCourseTitle,
                      notificationTitle: `Aviso: ${testTemplate}`,
                      titulo_notificacao: `Aviso: ${testTemplate}`,
                      notificationMessage: testMessage,
                      mensagem_notificacao: testMessage,
                      daysInactive: 7,
                      dias_inativo: 7,
                      appName: config.fromName || "Smart LMS",
                    }).html
                  }
                  className="w-full h-[480px] border-0 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DOMÍNIO & DNS */}
      {activeTab === "dns" && (
        <div className="space-y-6">
          <div className="editorial-card p-6 space-y-6">
            <div className="border-b border-border/60 pb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Globe className="size-4 text-accent" /> Verificação de Domínio Próprio no Resend
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Para enviar e-mails usando seu próprio domínio (ex: <code>@seudominio.com.br</code>),
                cadastre os registros DNS abaixo na sua hospedagem (Cloudflare, GoDaddy, Registro.br,
                AWS Route 53, etc.).
              </p>
            </div>

            <div className="space-y-4">
              {/* Record 1: SPF */}
              <div className="rounded-xl border border-border bg-background-secondary p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-accent/10 text-accent font-mono text-xs font-bold">
                      TXT (SPF)
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      Registro de Remetente Autorizado
                    </span>
                  </div>
                  <span className="text-[10px] text-muted uppercase tracking-wider">
                    Obrigatório
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-xs font-mono">
                  <div className="bg-surface p-2.5 rounded-lg border border-border/60 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted font-sans">Nome / Host</p>
                      <p className="text-foreground font-bold">@ (ou seu domínio)</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard("@", "spf_name")}
                      className="p-1.5 text-muted hover:text-foreground rounded"
                    >
                      {copiedField === "spf_name" ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="bg-surface p-2.5 rounded-lg border border-border/60 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <p className="text-[10px] text-muted font-sans">Valor / Conteúdo</p>
                      <p className="text-foreground font-bold truncate">
                        v=spf1 include:amazonses.com ~all
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard("v=spf1 include:amazonses.com ~all", "spf_val")}
                      className="p-1.5 text-muted hover:text-foreground rounded"
                    >
                      {copiedField === "spf_val" ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Record 2: DKIM */}
              <div className="rounded-xl border border-border bg-background-secondary p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-success/10 text-success font-mono text-xs font-bold">
                      CNAME / TXT (DKIM)
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      Assinatura Criptográfica de Autenticidade
                    </span>
                  </div>
                  <span className="text-[10px] text-muted uppercase tracking-wider">
                    Obrigatório
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-xs font-mono">
                  <div className="bg-surface p-2.5 rounded-lg border border-border/60 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted font-sans">Nome / Host</p>
                      <p className="text-foreground font-bold">resend._domainkey</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard("resend._domainkey", "dkim_name")}
                      className="p-1.5 text-muted hover:text-foreground rounded"
                    >
                      {copiedField === "dkim_name" ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="bg-surface p-2.5 rounded-lg border border-border/60 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <p className="text-[10px] text-muted font-sans">Valor / Conteúdo</p>
                      <p className="text-foreground font-bold truncate">
                        resend._domainkey.resend.com
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard("resend._domainkey.resend.com", "dkim_val")
                      }
                      className="p-1.5 text-muted hover:text-foreground rounded"
                    >
                      {copiedField === "dkim_val" ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Record 3: DMARC */}
              <div className="rounded-xl border border-border bg-background-secondary p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-warning/10 text-warning font-mono text-xs font-bold">
                      TXT (DMARC)
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      Política de Proteção contra Spoofing
                    </span>
                  </div>
                  <span className="text-[10px] text-muted uppercase tracking-wider">
                    Recomendado
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-xs font-mono">
                  <div className="bg-surface p-2.5 rounded-lg border border-border/60 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted font-sans">Nome / Host</p>
                      <p className="text-foreground font-bold">_dmarc</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard("_dmarc", "dmarc_name")}
                      className="p-1.5 text-muted hover:text-foreground rounded"
                    >
                      {copiedField === "dmarc_name" ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="bg-surface p-2.5 rounded-lg border border-border/60 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <p className="text-[10px] text-muted font-sans">Valor / Conteúdo</p>
                      <p className="text-foreground font-bold truncate">v=DMARC1; p=none;</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard("v=DMARC1; p=none;", "dmarc_val")}
                      className="p-1.5 text-muted hover:text-foreground rounded"
                    >
                      {copiedField === "dmarc_val" ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <a
                href="https://resend.com/domains"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
              >
                Gerenciar Domínios no Console do Resend <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: HISTÓRICO DE ENVIOS (LOGS) */}
      {activeTab === "logs" && (
        <div className="editorial-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Histórico de Disparos Recentes</h2>
              <p className="text-xs text-muted">
                Registro detalhado de todos os e-mails disparados ou simulados via Resend.
              </p>
            </div>
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-danger hover:border-danger/30 transition-colors"
              >
                <Trash2 className="size-3.5" /> Limpar Histórico
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center text-muted text-sm">
              <Mail className="size-8 mx-auto mb-2 opacity-40" />
              Nenhum e-mail disparado até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Destinatário</th>
                    <th className="py-3 px-3">Assunto</th>
                    <th className="py-3 px-3">Template</th>
                    <th className="py-3 px-3">ID / Resend ID</th>
                    <th className="py-3 px-3 text-right">Data & Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-background-secondary transition-colors">
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === "sent"
                              ? "bg-success-soft text-success"
                              : log.status === "simulated"
                              ? "bg-warning-soft text-warning"
                              : "bg-danger-soft text-danger"
                          }`}
                        >
                          {log.status === "sent" && "Enviado"}
                          {log.status === "simulated" && "Simulado"}
                          {log.status === "failed" && "Falhou"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">{log.to}</td>
                      <td className="py-3 px-3 text-foreground truncate max-w-[220px]" title={log.subject}>
                        {log.subject}
                      </td>
                      <td className="py-3 px-3 text-muted font-mono uppercase text-[10px]">
                        {log.template}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-muted truncate max-w-[150px]">
                        {log.resendId || "—"}
                      </td>
                      <td className="py-3 px-3 text-right text-muted font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
