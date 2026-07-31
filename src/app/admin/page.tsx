import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, MessageSquare, Plus, Route, TrendingUp, Users } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/editorial";

const activity = [
  { person: "Marina Souza", action: "concluiu Comunicação que move pessoas", time: "há 12 min", tone: "positive" as const },
  { person: "Rafael Lima", action: "iniciou sua trilha de liderança", time: "há 34 min", tone: "primary" as const },
  { person: "Curso atualizado", action: "Feedback que transforma foi publicado", time: "há 1 h", tone: "warning" as const },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Visão operacional" title="Bom dia, Nohan" description="Acompanhe o que está acontecendo na plataforma e priorize as próximas ações." actions={<Link href="/admin/cursos/novo" className="inline-flex min-h-11 items-center gap-2 rounded-[11px] bg-primary px-4 text-sm font-bold text-on-primary shadow-sm hover:bg-primary-active"><Plus className="h-4 w-4" /> Novo curso</Link>} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
        <StatCard label="Usuários ativos" value="1.248" helper="+8,2% nos últimos 30 dias" icon={Users} tone="primary" />
        <StatCard label="Cursos publicados" value="24" helper="3 em edição" icon={BookOpen} tone="sage" />
        <StatCard label="Horas assistidas" value="12,5 mil" helper="+1,4 mil neste mês" icon={Clock3} tone="terracotta" />
        <StatCard label="Conclusão média" value="68%" helper="4 p.p. acima do mês anterior" icon={TrendingUp} tone="neutral" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="editorial-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <div><h2 className="text-lg font-extrabold text-ink">Atividade recente</h2><p className="mt-1 text-xs font-medium text-text-mute">Movimentos importantes nas últimas horas</p></div>
            <button className="min-h-10 rounded-[10px] px-3 text-sm font-bold text-primary-active hover:bg-primary-pale">Ver relatório</button>
          </div>
          <div>
            {activity.map((item) => (
              <div key={`${item.person}-${item.time}`} className="flex items-start gap-4 border-b border-border/70 px-5 py-4 last:border-0 sm:px-6">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1"><p className="text-sm text-text-soft"><strong className="text-ink">{item.person}</strong> {item.action}</p><p className="mt-1 text-xs font-medium text-text-mute">{item.time}</p></div>
                <StatusBadge tone={item.tone}>Atualização</StatusBadge>
              </div>
            ))}
          </div>
        </article>

        <aside className="editorial-card p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-ink">Ações rápidas</h2>
          <p className="mt-1 text-xs font-medium text-text-mute">Atalhos para as tarefas mais frequentes</p>
          <div className="mt-5 space-y-2">
            <Link href="/admin/onboarding" className="flex min-h-14 items-center gap-3 rounded-[12px] border border-border px-3 text-sm font-bold text-ink hover:border-primary/25 hover:bg-primary-pale/35"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-primary-pale text-primary"><Route className="h-4 w-4" /></span><span className="flex-1">Editar trilha</span><ArrowRight className="h-4 w-4 text-text-mute" /></Link>
            <Link href="/admin/cursos" className="flex min-h-14 items-center gap-3 rounded-[12px] border border-border px-3 text-sm font-bold text-ink hover:border-primary/25 hover:bg-primary-pale/35"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-accent-sage/15 text-positive"><BookOpen className="h-4 w-4" /></span><span className="flex-1">Gerenciar cursos</span><ArrowRight className="h-4 w-4 text-text-mute" /></Link>
            <Link href="/admin/comentarios" className="flex min-h-14 items-center gap-3 rounded-[12px] border border-border px-3 text-sm font-bold text-ink hover:border-primary/25 hover:bg-primary-pale/35"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-accent-orange/12 text-accent-orange"><MessageSquare className="h-4 w-4" /></span><span className="flex-1">Moderar comentários</span><ArrowRight className="h-4 w-4 text-text-mute" /></Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
