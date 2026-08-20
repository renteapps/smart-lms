"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
// Removed Context
import {
  Send,
  Trash2,
  Eye,
  MousePointerClick,
  MailOpen,
  Mail,
  ExternalLink,
  Tag,
  Copy,
  Check,
  Laptop,
  Smartphone,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { AutomationsTab } from "./AutomationsTab";
import { CustomEmailTemplate, EmailTemplateType } from "@/types/resend";
import {
  getCustomTemplates,
  getDefaultTemplateDefinitions,
  interpolateVariables,
} from "@/lib/emailTemplates";

import { createNotificationCampaign, deleteNotificationCampaign } from "./actions";

export default function NotificacoesClient({ initialCampaigns, initialAutomations }: { initialCampaigns: any[], initialAutomations: any[] }) {
  const [activeTab, setActiveTab] = useState<"manual" | "automations">("manual");
  const [campaigns, setCampaigns] = useState<any[]>(initialCampaigns);

  // Removed useNotifications

  // Basic Notification Fields
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState<
    | "all"
    | "course"
    | "user"
    | "inactive_7d"
    | "inactive_30d"
    | "new_users"
    | "course_completed"
    | "course_abandoned"
  >("all");
  const [targetId, setTargetId] = useState("");
  const [channels, setChannels] = useState<("platform" | "push" | "email")[]>(["platform"]);

  // Custom Email Fields
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplateType>("notification");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailPreviewText, setEmailPreviewText] = useState("");
  const [emailTitle, setEmailTitle] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailButtonText, setEmailButtonText] = useState("Acessar Plataforma");
  const [emailButtonUrl, setEmailButtonUrl] = useState("https://smartlms.com/cursos");

  // Templates Cache & Preview
  const [availableTemplates, setAvailableTemplates] = useState<Record<string, CustomEmailTemplate>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const activeInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTemplates() {
      try {
        const res = await fetch("/api/admin/integracoes/resend");
        const data = await res.json();
        if (isMounted && data.success && data.templates) {
          setAvailableTemplates(data.templates);
        } else if (isMounted) {
          setAvailableTemplates(getCustomTemplates());
        }
      } catch {
        if (isMounted) {
          setAvailableTemplates(getCustomTemplates());
        }
      }
    }
    loadTemplates();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleChannel = (channel: "platform" | "push" | "email") => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleInsertTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    toast.success(`Tag ${tag} copiada!`);
    setTimeout(() => setCopiedTag(null), 2000);

    if (activeInputRef.current) {
      const input = activeInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const val = input.value;
      const newVal = val.substring(0, start) + tag + val.substring(end);

      if (input.name === "emailSubject") setEmailSubject(newVal);
      else if (input.name === "emailTitle") setEmailTitle(newVal);
      else if (input.name === "emailBody") setEmailBody(newVal);
      else if (input.name === "emailPreviewText") setEmailPreviewText(newVal);

      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !message) {
      toast.error("Preencha o título e a mensagem.");
      return;
    }

    const requiresId = ["course", "user", "course_completed", "course_abandoned"].includes(targetAudience);
    if (requiresId && !targetId) {
      toast.error("Informe o ID ou E-mail necessário para este público.");
      return;
    }

    if (channels.length === 0) {
      toast.error("Selecione pelo menos um canal de envio.");
      return;
    }

    setIsSending(true);

    try {
      // 1. Salva a notificação interna via Supabase
      const newCampaign = await createNotificationCampaign({
        title,
        message,
        targetAudience,
        targetId: requiresId ? targetId : undefined,
        channels,
        emailDetails: channels.includes("email")
          ? {
              template: emailTemplate,
              subject: emailSubject || title,
              previewText: emailPreviewText || title,
              emailTitle: emailTitle || title,
              emailBody: emailBody || message,
              buttonText: emailButtonText,
              buttonUrl: emailButtonUrl,
            }
          : undefined,
      });

      setCampaigns((prev) => [newCampaign, ...prev]);

      // 2. Se o canal de e-mail estiver selecionado, dispara via Resend
      if (channels.includes("email")) {
        const recipient =
          targetAudience === "user" && targetId.includes("@")
            ? targetId
            : "alunos@smartlms.com";

        const res = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipient,
            subject: emailSubject || `🔔 ${title}`,
            template: emailTemplate,
            data: {
              notificationTitle: emailTitle || title,
              notificationMessage: emailBody || message,
              previewText: emailPreviewText || title,
              actionUrl: emailButtonUrl || "https://smartlms.com/cursos",
              actionText: emailButtonText || "Acessar Plataforma",
              nome: "Aluno(a)",
            },
          }),
        });

        const data = await res.json();
        if (data.success) {
          toast.success(
            data.simulated
              ? "Notificação criada e e-mail simulado no Resend (Sandbox)!"
              : "Notificação e e-mail disparados via Resend com sucesso!"
          );
        } else {
          toast.warning(data.error || "Notificação salva, mas houve aviso no envio de e-mail.");
        }
      } else {
        toast.success("Notificação enviada com sucesso!");
      }

      // Reset form
      setTitle("");
      setMessage("");
      setTargetId("");
      setEmailSubject("");
      setEmailPreviewText("");
      setEmailTitle("");
      setEmailBody("");
      setChannels(["platform"]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao enviar: " + msg);
    } finally {
      setIsSending(false);
    }
  };

  // Preview generation for Modal
  const currentTemplateObj =
    availableTemplates[emailTemplate] ||
    getDefaultTemplateDefinitions().find((t) => t.type === emailTemplate) ||
    getDefaultTemplateDefinitions()[0];

  const generatedPreviewHtml = currentTemplateObj
    ? interpolateVariables(currentTemplateObj.html, {
        nome: "Mariana Souza",
        email: "mariana@exemplo.com",
        nome_plataforma: "Smart LMS",
        titulo_notificacao: emailTitle || title || "Novo Comunicado da Plataforma",
        mensagem_notificacao:
          emailBody ||
          message ||
          "Publicamos novas aulas práticas e recursos exclusivos para acelerar seus estudos.",
        link_acao: emailButtonUrl || "https://smartlms.com/cursos",
        texto_acao: emailButtonText || "Acessar Plataforma",
        nome_curso: "Desenvolvimento Fullstack & IA",
        dias_inativo: 7,
      })
    : "";

  const generatedPreviewSubject = interpolateVariables(
    emailSubject || `🔔 ${title || "Comunicado Importante"}`,
    {
      nome: "Mariana Souza",
      nome_plataforma: "Smart LMS",
      titulo_notificacao: emailTitle || title || "Comunicado",
    }
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Comunicação"
        title="Notificações & E-mails"
        description="Envie comunicados manuais na plataforma e disparos de e-mail via Resend, ou crie réguas de automação inteligentes."
      />

      <div className="flex border-b border-border mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "manual"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Envio Avulso
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("automations")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "automations"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Automações
        </button>
      </div>

      {activeTab === "automations" ? (
        <AutomationsTab initialAutomations={initialAutomations} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left / Main Form Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="editorial-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-lg font-extrabold text-foreground">Nova Notificação & Disparo</h2>
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  Envio Manual
                </span>
              </div>

              <form onSubmit={handleSend} className="space-y-5">
                {/* Basic Title & Message */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                      Título da Notificação
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (!emailTitle) setEmailTitle(e.target.value);
                        if (!emailSubject) setEmailSubject(`🔔 ${e.target.value}`);
                      }}
                      placeholder="Ex: Novo módulo liberado no seu curso!"
                      className="min-h-11 w-full rounded-xl border border-border bg-background-secondary px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                      Mensagem / Conteúdo
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        if (!emailBody) setEmailBody(e.target.value);
                      }}
                      placeholder="Escreva os detalhes do aviso ou comunicado..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-border bg-background-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                      Público Alvo
                    </label>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value as typeof targetAudience)}
                      className="min-h-11 w-full rounded-xl border border-border bg-background-secondary px-4 text-sm text-foreground focus:border-accent focus:bg-surface focus:outline-none"
                    >
                      <optgroup label="Geral">
                        <option value="all">Todos os alunos</option>
                        <option value="user">Usuário específico (E-mail / ID)</option>
                      </optgroup>
                      <optgroup label="Cursos">
                        <option value="course">Alunos de um curso específico</option>
                        <option value="course_completed">Concluíram o curso (Upsell)</option>
                        <option value="course_abandoned">Abandonaram o curso (Reengajamento)</option>
                      </optgroup>
                      <optgroup label="Comportamento (Growth)">
                        <option value="new_users">Novos alunos (Onboarding)</option>
                        <option value="inactive_7d">Ausentes há 7 dias (Reativação)</option>
                        <option value="inactive_30d">Ausentes há 30+ dias (Risco de Churn)</option>
                      </optgroup>
                    </select>
                  </div>

                  {["course", "user", "course_completed", "course_abandoned"].includes(targetAudience) && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                        {targetAudience === "user" ? "E-mail do Usuário" : "ID do Curso"}
                      </label>
                      <input
                        type="text"
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        placeholder={
                          targetAudience === "user" ? "Ex: aluno@email.com" : "Ex: course_123"
                        }
                        className="min-h-11 w-full rounded-xl border border-border bg-background-secondary px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                        required
                      />
                    </div>
                  )}

                  {/* Channels Selection */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                      Canais de Disparo
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 p-3 rounded-xl border border-border bg-background-secondary hover:bg-surface cursor-pointer text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={channels.includes("platform")}
                          onChange={() => toggleChannel("platform")}
                          className="w-4 h-4 rounded border-border text-accent focus:ring-primary"
                        />
                        <span className="text-foreground">Plataforma (Sininho)</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 rounded-xl border border-border bg-background-secondary hover:bg-surface cursor-pointer text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={channels.includes("push")}
                          onChange={() => toggleChannel("push")}
                          className="w-4 h-4 rounded border-border text-accent focus:ring-primary"
                        />
                        <span className="text-foreground">Push Notification</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-accent/40 bg-accent/5 hover:bg-accent/10 cursor-pointer text-xs font-bold transition-all">
                        <input
                          type="checkbox"
                          checked={channels.includes("email")}
                          onChange={() => toggleChannel("email")}
                          className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                        />
                        <span className="text-foreground flex items-center gap-1.5">
                          <Mail className="size-4 text-accent" /> E-mail (Resend)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Email Customization Card (Unfolds when email is active) */}
                {channels.includes("email") && (
                  <div className="p-5 rounded-2xl border-2 border-accent/20 bg-accent/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-accent/15 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-primary-soft text-accent grid place-items-center">
                          <Mail className="size-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                            Campos Personalizados do E-mail (Resend)
                          </h3>
                          <p className="text-[11px] text-muted">
                            Personalize o modelo, assunto, pré-texto e botão com link.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsPreviewOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/30 bg-surface text-xs font-bold text-accent hover:bg-primary-soft transition-colors"
                      >
                        <Eye className="size-3.5" /> Prévia do E-mail
                      </button>
                    </div>

                    {/* Template Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-foreground">Modelo de E-mail (HTML)</label>
                        <Link
                          href={`/admin/integracoes/resend/modelos/${emailTemplate}`}
                          target="_blank"
                          className="text-[11px] text-accent hover:underline font-semibold flex items-center gap-1"
                        >
                          Customizar layout no Studio <ExternalLink className="size-3" />
                        </Link>
                      </div>
                      <select
                        value={emailTemplate}
                        onChange={(e) => setEmailTemplate(e.target.value as EmailTemplateType)}
                        className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:border-accent focus:outline-none font-medium"
                      >
                        <option value="notification">📢 Comunicado & Notificação Geral (Recomendado)</option>
                        <option value="welcome">🚀 Boas-vindas à Plataforma</option>
                        <option value="course_enrollment">🎓 Matrícula em Curso</option>
                        <option value="inactivity">⏱️ Reengajamento por Inatividade</option>
                        <option value="subscription">⭐ Assinatura Confirmada</option>
                        <option value="certificate">🏆 Certificado de Conclusão</option>
                        <option value="password_reset">🔒 Redefinição de Senha</option>
                      </select>
                    </div>

                    {/* Email Subject & Preheader */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-foreground mb-1">
                          Assunto do E-mail (Subject)
                        </label>
                        <input
                          type="text"
                          name="emailSubject"
                          ref={(el) => {
                            if (el) el.onfocus = () => (activeInputRef.current = el);
                          }}
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Ex: 🔔 {{titulo_notificacao}}"
                          className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-xs font-mono text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-foreground mb-1">
                          Pré-texto (Preheader / Snippet)
                        </label>
                        <input
                          type="text"
                          name="emailPreviewText"
                          ref={(el) => {
                            if (el) el.onfocus = () => (activeInputRef.current = el);
                          }}
                          value={emailPreviewText}
                          onChange={(e) => setEmailPreviewText(e.target.value)}
                          placeholder="Texto exibido na caixa de entrada..."
                          className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-xs font-mono text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Email Heading & Body */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-foreground mb-1">
                          Título Interno do E-mail
                        </label>
                        <input
                          type="text"
                          name="emailTitle"
                          ref={(el) => {
                            if (el) el.onfocus = () => (activeInputRef.current = el);
                          }}
                          value={emailTitle}
                          onChange={(e) => setEmailTitle(e.target.value)}
                          placeholder="Título em destaque dentro do e-mail..."
                          className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-foreground mb-1">
                          Texto / Mensagem do E-mail
                        </label>
                        <textarea
                          name="emailBody"
                          ref={(el) => {
                            if (el) el.onfocus = () => (activeInputRef.current = el);
                          }}
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="Escreva a mensagem do e-mail (suporta quebras de linha e tags)..."
                          rows={3}
                          className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none leading-relaxed"
                        />
                      </div>
                    </div>

                    {/* CTA Button Label & Link */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-foreground mb-1">
                          Texto do Botão (CTA)
                        </label>
                        <input
                          type="text"
                          value={emailButtonText}
                          onChange={(e) => setEmailButtonText(e.target.value)}
                          placeholder="Ex: Acessar Agora"
                          className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground focus:border-accent focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-foreground mb-1">
                          Link do Botão (URL de Ação)
                        </label>
                        <input
                          type="text"
                          value={emailButtonUrl}
                          onChange={(e) => setEmailButtonUrl(e.target.value)}
                          placeholder="Ex: https://smartlms.com/cursos"
                          className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-xs font-mono text-foreground focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Variable Chips Toolbar */}
                    <div className="pt-2 border-t border-accent/15 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                        <Tag className="size-3" /> Inserir Tag Dinâmica (Clique para Copiar / Inserir)
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { tag: "{{nome}}", label: "Nome" },
                          { tag: "{{email}}", label: "E-mail" },
                          { tag: "{{nome_plataforma}}", label: "Plataforma" },
                          { tag: "{{link_acao}}", label: "Link do Botão" },
                          { tag: "{{texto_acao}}", label: "Texto do Botão" },
                          { tag: "{{data_atual}}", label: "Data" },
                        ].map((v) => (
                          <button
                            key={v.tag}
                            type="button"
                            onClick={() => handleInsertTag(v.tag)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-surface hover:border-accent text-[11px] font-mono text-foreground transition-all"
                          >
                            <span className="text-accent font-bold">{v.tag}</span>
                            <span className="text-[10px] text-muted font-sans">{v.label}</span>
                            {copiedTag === v.tag ? (
                              <Check className="size-2.5 text-success" />
                            ) : (
                              <Copy className="size-2.5 text-muted opacity-40" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSending}
                  className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 font-bold text-primary-foreground hover:bg-accent-hover transition-all disabled:opacity-50 shadow-sm"
                >
                  {isSending ? (
                    <RefreshCw className="size-5 animate-spin" />
                  ) : (
                    <Send className="size-5" />
                  )}
                  {channels.includes("email")
                    ? "Disparar Notificação & E-mail (Resend)"
                    : "Enviar Notificação"}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: History */}
          <div className="lg:col-span-5 space-y-6">
            <div className="editorial-card flex flex-col p-6 h-full">
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                <h2 className="text-base font-extrabold text-foreground">Histórico de Disparos</h2>
                <span className="text-xs text-muted font-bold">
                  {campaigns.length} registros
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[600px] pr-1 space-y-3.5">
                {campaigns.length === 0 ? (
                  <div className="py-16 text-center text-muted space-y-2">
                    <MailOpen className="size-8 mx-auto opacity-30" />
                    <p className="font-semibold text-xs">Nenhuma notificação enviada ainda.</p>
                  </div>
                ) : (
                  campaigns.map((notification) => (
                    <div
                      key={notification.id}
                      className="group relative rounded-xl border border-border/70 bg-background-secondary p-4 space-y-2 hover:border-accent/40 transition-all"
                    >
                      <h4 className="font-bold text-sm text-foreground pr-6">{notification.title}</h4>
                      <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>

                      {notification.channels && notification.channels.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap pt-1">
                          {notification.channels.map((channel: string) => (
                            <span
                              key={channel}
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                channel === "email"
                                  ? "bg-accent-soft text-accent"
                                  : "bg-background-secondary text-muted"
                              }`}
                            >
                              {channel === "platform" ? "Plataforma" : channel === "email" ? "E-mail (Resend)" : channel}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 text-[10px] pt-1">
                        <StatusBadge tone="primary">
                          {notification.target_audience === "all" && "Todos"}
                          {notification.target_audience === "course" && "Curso"}
                          {notification.target_audience === "user" && "Usuário"}
                          {notification.target_audience === "inactive_7d" && "Ausentes 7d"}
                          {notification.target_audience === "inactive_30d" && "Ausentes 30d"}
                          {notification.target_audience === "new_users" && "Novos Alunos"}
                          {notification.target_audience === "course_completed" && "Concluiu"}
                          {notification.target_audience === "course_abandoned" && "Abandonou"}
                          {notification.target_id ? ` (${notification.target_id})` : ""}
                        </StatusBadge>
                      </div>

                      {notification.views !== undefined && (
                        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border/50 text-[11px] text-muted">
                          <div className="flex items-center gap-1" title="Visualizações">
                            <Eye className="size-3" />
                            <span>{notification.views}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Aberturas">
                            <MailOpen className="size-3" />
                            <span>{notification.opens}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Cliques">
                            <MousePointerClick className="size-3" />
                            <span>{notification.clicks}</span>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await deleteNotificationCampaign(notification.id);
                            setCampaigns((prev) => prev.filter((c) => c.id !== notification.id));
                            toast.success("Campanha excluída com sucesso");
                          } catch (err: any) {
                            toast.error("Erro ao excluir: " + err.message);
                          }
                        }}
                        aria-label={`Excluir ${notification.title}`}
                        className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-lg text-muted opacity-0 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger transition-all"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Email Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary-soft text-accent grid place-items-center">
                  <Mail className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Prévia do E-mail Renderizado</h3>
                  <p className="text-[11px] text-muted">
                    Assunto: <span className="font-mono text-foreground font-semibold">{generatedPreviewSubject}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-background-secondary p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1.5 rounded text-xs ${
                      previewDevice === "desktop" ? "bg-surface shadow text-accent font-bold" : "text-muted"
                    }`}
                  >
                    <Laptop className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1.5 rounded text-xs ${
                      previewDevice === "mobile" ? "bg-surface shadow text-accent font-bold" : "text-muted"
                    }`}
                  >
                    <Smartphone className="size-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1.5 text-muted hover:text-foreground rounded-lg"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-100 p-3 rounded-xl border border-border">
              <div
                className={`mx-auto rounded-xl bg-white shadow-md overflow-hidden transition-all ${
                  previewDevice === "mobile" ? "max-w-[360px]" : "max-w-[580px]"
                }`}
              >
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Smart LMS &lt;onboarding@resend.dev&gt;</span>
                  <span>mariana@exemplo.com</span>
                </div>
                <iframe
                  title="Prévia do E-mail da Notificação"
                  srcDoc={generatedPreviewHtml}
                  className="w-full h-[480px] border-0"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-accent-hover transition-colors"
              >
                Fechar Prévia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
