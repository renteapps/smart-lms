"use client";

import { useState } from "react";
import { useAutomations } from "@/contexts/AutomationContext";
import { Plus, Play, Pause, Trash2, Eye, MousePointerClick, MailOpen, Activity } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/editorial";

export function AutomationsTab() {
  const { automations, addAutomation, toggleStatus, deleteAutomation } = useAutomations();

  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<"account_created" | "inactive" | "course_enrolled" | "course_abandoned" | "course_completed">("account_created");
  const [days, setDays] = useState(1);
  const [courseId, setCourseId] = useState("");
  
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<("platform" | "push" | "email")[]>(["platform"]);

  const toggleChannel = (channel: "platform" | "push" | "email") => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !title || !message) {
      toast.error("Preencha nome da automação, título e mensagem.");
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
      }
    });

    toast.success("Automação criada com sucesso!");
    setIsCreating(false);
    
    // Reset form
    setName("");
    setTitle("");
    setMessage("");
    setDays(1);
    setCourseId("");
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
      <div className="editorial-card p-5 sm:p-6 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-ink">Criar Nova Automação</h2>
          <button onClick={() => setIsCreating(false)} className="text-sm font-semibold text-text-mute hover:text-text">Cancelar</button>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          {/* Settings Group */}
          <div className="space-y-4 p-4 border border-border rounded-[12px] bg-canvas-alt/50">
            <h3 className="font-bold text-text flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Regra de Disparo (Trigger)
            </h3>
            
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Nome da Automação (Uso Interno)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Boas-vindas Dia 1"
                className="min-h-11 w-full rounded-[11px] border border-border bg-canvas-soft px-4 text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Gatilho Base</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as any)}
                  className="min-h-11 w-full rounded-[11px] border border-border bg-canvas-soft px-4 text-text focus:border-primary focus:bg-surface focus:outline-none"
                >
                  <option value="account_created">Criação de Conta (Onboarding)</option>
                  <option value="inactive">Ausência (Inatividade)</option>
                  <option value="course_enrolled">Matrícula no Curso</option>
                  <option value="course_abandoned">Abandono de Curso</option>
                  <option value="course_completed">Conclusão de Curso</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-1">Tempo (Dias)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    className="min-h-11 w-full rounded-[11px] border border-border bg-canvas-soft px-4 text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                    required
                  />
                  <span className="text-sm font-medium text-text-mute whitespace-nowrap">dias após</span>
                </div>
              </div>
            </div>

            {["course_enrolled", "course_abandoned", "course_completed"].includes(triggerType) && (
              <div>
                <label className="block text-sm font-semibold text-text mb-1">ID do Curso Específico</label>
                <input
                  type="text"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  placeholder="Ex: course_abc123"
                  className="min-h-11 w-full rounded-[11px] border border-border bg-canvas-soft px-4 text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                  required
                />
              </div>
            )}
          </div>

          {/* Action Group */}
          <div className="space-y-4">
            <h3 className="font-bold text-text">Conteúdo da Notificação</h3>
            
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
              <label className="block text-sm font-semibold text-text mb-2">Canais de Disparo</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={channels.includes("platform")} onChange={() => toggleChannel("platform")} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                  <span className="text-sm text-text">Plataforma</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={channels.includes("push")} onChange={() => toggleChannel("push")} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                  <span className="text-sm text-text">Push Notification</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={channels.includes("email")} onChange={() => toggleChannel("email")} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                  <span className="text-sm text-text">Email</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-primary px-4 font-bold text-primary-foreground hover:bg-primary-active"
          >
            Salvar Automação
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-primary/10 border border-primary/20 p-5 rounded-[16px]">
        <div>
          <h3 className="text-lg font-bold text-ink">Growth Engine</h3>
          <p className="text-sm text-text-mute max-w-xl mt-1">Crie réguas de relacionamento baseadas no comportamento do usuário. O sistema enviará notificações automaticamente quando o usuário atingir as condições estabelecidas.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex h-11 items-center justify-center gap-2 rounded-[11px] bg-primary px-5 font-bold text-primary-foreground hover:bg-primary-active shrink-0"
        >
          <Plus className="w-4 h-4" /> Criar Automação
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {automations.length === 0 ? (
          <div className="col-span-full py-12 text-center text-text-mute border-2 border-dashed border-border rounded-[16px]">
            Nenhuma automação criada ainda. Comece a criar réguas de onboarding e retenção!
          </div>
        ) : (
          automations.map((automation) => (
            <div key={automation.id} className={`relative rounded-[16px] border border-border bg-canvas-soft p-5 transition-opacity ${automation.status === 'paused' ? 'opacity-60' : 'opacity-100'}`}>
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-extrabold text-ink text-lg">{automation.name}</h4>
                <StatusBadge tone={automation.status === 'active' ? 'positive' : 'neutral'}>
                  {automation.status === 'active' ? 'Ativa' : 'Pausada'}
                </StatusBadge>
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md mb-4">
                <Activity className="w-3.5 h-3.5" />
                {triggerLabels[automation.trigger.type]} {automation.trigger.days} dias
                {automation.trigger.courseId && ` (${automation.trigger.courseId})`}
              </div>

              <div className="bg-canvas-alt rounded-[8px] p-3 mb-4">
                <p className="font-semibold text-text text-sm mb-1">{automation.action.title}</p>
                <p className="text-xs text-text-mute line-clamp-2">{automation.action.message}</p>
                <div className="flex gap-2 mt-2">
                  {automation.action.channels.map(c => (
                    <span key={c} className="text-[9px] uppercase tracking-wider bg-canvas text-text px-1.5 py-0.5 rounded border border-border">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-border/50 text-xs text-text-mute">
                <div className="flex flex-col items-center gap-1 text-center" title="Disparos realizados">
                  <span className="font-bold text-text">{automation.stats.triggeredCount}</span>
                  <span className="text-[10px]">Envios</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center" title="Visualizações">
                  <span className="font-bold text-text">{automation.stats.views}</span>
                  <span className="text-[10px]">Views</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center" title="Aberturas">
                  <span className="font-bold text-text">{automation.stats.opens}</span>
                  <span className="text-[10px]">Abertas</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center" title="Cliques">
                  <span className="font-bold text-text">{automation.stats.clicks}</span>
                  <span className="text-[10px]">Cliques</span>
                </div>
              </div>

              <div className="absolute top-4 right-4 flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => toggleStatus(automation.id)}
                  className="grid h-8 w-8 place-items-center rounded-[8px] text-text-mute hover:bg-canvas-alt hover:text-text"
                  title={automation.status === 'active' ? "Pausar" : "Ativar"}
                >
                  {automation.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteAutomation(automation.id)}
                  className="grid h-8 w-8 place-items-center rounded-[8px] text-text-mute hover:bg-negative/10 hover:text-negative"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
