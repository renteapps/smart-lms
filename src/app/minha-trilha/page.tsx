'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, BookOpenText, CalendarDays, Check, CheckCircle2, Clock3,
  ExternalLink, LayoutList, RefreshCw, Route, Sparkles, Target,
} from 'lucide-react';
import { LearningTrail, LearningTrailItem } from '@/types/trilha';
import { readLearningTrail, saveLearningTrail } from '@/lib/trailStorage';
import { replanLearningTrail, toLocalDateKey } from '@/lib/matching';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

const roleLabels = { essential: 'Essencial', deepening: 'Aprofundamento', extra: 'Extra' };
const roleStyles = { essential: 'bg-primary-pale text-primary-active', deepening: 'bg-accent-orange/12 text-accent-orange', extra: 'bg-canvas-soft text-text-soft' };

function contentHref(item: LearningTrailItem): string {
  if (item.type === 'lesson') return `/courses/${item.courseId || 'c1'}/lessons/${item.id}`;
  if (item.type === 'article') return item.slug ? `/blog/${item.slug}` : '/blog';
  return item.url || '#';
}

function statusLabel(item: LearningTrailItem, today: string): string {
  if (item.status === 'completed') return 'Concluído';
  if (item.rescheduled) return 'Atrasado replanejado';
  if (item.scheduledDate === today) return 'Hoje';
  return 'Planejado';
}

function TrailContentCard({ item, today }: { item: LearningTrailItem; today: string }) {
  const href = contentHref(item);
  const external = item.type === 'external_link';
  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]', roleStyles[item.learningRole])}>{roleLabels[item.learningRole]}</span>
            <span className={cn('text-[10px] font-extrabold uppercase tracking-[0.08em]', item.status === 'completed' ? 'text-positive' : item.rescheduled ? 'text-warning' : 'text-text-mute')}>{statusLabel(item, today)}</span>
          </div>
          <h3 className="mt-3 text-base font-extrabold leading-snug text-ink sm:text-lg">{item.title}</h3>
          <p className="mt-2 text-xs leading-5 text-text-soft">{item.reason}</p>
        </div>
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-[10px]', item.status === 'completed' ? 'bg-positive/10 text-positive' : 'bg-primary-pale text-primary')}>
          {item.status === 'completed' ? <Check size={18} /> : external ? <ExternalLink size={18} /> : <BookOpenText size={18} />}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs font-semibold text-text-mute">
        <span className="flex items-center gap-1.5"><Clock3 size={14} /> {item.durationMin} minutos</span>
        {item.overBudget && <span className="text-warning">Acima da meta</span>}
        <ArrowRight className="h-4 w-4 text-primary" />
      </div>
    </>
  );

  const classes = 'editorial-card editorial-card-interactive block min-h-[172px] p-4 sm:p-5';
  return external ? <a href={href} target="_blank" rel="noreferrer" className={classes}>{body}</a> : <Link href={href} className={classes}>{body}</Link>;
}

