"use client";

import { useState } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { Send, Trash2, Eye, MousePointerClick, MailOpen } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { AutomationsTab } from "./AutomationsTab";

export default function AdminNotificacoes() {
  const [activeTab, setActiveTab] = useState<"manual" | "automations">("manual");

  const { addNotification, notifications, deleteNotification } = useNotifications();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "course" | "user" | "inactive_7d" | "inactive_30d" | "new_users" | "course_completed" | "course_abandoned">("all");
  const [targetId, setTargetId] = useState("");
  const [channels, setChannels] = useState<("platform" | "push" | "email")[]>(["platform"]);

  const toggleChannel = (channel: "platform" | "push" | "email") => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !message) {
      toast.error("Preencha o título e a mensagem.");
      return;
    }

    const requiresId = ["course", "user", "course_completed", "course_abandoned"].includes(targetAudience);
    if (requiresId && !targetId) {
      toast.error("Informe o ID necessário para este público.");
      return;
    }

    if (channels.length === 0) {
      toast.error("Selecione pelo menos um canal de envio.");
      return;
    }

    addNotification({
      title,
      message,
      targetAudience,
      targetId: ["course", "user", "course_completed", "course_abandoned"].includes(targetAudience) ? targetId : undefined,
      channels,
    });

    toast.success("Notificação enviada com sucesso!");
    setTitle("");
    setMessage("");
    setTargetId("");
    setChannels(["platform"]);
  };

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Comunicação" title="Notificações" description="Envie avisos manuais ou crie automações poderosas baseadas no comportamento dos alunos." />

      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("manual")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "manual" ? "border-primary text-primary" : "border-transparent text-text-mute hover:text-text"
          }`}
        >
          Envio Avulso
        </button>
        <button
          onClick={() => setActiveTab("automations")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "automations" ? "border-primary text-primary" : "border-transparent text-text-mute hover:text-text"
          }`}
        >
          Automações
        </button>
      </div>

      {activeTab === "automations" ? (
        <AutomationsTab />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="editorial-card p-5 sm:p-6">
          <h2 className="mb-6 text-xl font-extrabold text-ink">Nova notificação</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Novo módulo liberado!"
                className="min-h-11 w-full rounded-[11px] border border-border bg-canvas-soft px-4 text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-1">Mensagem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Detalhes da notificação..."
                rows={4}
                className="w-full resize-none rounded-[11px] border border-border bg-canvas-soft px-4 py-3 text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-1">Público Alvo</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                className="min-h-11 w-full rounded-[11px] border border-border bg-canvas-soft px-4 text-text focus:border-primary focus:bg-surface focus:outline-none"
              >
                <optgroup label="Geral">
                  <option value="all">Todos os alunos</option>
                  <option value="user">Usuário específico</option>
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
                <label className="block text-sm font-semibold text-text mb-1">
                  {targetAudience === "user" ? "Email do Usuário / ID" : "ID do Curso"}
                </label>
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder={targetAudience === "user" ? "Ex: aluno@email.com" : "Ex: course_123"}
                  className="min-h-11 w-full rounded-[11px] border border-border bg-canvas-soft px-4 text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-text mb-2">Canais de Envio</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.includes("platform")}
                    onChange={() => toggleChannel("platform")}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text">Plataforma</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.includes("push")}
                    onChange={() => toggleChannel("push")}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text">Push Notification</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.includes("email")}
                    onChange={() => toggleChannel("email")}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text">Email</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-primary px-4 font-bold text-primary-foreground hover:bg-primary-active"
            >
              <Send className="w-5 h-5" /> Enviar Notificação
            </button>
          </form>
        </div>

        {/* History */}
        <div className="editorial-card flex flex-col p-5 sm:p-6">
          <h2 className="mb-6 text-xl font-extrabold text-ink">Histórico de envios</h2>
          
          <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 space-y-4">
            {notifications.length === 0 ? (
              <p className="text-text-mute text-center mt-10">Nenhuma notificação enviada ainda.</p>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="group relative rounded-[12px] border border-border bg-canvas-soft p-4">
                  <h4 className="font-bold text-text">{notification.title}</h4>
                  <p className="text-sm text-text-mute mt-1 line-clamp-2">{notification.message}</p>
                  
                  {notification.channels && notification.channels.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {notification.channels.map(channel => (
                        <span key={channel} className="text-[10px] font-bold uppercase tracking-wider bg-canvas-alt text-text-mute px-2 py-0.5 rounded-full">
                          {channel === 'platform' ? 'Plataforma' : channel}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3 text-xs">
                    <StatusBadge tone="primary">
                      {notification.targetAudience === 'all' && 'Todos'}
                      {notification.targetAudience === 'course' && 'Curso'}
                      {notification.targetAudience === 'user' && 'Usuário'}
                      {notification.targetAudience === 'inactive_7d' && 'Ausentes 7d'}
                      {notification.targetAudience === 'inactive_30d' && 'Ausentes 30d'}
                      {notification.targetAudience === 'new_users' && 'Novos Alunos'}
                      {notification.targetAudience === 'course_completed' && 'Concluiu Curso'}
                      {notification.targetAudience === 'course_abandoned' && 'Abandonou Curso'}
                      {notification.targetId ? ` (${notification.targetId})` : ''}
                    </StatusBadge>
                    <StatusBadge>Lida por {notification.read ? "1" : "0"} alunos</StatusBadge>
                  </div>
                  
                  {notification.stats && (
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/50 text-xs text-text-mute">
                      <div className="flex items-center gap-1.5" title="Visualizações">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{notification.stats.views}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Aberturas">
                        <MailOpen className="w-3.5 h-3.5" />
                        <span>{notification.stats.opens}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Cliques">
                        <MousePointerClick className="w-3.5 h-3.5" />
                        <span>{notification.stats.clicks}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => deleteNotification(notification.id)}
                    aria-label={`Excluir ${notification.title}`}
                    className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-[9px] text-text-mute opacity-100 hover:bg-negative/10 hover:text-negative md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
