"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "sonner";
import {
  Mail,
  Key,
  CheckCircle2,
  Copy,
  Check,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  Globe,
  FileText,
  ExternalLink,
  ShieldCheck,
  FileCode,
  ArrowRight,
  Sliders,
  X,
} from "lucide-react";
import { CustomEmailTemplate, ResendConfig, EmailTemplateType } from "@/types/resend";
import { DEFAULT_RESEND_CONFIG, getResendConfig, saveResendConfig } from "@/lib/resendService";
import { getCustomTemplates } from "@/lib/emailTemplates";

export default function ResendOverviewPage() {
  const [config, setConfig] = useState<ResendConfig>(DEFAULT_RESEND_CONFIG);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Quick Test Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testTemplate, setTestTemplate] = useState<EmailTemplateType>("welcome");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Stats
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const [customizedCount, setCustomizedCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const res = await fetch("/api/admin/integracoes/resend");
        const data = await res.json();
        if (isMounted && data.success && data.config) {
          setConfig(data.config);
          setApiKeyInput(data.config.apiKey || "");
          if (data.logs) {
            setTotalLogsCount(data.logs.length);
          }
          if (data.templates) {
            const custom = Object.values(data.templates as Record<string, CustomEmailTemplate>).filter(
              (t) => t.isCustomized
            ).length;
            setCustomizedCount(custom);
          }
        }
      } catch {
        if (isMounted) {
          const local = getResendConfig();
          const templates = getCustomTemplates();
          setConfig(local);
          setApiKeyInput(local.apiKey || "");
          setCustomizedCount(Object.values(templates).filter((t) => t.isCustomized).length);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

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
    } catch {
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
    } catch {
      toast.info("Chave com formato padrão detectada (re_...).");
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleQuickTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) {
      toast.error("Informe o e-mail de destino.");
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
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
        toast.success(data.message);
        setTotalLogsCount((prev) => prev + 1);
      } else {
        setTestResult({ success: false, message: data.error || "Falha no envio." });
        toast.error(data.error || "Erro no envio.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Erro no teste: " + msg);
    } finally {
      setIsSendingTest(false);
    }
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isConnected = !!apiKeyInput.trim() && apiKeyInput.startsWith("re_");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Integrações"
        title="Resend & Infraestrutura de E-mail"
        description="Gerencie a conexão da API, autenticação de domínio próprio, remetentes padrão e gatilhos automáticos de e-mail."
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-bold text-text hover:bg-canvas-soft transition-colors"
            >
              <Send className="size-3.5 text-primary" /> Testar Disparo
            </button>

            <Link
              href="/admin/integracoes/resend/logs"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-bold text-text hover:bg-canvas-soft transition-colors"
            >
              <FileText className="size-3.5" /> Histórico ({totalLogsCount})
            </Link>

            <Link
              href="/admin/integracoes/resend/modelos"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-active transition-all shadow-sm"
            >
              <FileCode className="size-3.5" /> Modelos & HTML
              <span className="bg-white/20 text-primary-foreground px-1.5 py-0.5 rounded-full text-[10px]">
                7
              </span>
            </Link>
          </div>
        }
      />

      {/* Top Status Hero */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Connection Status Card */}
        <div className="editorial-card p-5 flex items-center gap-4">
          <div
            className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${
              !config.enabled
                ? "bg-muted/10 text-muted"
                : isConnected
                ? "bg-success-soft text-success"
                : "bg-warning-soft text-warning"
            }`}
          >
            <Mail className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-text-mute">Status do Serviço</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`size-2.5 rounded-full ${
                  !config.enabled ? "bg-muted" : isConnected ? "bg-success animate-pulse" : "bg-warning"
                }`}
              />
              <p className="font-bold text-sm text-text">
                {!config.enabled
                  ? "Desativado"
                  : isConnected
                  ? "Conectado (Live API)"
                  : "Modo Sandbox (Simulado)"}
              </p>
            </div>
            <p className="text-[11px] text-text-mute mt-0.5">
              {isConnected ? "Pronto para envios em produção" : "Ambiente de desenvolvimento seguro"}
            </p>
          </div>
        </div>

        {/* Sender Overview Card */}
        <div className="editorial-card p-5 flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-text-mute">Remetente Padrão (From)</p>
            <p className="font-bold text-sm text-text truncate max-w-[200px]">
              {config.fromEmail || "onboarding@resend.dev"}
            </p>
            <p className="text-[11px] text-text-mute">{config.fromName || "Smart LMS"}</p>
          </div>
        </div>

        {/* Templates Callout Card */}
        <Link
          href="/admin/integracoes/resend/modelos"
          className="editorial-card p-5 flex items-center justify-between gap-4 group hover:border-primary/50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileCode className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-mute">Studio de Modelos</p>
              <p className="font-bold text-sm text-text">
                {customizedCount} de 7 personalizados
              </p>
              <p className="text-[11px] text-primary font-semibold flex items-center gap-1 mt-0.5">
                Editar HTML & tags →
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 text-text-mute group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: API & Sender Settings */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: API Key */}
          <div className="editorial-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <Key className="size-4 text-primary" /> Credenciais da API (Resend)
                </h2>
                <p className="text-xs text-text-mute mt-0.5">
                  Informe sua chave secreta com permissão de envio (Sending Access).
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-text">Ativar Resend</span>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-1.5">
                  Resend API Key
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="re_123456789_abcdefghijklmnopqrstuvwxyz"
                    className="w-full min-h-11 rounded-xl border border-border bg-canvas-soft pl-4 pr-24 font-mono text-sm text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-1.5 text-text-mute hover:text-text transition-colors rounded-md"
                      title={showApiKey ? "Ocultar" : "Mostrar"}
                    >
                      {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-mute mt-2">
                  <span className="flex items-center gap-1">
                    Não tem uma chave?{" "}
                    <a
                      href="https://resend.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-semibold"
                    >
                      Criar API Key no Resend →
                    </a>
                  </span>
                  {isConnected && (
                    <span className="text-success font-semibold flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> Chave no formato válido
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleValidateKey}
                  disabled={isValidatingKey}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text hover:bg-canvas-soft transition-colors disabled:opacity-50"
                >
                  {isValidatingKey ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-3.5" />
                  )}
                  Validar Conexão Online
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-active transition-colors disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Salvar Credenciais
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Sender Information */}
          <div className="editorial-card p-6 space-y-6">
            <div className="border-b border-border/60 pb-4">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Mail className="size-4 text-primary" /> Identidade do Remetente
              </h2>
              <p className="text-xs text-text-mute mt-0.5">
                Configure como a plataforma se apresenta nos e-mails recebidos pelos alunos.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-1.5">
                  Nome do Remetente (From Name)
                </label>
                <input
                  type="text"
                  value={config.fromName}
                  onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                  placeholder="Ex: Smart LMS ou Academia Digital"
                  className="w-full min-h-11 rounded-xl border border-border bg-canvas-soft px-4 text-sm text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                />
                <p className="text-[11px] text-text-mute mt-1">
                  Exibido como remetente na caixa de entrada.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-1.5">
                  E-mail de Envio (From Email)
                </label>
                <input
                  type="email"
                  value={config.fromEmail}
                  onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                  placeholder="Ex: notificacoes@seudominio.com"
                  className="w-full min-h-11 rounded-xl border border-border bg-canvas-soft px-4 text-sm text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                />
                <p className="text-[11px] text-text-mute mt-1">
                  Use <code>onboarding@resend.dev</code> para testes rápidos.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-1.5">
                  E-mail de Resposta (Reply-To){" "}
                  <span className="text-text-mute/60 font-normal">(Opcional)</span>
                </label>
                <input
                  type="email"
                  value={config.replyTo || ""}
                  onChange={(e) => setConfig({ ...config, replyTo: e.target.value })}
                  placeholder="Ex: suporte@seudominio.com"
                  className="w-full min-h-11 rounded-xl border border-border bg-canvas-soft px-4 text-sm text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                />
                <p className="text-[11px] text-text-mute mt-1">
                  Para onde vão as respostas caso o aluno clique em responder.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-active transition-colors disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Salvar Remetente
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Active Triggers & DNS Guide */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Trigger Rules Switchboard */}
          <div className="editorial-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <Sliders className="size-4 text-primary" /> Regras de Disparo Ativas
                </h2>
                <p className="text-xs text-text-mute mt-0.5">
                  Ligue ou desligue o envio de e-mail por evento.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-mute">
                E-mails da Plataforma
              </p>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-canvas-soft hover:bg-surface transition-colors cursor-pointer text-xs">
                  <div>
                    <p className="font-bold text-text">Boas-vindas ao Aluno</p>
                    <p className="text-text-mute text-[10px]">Ao criar conta ou primeiro acesso</p>
                  </div>
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
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-canvas-soft hover:bg-surface transition-colors cursor-pointer text-xs">
                  <div>
                    <p className="font-bold text-text">Recuperação de Senha</p>
                    <p className="text-text-mute text-[10px]">Link temporário seguro</p>
                  </div>
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
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-canvas-soft hover:bg-surface transition-colors cursor-pointer text-xs">
                  <div>
                    <p className="font-bold text-text">Matrícula em Curso</p>
                    <p className="text-text-mute text-[10px]">Liberação de sala de aula</p>
                  </div>
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
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-canvas-soft hover:bg-surface transition-colors cursor-pointer text-xs">
                  <div>
                    <p className="font-bold text-text">Certificado Emitido</p>
                    <p className="text-text-mute text-[10px]">Conclusão de curso</p>
                  </div>
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
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                </label>
              </div>

              <p className="text-[11px] font-bold uppercase tracking-wider text-text-mute pt-2">
                Notificações & Engajamento
              </p>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-canvas-soft hover:bg-surface transition-colors cursor-pointer text-xs">
                  <div>
                    <p className="font-bold text-text">Novos Módulos & Aulas</p>
                    <p className="text-text-mute text-[10px]">Aviso aos alunos matriculados</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.categories.notifications.newContent}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        categories: {
                          ...config.categories,
                          notifications: { ...config.categories.notifications, newContent: e.target.checked },
                        },
                      })
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-canvas-soft hover:bg-surface transition-colors cursor-pointer text-xs">
                  <div>
                    <p className="font-bold text-text">Comunicados Gerais (Admin)</p>
                    <p className="text-text-mute text-[10px]">Envios pelo painel de Notificações</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.categories.notifications.broadcasts}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        categories: {
                          ...config.categories,
                          notifications: { ...config.categories.notifications, broadcasts: e.target.checked },
                        },
                      })
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-active transition-colors disabled:opacity-50"
              >
                Salvar Gatilhos
              </button>
            </div>
          </div>

          {/* Card 4: DNS Verification Guide */}
          <div className="editorial-card p-6 space-y-4">
            <div className="border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Globe className="size-4 text-primary" /> Registros DNS Recomendados
              </h2>
              <p className="text-xs text-text-mute mt-0.5">
                Para autenticar seu domínio no Resend e evitar a caixa de spam:
              </p>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl border border-border/70 bg-canvas-soft flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-primary uppercase font-sans">SPF (TXT)</span>
                  <p className="text-text font-bold mt-0.5 truncate max-w-[200px]">v=spf1 include:amazonses.com ~all</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard("v=spf1 include:amazonses.com ~all", "spf")}
                  className="p-1.5 text-text-mute hover:text-text rounded-lg"
                >
                  {copiedField === "spf" ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                </button>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-canvas-soft flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-success uppercase font-sans">DKIM (CNAME)</span>
                  <p className="text-text font-bold mt-0.5 truncate max-w-[200px]">resend._domainkey.resend.com</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard("resend._domainkey.resend.com", "dkim")}
                  className="p-1.5 text-text-mute hover:text-text rounded-lg"
                >
                  {copiedField === "dkim" ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                </button>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-canvas-soft flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-warning uppercase font-sans">DMARC (TXT)</span>
                  <p className="text-text font-bold mt-0.5 truncate max-w-[200px]">v=DMARC1; p=none;</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard("v=DMARC1; p=none;", "dmarc")}
                  className="p-1.5 text-text-mute hover:text-text rounded-lg"
                >
                  {copiedField === "dmarc" ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <a
                href="https://resend.com/domains"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                Gerenciar Domínios no Console do Resend <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Test Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary-soft text-primary grid place-items-center">
                  <Send className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-ink">Disparo de E-mail de Teste</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="p-1.5 text-text-mute hover:text-text rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleQuickTest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-text mb-1">E-mail de Destino</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="seu-email@teste.com"
                  required
                  className="w-full min-h-10 rounded-xl border border-border bg-canvas-soft px-3 text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-text mb-1">Modelo de E-mail</label>
                <select
                  value={testTemplate}
                  onChange={(e) => setTestTemplate(e.target.value as EmailTemplateType)}
                  className="w-full min-h-10 rounded-xl border border-border bg-canvas-soft px-3 text-text focus:border-primary focus:bg-surface focus:outline-none"
                >
                  <option value="welcome">🎉 Boas-vindas (Cadastro)</option>
                  <option value="password_reset">🔒 Recuperação de Senha</option>
                  <option value="course_enrollment">🎓 Matrícula em Curso</option>
                  <option value="certificate">🏆 Certificado de Conclusão</option>
                  <option value="subscription">⭐ Assinatura Confirmada</option>
                  <option value="notification">📢 Notificação Geral</option>
                  <option value="inactivity">⏱️ Reengajamento</option>
                </select>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-[11px] ${
                    testResult.success
                      ? "bg-success-soft border-success/20 text-success-soft-foreground"
                      : "bg-negative-soft border-negative/20 text-negative-soft-foreground"
                  }`}
                >
                  {testResult.message}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 font-semibold text-text hover:bg-canvas-soft transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="flex-1 rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary-active transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSendingTest ? <RefreshCw className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Disparar Teste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