export default function MinhaTrilhaPage() {
  const [trail, setTrail] = useState<LearningTrail | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [replanned, setReplanned] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const { addNotification } = useNotifications();
  const today = toLocalDateKey(new Date());

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const result = readLearningTrail();
      if (result.data) {
        const next = replanLearningTrail(result.data);
        setTrail(next.trail);
        setReplanned(next.changed);
        if (next.changed || result.migrated) saveLearningTrail(next.trail);
      } else if (result.error) setStorageError(true);
      setIsLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const sessions = useMemo(() => {
    if (!trail) return [];
    const groups = trail.items.reduce<Record<string, LearningTrailItem[]>>((result, item) => {
      result[item.sessionId] = [...(result[item.sessionId] || []), item];
      return result;
    }, {});
    return Object.entries(groups).sort(([, a], [, b]) => a[0].scheduledDate.localeCompare(b[0].scheduledDate));
  }, [trail]);

  const todayItems = trail?.items.filter((item) => item.scheduledDate === today) || [];
  const todayPending = todayItems.filter((item) => item.status === 'pending');
  const completed = trail?.items.filter((item) => item.status === 'completed').length || 0;
  const completion = trail?.items.length ? Math.round((completed / trail.items.length) * 100) : 0;
  const weeklyMinutes = trail ? trail.availability.weekdays.length * trail.availability.minutesPerSession : 0;
  const focus = trail ? Object.values(trail.answers).flat()[0] || 'Seu desenvolvimento' : 'Seu desenvolvimento';

  useEffect(() => {
    if (!isLoaded || todayPending.length === 0) return;
    const notificationKey = `@smartlms:last_trilha_notif:${today}`;
    if (localStorage.getItem(notificationKey)) return;
    addNotification({ title: 'Sua sessão de hoje está pronta', message: `${todayPending.length} conteúdo(s), ${todayPending.reduce((sum, item) => sum + item.durationMin, 0)} minutos planejados.`, targetAudience: 'all', channels: ['platform'] });
    localStorage.setItem(notificationKey, 'sent');
  }, [addNotification, isLoaded, today, todayPending]);

  if (!isLoaded) return <div className="min-h-[70vh] pt-[76px]" aria-label="Carregando sua trilha" />;

  if (!trail || trail.items.length === 0) {
    return (
      <main className="editorial-container flex min-h-[78vh] items-center justify-center pt-[76px]">
        <section className="editorial-card max-w-xl px-6 py-12 text-center sm:px-12">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-[12px] bg-primary-pale text-primary"><Route size={26} /></span>
          <p className="eyebrow mt-6">Sua próxima etapa</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-ink">Vamos montar uma rotina que cabe na sua semana.</h1>
          <p className="mt-4 leading-7 text-text-soft">{storageError ? 'Não foi possível ler a trilha salva neste dispositivo. Suas respostas originais não foram apagadas.' : 'Responda algumas perguntas e receba sessões organizadas pelos seus objetivos e pelo tempo disponível.'}</p>
          <Link href="/onboarding" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-primary px-6 font-bold text-white hover:bg-primary-active">Criar minha trilha <ArrowRight size={17} /></Link>
        </section>
      </main>
    );
  }

  return (
    <div className="pt-[76px]">
      <section className="border-b border-border bg-primary-pale/35">
        <div className="editorial-container py-9 sm:py-14">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-surface px-3 py-1.5 text-xs font-bold text-primary-active shadow-sm"><Sparkles className="h-3.5 w-3.5" /> Agenda personalizada</div><h1 className="max-w-3xl text-[2rem] font-extrabold leading-[1.04] tracking-[-0.05em] text-ink sm:text-5xl lg:text-6xl">Uma rotina clara, no seu ritmo.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-text-soft sm:text-lg">Seu plano distribui o que importa nos dias que você escolheu — sem bloquear o restante do conteúdo.</p></div>
            <Link href="/onboarding?edit=1" className="inline-flex min-h-11 items-center justify-center rounded-[11px] border border-border bg-surface px-4 text-sm font-bold text-ink shadow-sm hover:border-primary/30 hover:text-primary-active">Ajustar objetivos e rotina</Link>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-2.5 sm:mt-9 sm:grid-cols-4 sm:gap-4">
            <div className="editorial-card p-4 sm:p-5"><Route className="h-5 w-5 text-primary" /><p className="mt-3 text-xs font-semibold text-text-mute">Progresso real</p><p className="mt-1 font-display text-2xl font-extrabold text-ink">{completion}%</p></div>
            <div className="editorial-card p-4 sm:p-5"><CheckCircle2 className="h-5 w-5 text-positive" /><p className="mt-3 text-xs font-semibold text-text-mute">Concluídos</p><p className="mt-1 font-display text-2xl font-extrabold text-ink">{completed}/{trail.items.length}</p></div>
            <div className="editorial-card p-4 sm:p-5"><Clock3 className="h-5 w-5 text-accent-orange" /><p className="mt-3 text-xs font-semibold text-text-mute">Meta semanal</p><p className="mt-1 font-display text-2xl font-extrabold text-ink">{weeklyMinutes} min</p></div>
            <div className="editorial-card min-w-0 p-4 sm:p-5"><Target className="h-5 w-5 text-primary" /><p className="mt-3 text-xs font-semibold text-text-mute">Foco principal</p><p className="mt-1 truncate font-display text-lg font-extrabold text-ink">{focus}</p></div>
          </div>
        </div>
      </section>

      <main className="editorial-container py-10 sm:py-14">
        {replanned && <div className="mb-8 flex items-start gap-3 rounded-[12px] border border-warning/25 bg-warning/8 p-4 text-sm text-text-soft"><RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-warning" /><div><strong className="text-ink">Sua agenda foi reorganizada.</strong><p className="mt-1">Conteúdos que ficaram pendentes foram distribuídos nas próximas sessões disponíveis.</p></div></div>}

        {todayPending.length > 0 ? (
          <section className="mb-12 overflow-hidden rounded-[14px] bg-ink text-white shadow-[var(--shadow-card)]">
            <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">Sua sessão de hoje</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">Um passo possível agora.</h2><p className="mt-3 text-sm leading-6 text-white/70">O plano reservou {trail.availability.minutesPerSession} minutos. Os conteúdos pendentes somam {todayPending.reduce((sum, item) => sum + item.durationMin, 0)} minutos.</p><div className="mt-5 flex items-center gap-2 text-sm font-bold text-white/85"><Clock3 className="h-4 w-4" /> {todayPending.length} {todayPending.length === 1 ? 'conteúdo' : 'conteúdos'} nesta sessão</div></div>
              <div className="grid gap-4 sm:grid-cols-2">{todayPending.slice(0, 2).map((item) => <TrailContentCard key={item.id} item={item} today={today} />)}</div>
            </div>
          </section>
        ) : (
          <section className="mb-12 flex flex-col gap-4 rounded-[14px] border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><p className="eyebrow">Hoje</p><h2 className="mt-2 text-2xl font-extrabold text-ink">Nenhuma sessão pendente para hoje.</h2><p className="mt-2 text-sm text-text-soft">Você pode descansar ou adiantar qualquer conteúdo planejado — nada está bloqueado.</p></div><CheckCircle2 className="h-10 w-10 shrink-0 text-positive" /></section>
        )}

        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Plano de aprendizagem</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink">Suas próximas sessões</h2></div><div className="flex w-fit items-center rounded-[12px] border border-border bg-surface p-1 shadow-sm"><button onClick={() => setViewMode('timeline')} className={cn('flex min-h-10 items-center gap-2 rounded-[9px] px-4 text-sm font-bold', viewMode === 'timeline' ? 'bg-primary text-white' : 'text-text-soft')}><LayoutList size={16} /> Trilha</button><button onClick={() => setViewMode('calendar')} className={cn('flex min-h-10 items-center gap-2 rounded-[9px] px-4 text-sm font-bold', viewMode === 'calendar' ? 'bg-primary text-white' : 'text-text-soft')}><CalendarDays size={16} /> Agenda</button></div></div>

        <div className={cn(viewMode === 'timeline' ? 'space-y-9' : 'grid gap-7 lg:grid-cols-2')}>
          {sessions.map(([sessionId, items], index) => {
            const date = new Date(`${items[0].scheduledDate}T12:00:00`);
            return <section key={sessionId} className={cn(viewMode === 'calendar' && 'rounded-[14px] border border-border bg-surface p-5')}><div className="mb-5 flex items-center gap-4"><span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-extrabold', items[0].scheduledDate === today ? 'bg-primary text-white' : 'bg-canvas-soft text-text-soft')}>{index + 1}</span><div><h3 className="font-extrabold capitalize text-ink">{date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h3><p className="mt-1 text-xs font-semibold text-text-mute">{items.reduce((sum, item) => sum + item.durationMin, 0)} minutos · {items.length} {items.length === 1 ? 'conteúdo' : 'conteúdos'}</p></div><span className="h-px flex-1 bg-border" /></div><div className={cn('grid gap-4', viewMode === 'timeline' && 'md:grid-cols-2 xl:grid-cols-3')}>{items.map((item) => <TrailContentCard key={item.id} item={item} today={today} />)}</div></section>;
          })}
        </div>
      </main>
    </div>
  );
}
