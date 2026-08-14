"use client";

import { useState } from "react";
import Link from "next/link";
import { useAutomations } from "@/contexts/AutomationContext";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  MailOpen,
  Activity,
  Mail,
  ExternalLink,
  Tag,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/editorial";
import { EmailTemplateType } from "@/types/resend";

export function AutomationsTab() {
  const { automations, addAutomation, toggleStatus, deleteAutomation } = useAutomations();

  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<
    "account_created" | "inactive" | "course_enrolled" | "course_abandoned" | "course_completed"
  >("account_created");
  const [days, setDays] = useState(1);
  const [courseId, setCourseId] = useState("");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<("platform" | "push" | "email")[]>(["platform"]);

  // Custom Email Fields
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplateType>("notification");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailPreviewText, setEmailPreviewText] = useState("");
  const [emailTitle, setEmailTitle] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailButtonText, setEmailButtonText] = useState("Acessar Agora");
  const [emailButtonUrl, setEmailButtonUrl] = useState("https://smartlms.com/cursos");
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const toggleChannel = (channel: "platform" | "push" | "email") => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    toast.success(`Tag ${tag} copiada!`);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !title || !message) {
      toast.error("Preencha o nome da automação, título e mensagem.");
      return;
    }

    if (["course_enrolled", "course_abandoned", "course_completed"].includes(triggerType) && !courseId) {
      toast.error("Informe o ID do curso para este gatilho.");
      return;
    }

    if (channels.length === 0) {
      toast.error("Selecione pelo menos um canal de envio.");
      return;
    }

    addAutomation({
      name,
      trigger: {
        type: triggerType,
        days,
        courseId: courseId || undefined,
      },
      action: {
        title,
        message,
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
      },
    });

    toast.success("Automação criada com sucesso!");
    setIsCreating(false);

    // Reset form
    setName("");
    setTitle("");
    setMessage("");
    setDays(1);
    setCourseId("");
    setEmailSubject("");
    setEmailPreviewText("");
    setEmailTitle("");
    setEmailBody("");
    setChannels(["platform"]);
  };

  const triggerLabels = {
    account_created: "Conta criada há",
    inactive: "Inativo há",
    course_enrolled: "Matriculado há",
    course_abandoned: "Abandonou curso há",
    course_completed: "Concluiu curso há",
  };

  if (isCreating) {
    return (
      <div className="editorial-card p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-border/60 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-ink">Criar Nova Automação de Growth</h2>
            <p className="text-xs text-text-mute mt-0.5">
              Configure regras automáticas de reengajamento e comunicação para seus alunos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="text-xs font-semibold text-text-mute hover:text-text px-3 py-1.5 rounded-lg border border-border"
          >
            Cancelar
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Settings Group */}
          <div className="space-y-4 p-5 border border-border rounded-2xl bg-canvas-soft">
            <h3 className="font-bold text-sm text-text flex items-center gap-2">
              <Activity className="size-4 text-primary" /> Regra de Disparo (Trigger)
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-1.5">
                Nome da Automação (Uso Interno)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Boas-vindas Dia 3 - Tutorial de Agentes"
                className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-text-mute focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-1.5">
                  Gatilho Base
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => {
                    const newType = e.target.value as typeof triggerType;
                    setTriggerType(newType);
                    if (newType === "inactive") setEmailTemplate("inactivity");
                    else if (newType === "account_created") setEmailTemplate("welcome");
                    else if (newType === "course_enrolled") setEmailTemplate("course_enrollment");
                    else if (newType === "course_completed") setEmailTemplate("certificate");
                  }}
                  className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text focus:border-primary focus:outline-none"
                >
                  <option value="account_created">Criação de Conta (Onboarding)</option>
                  <option value="inactive">Ausência (Inatividade)</option>
                  <option value="course_enrolled">Matrícula no Curso</option>
                  <option value="course_abandoned">Abandono de Curso</option>
                  <option value="course_completed">Conclusão de Curso</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-1.5">
                  Tempo de Espera (Dias)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                    className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-text-mute focus:border-primary focus:outline-none"
                    required
                  />
                  <span className="text-xs font-medium text-text-mute whitespace-nowrap">
                    dias após o evento
                  </span>
                </div>
              </div>
            </div>

            {["course_enrolled", "course_abandoned", "course_completed"].includes(triggerType) && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-1.5">
                  ID do Curso Específico
                </label>
                <input
                  type="text"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  placeholder="Ex: curso_nextjs_pro"
                  className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-text-mute focus:border-primary focus:outline-none"
                  required
                />
              </div>
            )}
          </div>

          {/* Action Group */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-text">Conteúdo do Disparo</h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-1.5">
                Título da Mensagem
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!emailTitle) setEmailTitle(e.target.value);
                  if (!emailSubject) setEmailSubject(`🔔 ${e.target.value}`);
                }}
                placeholder="Ex: Como estão seus estudos? Temos uma novidade!"
                className="min-h-11 w-full rounded-xl border border-border bg-canvas-soft px-4 text-sm text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-1.5">
                Mensagem
              </label>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (!emailBody) setEmailBody(e.target.value);
                }}
                placeholder="Escreva os detalhes da mensagem..."
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-canvas-soft px-4 py-3 text-sm text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none leading-relaxed"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-2">
                Canais de Disparo
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-border bg-canvas-soft hover:bg-surface cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={channels.includes("platform")}
                    onChange={() => toggleChannel("platform")}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-text">Plataforma</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-border bg-canvas-soft hover:bg-surface cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={channels.includes("push")}
                    onChange={() => toggleChannel("push")}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-text">Push Notification</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-accent/40 bg-accent/5 hover:bg-accent/10 cursor-pointer text-xs font-bold transition-all">
                  <input
                    type="checkbox"
                    checked={channels.includes("email")}
                    onChange={() => toggleChannel("email")}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="text-ink flex items-center gap-1.5">
                    <Mail className="size-4 text-accent" /> E-mail (Resend)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Email Customization Fields for Automations */}
          {channels.includes("email") && (
            <div className="p-5 rounded-2xl border-2 border-primary/20 bg-primary/5 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-primary/15 pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-primary-soft text-primary grid place-items-center">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                      Modelo & Campos de E-mail da Automação
                    </h3>
                    <p className="text-[11px] text-text-mute">
                      Personalize como o e-mail automatizado será montado pelo Resend.
                    </p>
                  </div>
                </div>
              </div>

              {/* Template Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-text">Modelo de E-mail (HTML)</label>
                  <Link
                    href={`/admin/integracoes/resend/modelos/${emailTemplate}`}
                    target="_blank"
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    Abrir Studio de Modelos <ExternalLink className="size-3" />
                  </Link>
                </div>
                <select
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value as EmailTemplateType)}
                  className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-xs text-text focus:border-primary focus:outline-none font-medium"
                >
                  <option value="notification">📢 Notificação Geral / Comunicado</option>
                  <option value="welcome">🚀 Boas-vindas à Plataforma</option>
                  <option value="inactivity">⏱️ Reengajamento por Inatividade</option>
                  <option value="course_enrollment">🎓 Matrícula em Curso</option>
                  <option value="certificate">🏆 Certificado de Conclusão</option>
                  <option value="subscription">⭐ Assinatura Confirmada</option>
                </select>
              </div>

              {/* Subject & Preheader */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-text mb-1">
                    Assunto do E-mail (Subject)
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Ex: 🔔 {{titulo_notificacao}}"
                    className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-xs font-mono text-text placeholder:text-text-mute focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text mb-1">
                    Pré-texto (Preheader)
                  </label>
                  <input
                    type="text"
                    value={emailPreviewText}
                    onChange={(e) => setEmailPreviewText(e.target.value)}
                    placeholder="Resumo na caixa de entrada..."
                    className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-xs font-mono text-text placeholder:text-text-mute focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Title & Body */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-text mb-1">
                    Título Interno do E-mail
                  </label>
                  <input
                    type="text"
                    value={emailTitle}
                    onChange={(e) => setEmailTitle(e.target.value)}
                    placeholder="Título principal no corpo do e-mail..."
                    className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-xs text-text placeholder:text-text-mute focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text mb-1">
                    Texto / Mensagem do E-mail
                  </label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Texto personalizado do e-mail..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-mute focus:border-primary focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* CTA Button */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-text mb-1">
                    Texto do Botão
                  </label>
                  <input
                    type="text"
                    value={emailButtonText}
                    onChange={(e) => setEmailButtonText(e.target.value)}
                    placeholder="Ex: Continuar Estudos"
                    className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text mb-1">
                    Link do Botão (URL)
                  </label>
                  <input
                    type="text"
                    value={emailButtonUrl}
                    onChange={(e) => setEmailButtonUrl(e.target.value)}
                    placeholder="Ex: https://smartlms.com/minha-trilha"
                    className="w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-xs font-mono text-text focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Tags Helper */}
              <div className="pt-2 border-t border-primary/15 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-mute flex items-center gap-1">
                  <Tag className="size-3" /> Variáveis Dinâmicas Disponíveis
                </span>
                <div className="flex flex-wrap gap-1">
                  {["{{nome}}", "{{email}}", "{{nome_plataforma}}", "{{link_acao}}", "{{texto_acao}}"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleCopyTag(tag)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-surface hover:border-primary text-[11px] font-mono text-text transition-all"
                    >
                      <span className="text-primary font-bold">{tag}</span>
                      {copiedTag === tag ? (
                        <Check className="size-2.5 text-success" />
                      ) : (
                        <Copy className="size-2.5 text-text-mute opacity-40" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold text-text hover:bg-canvas-soft transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-active transition-all shadow-sm"
            >
              <Plus className="size-4" /> Salvar e Ativar Automação
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-primary/10 border border-primary/20 p-5 rounded-2xl">
        <div>
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <Activity className="size-4 text-primary" /> Growth Engine & Réguas de Automação
          </h3>
          <p className="text-xs text-text-mute max-w-xl mt-1 leading-relaxed">
            Crie réguas de relacionamento acionadas automaticamente pelo comportamento do aluno (onboarding, ausência, matrículas e conclusões), enviando notificações na plataforma e e-mails via Resend.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary-active shrink-0 shadow-sm"
        >
          <Plus className="size-4" /> Criar Automação
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {automations.length === 0 ? (
          <div className="col-span-full py-16 text-center text-text-mute border-2 border-dashed border-border rounded-2xl space-y-2">
            <MailOpen className="size-8 mx-auto opacity-30 text-text-mute" />
            <p className="font-semibold text-xs text-text">Nenhuma automação criada ainda.</p>
            <p className="text-xs text-text-mute">
              Comece criando réguas automáticas de boas-vindas, reativação por inatividade ou parabéns por certificados!
            </p>
          </div>
        ) : (
          automations.map((automation) => (
            <div
              key={automation.id}
              className={`relative rounded-2xl border border-border bg-canvas-soft p-5 transition-all hover:border-primary/40 space-y-3 ${
                automation.status === "paused" ? "opacity-60" : "opacity-100"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-text text-sm">{automation.name}</h4>
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md mt-1">
                    <Activity className="size-3" />
                    {triggerLabels[automation.trigger.type]} {automation.trigger.days} dias
                    {automation.trigger.courseId && ` (${automation.trigger.courseId})`}
                  </div>
                </div>
                <StatusBadge tone={automation.status === "active" ? "positive" : "neutral"}>
                  {automation.status === "active" ? "Ativa" : "Pausada"}
                </StatusBadge>
              </div>

              <div className="bg-surface rounded-xl p-3 border border-border/60 space-y-1.5">
                <p className="font-bold text-text text-xs">{automation.action.title}</p>
                <p className="text-xs text-text-mute line-clamp-2 leading-relaxed">
                  {automation.action.message}
                </p>
                <div className="flex gap-1.5 pt-1 flex-wrap">
                  {automation.action.channels.map((c) => (
                    <span
                      key={c}
                      className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                        c === "email"
                          ? "bg-accent-soft text-accent"
                          : "bg-canvas-alt text-text-mute"
                      }`}
                    >
                      {c === "email" ? "E-mail (Resend)" : c === "platform" ? "Plataforma" : c}
                    </span>
                  ))}
                  {automation.action.emailDetails?.template && (
                    <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-mono bg-primary/10 text-primary">
                      Modelo: {automation.action.emailDetails.template}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50 text-[11px] text-text-mute">
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <span className="font-bold text-text">{automation.stats.triggeredCount}</span>
                  <span className="text-[10px]">Envios</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <span className="font-bold text-text">{automation.stats.views}</span>
                  <span className="text-[10px]">Views</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <span className="font-bold text-text">{automation.stats.opens}</span>
                  <span className="text-[10px]">Abertas</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <span className="font-bold text-text">{automation.stats.clicks}</span>
                  <span className="text-[10px]">Cliques</span>
                </div>
              </div>

              <div className="absolute top-4 right-4 flex gap-1">
                <button
                  type="button"
                  onClick={() => toggleStatus(automation.id)}
                  className="grid size-7 place-items-center rounded-lg text-text-mute hover:bg-surface hover:text-text transition-colors"
                  title={automation.status === "active" ? "Pausar" : "Ativar"}
                >
                  {automation.status === "active" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => deleteAutomation(automation.id)}
                  className="grid size-7 place-items-center rounded-lg text-text-mute hover:bg-negative/10 hover:text-negative transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
