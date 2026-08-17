'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, BookOpenText, CalendarDays, Check, CheckCircle2, Clock3,
  ExternalLink, LayoutList, RefreshCw, RotateCcw, Route, Settings2, Sparkles, Target, Trash2,
} from 'lucide-react';
import {
  Alert, Button, buttonVariants, Card, Chip, Description, Drawer, EmptyState, Fieldset,
  Label, NumberField, ProgressBar, Skeleton, Tabs, ToggleButton, ToggleButtonGroup,
} from '@heroui/react';
import { LearningRole, LearningTrail, LearningTrailItem, SessionLoadRating, StudyAvailability, Weekday } from '@/types/trilha';
import { readLearningTrail, saveLearningTrail } from '@/lib/trailStorage';
import { applySessionFeedback, postponeTrailSession, removeTrailItem, replanLearningTrail, restoreTrailItem, toLocalDateKey, updateTrailAvailability } from '@/lib/matching';
import { contentHref } from '@/lib/studentHome';
import { createDemoLearningTrail } from '@/lib/mocks/trilhaDemo';
import { recordTrailEvent, TrailAnalyticsEvent, TrailAnalyticsEventType } from '@/lib/trailAnalytics';
import { useNotifications } from '@/contexts/NotificationContext';
import { useCardTransition } from '@/contexts/CardTransitionContext';
import { StatCard } from '@/components/ui/editorial';
import { TrailIcon } from '@/components/ui/AnimatedIcon';
import { Reveal } from '@/components/ui/Reveal';
import { Rise } from '@/components/ui/Rise';
import { cn } from '@/lib/utils';

const roleLabels: Record<LearningRole, string> = { essential: 'Essencial', deepening: 'Aprofundamento', extra: 'Extra' };
const roleColors: Record<LearningRole, 'accent' | 'warning' | 'default'> = { essential: 'accent', deepening: 'warning', extra: 'default' };
const weekdays: Array<{ value: Weekday; label: string }> = [
  { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' }, { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sáb' }, { value: 0, label: 'Dom' },
];
const minutePresets = [15, 30, 45, 60, 90];
const feedbackLabels: Array<{ value: SessionLoadRating; label: string; detail: string }> = [
  { value: 'light', label: 'Foi leve', detail: '+10 min nas próximas' },
  { value: 'right', label: 'Na medida', detail: 'mantém o ritmo' },
  { value: 'heavy', label: 'Foi pesado', detail: '-10 min nas próximas' },
];

function statusLabel(item: LearningTrailItem, today: string): string {
  if (item.status === 'completed') return 'Concluído';
  if (item.rescheduled) return 'Atrasado replanejado';
  if (item.scheduledDate === today) return 'Hoje';
  return 'Planejado';
}

/** Estado nunca é só cor: cada situação tem cor, ícone e texto. */
function statusVisual(item: LearningTrailItem, today: string) {
  if (item.status === 'completed') return { color: 'success', icon: <Check className="size-3" aria-hidden="true" /> } as const;
  if (item.rescheduled) return { color: 'warning', icon: <RefreshCw className="size-3" aria-hidden="true" /> } as const;
  if (item.scheduledDate === today) return { color: 'accent', icon: <Sparkles className="size-3" aria-hidden="true" /> } as const;
  return { color: 'default', icon: <CalendarDays className="size-3" aria-hidden="true" /> } as const;
}

type TrailContentCardProps = {
  item: LearningTrailItem;
  today: string;
  /** Dentro do card de destaque o realce já existe no contêiner — não empilhar. */
  subdued?: boolean;
};

function TrailContentCard({ item, today, subdued = false }: TrailContentCardProps) {
  const { triggerTransition } = useCardTransition();
  const href = contentHref(item);
  const external = item.type === 'external_link';
  const completed = item.status === 'completed';
  const status = statusVisual(item, today);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      external ||
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey ||
      !href ||
      href === '#' ||
      href.startsWith('http')
    ) {
      return;
    }

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    triggerTransition({
      sourceRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: 16,
      },
      metadata: {
        title: item.title,
        cover: item.cover || 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=85&w=1000&auto=format&fit=crop',
        category: item.moduleName || roleLabels[item.learningRole],
        duration: `${item.durationMin} min`,
        type: 'lesson',
      },
      href,
    });
  };

  const card = (
    <Card className="lift h-full gap-0 border-hairline p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip size="sm" variant="soft" color={roleColors[item.learningRole]}>
          {roleLabels[item.learningRole]}
        </Chip>
        <Chip size="sm" variant="tertiary" color={status.color}>
          {status.icon}
          {statusLabel(item, today)}
        </Chip>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl',
            completed ? 'bg-success-soft text-success-soft-foreground' : 'bg-accent-soft text-accent-soft-foreground',
          )}
        >
          {completed ? (
            <Check className="size-4.5" aria-hidden="true" />
          ) : external ? (
            <ExternalLink className="size-4.5" aria-hidden="true" />
          ) : (
            <BookOpenText className="size-4.5" aria-hidden="true" />
          )}
        </span>
        <h4 className="font-display text-base font-extrabold leading-snug tracking-[-0.02em] text-foreground sm:text-lg">
          {item.title}
        </h4>
      </div>

      <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted">{item.reason}</p>

      <div
        className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-3 text-xs font-semibold text-muted"
        data-numeric
      >
        <span className="flex items-center gap-1.5">
          <Clock3 className="size-3.5" aria-hidden="true" /> {item.durationMin} minutos
        </span>
        {item.overBudget && <span className="text-warning">Acima da meta</span>}
        <ArrowRight
          className="size-4 text-accent transition-transform duration-[var(--duration-md)] ease-[var(--ease-zen)] group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </Card>
  );

  const body = subdued ? card : <Reveal className="h-full rounded-2xl">{card}</Reveal>;
  const classes = 'group block h-full min-h-[188px] rounded-2xl';

  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={classes}>{body}</a>
  ) : (
    <Link href={href} onClick={handleClick} className={classes}>{body}</Link>
  );
}

type SessionFeedbackProps = {
  title: string;
  hint: string;
  selected?: SessionLoadRating;
  onSelect: (rating: SessionLoadRating) => void;
};

function SessionFeedback({ title, hint, selected, onSelect }: SessionFeedbackProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted">{hint}</p>
      </div>
      <ToggleButtonGroup
        aria-label={title}
        selectionMode="single"
        isDetached
        selectedKeys={selected ? [selected] : []}
        onSelectionChange={(keys) => {
          const [next] = Array.from(keys);
          if (next !== undefined) onSelect(String(next) as SessionLoadRating);
        }}
        className="grid grid-cols-3 gap-2"
      >
        {feedbackLabels.map((feedback) => (
          <ToggleButton key={feedback.value} id={feedback.value} className="h-auto flex-col items-start gap-0.5 py-2">
            <span className="text-xs font-bold">{feedback.label}</span>
            <span className="text-[0.625rem] font-medium opacity-75">{feedback.detail}</span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}

export default function MinhaTrilhaPage() {
  const [trail, setTrail] = useState<LearningTrail | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [replanned, setReplanned] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [draftAvailability, setDraftAvailability] = useState<StudyAvailability>({ weekdays: [1, 3, 5], minutesPerSession: 30 });
  const [adaptationMessage, setAdaptationMessage] = useState('');
  const { addNotification } = useNotifications();
  const today = toLocalDateKey(new Date());

  /*
   * Sem requestAnimationFrame: rAF não dispara em aba oculta, e a trilha
   * ficaria presa no esqueleto até a aba receber foco.
   */
  useEffect(() => {
    const result = readLearningTrail();
    if (result.data) {
      const next = replanLearningTrail(result.data);
      setTrail(next.trail);
      setDraftAvailability(next.trail.availability);
      setReplanned(next.changed);
      if (next.changed || result.migrated) saveLearningTrail(next.trail);
      if (next.changed) recordTrailEvent('trail_replanned', { reason: 'overdue' });
    } else if (result.error) {
      setStorageError(true);
    } else {
      /*
       * Sem trilha salva a tela abre com conteúdo de exemplo — mesma escolha
       * da home. O exemplo vive só em memória: nada é gravado no dispositivo
       * nem contabilizado nas métricas até a pessoa criar a trilha real.
       */
      const demo = createDemoLearningTrail();
      setTrail(demo);
      setDraftAvailability(demo.availability);
      setIsDemo(true);
    }
    setIsLoaded(true);
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
  const todaySessionId = todayItems[0]?.sessionId;
  const todayFeedback = trail?.feedbackHistory?.find((item) => item.sessionId === todaySessionId);

  /** No modo exemplo os ajustes valem para a sessão atual, mas nada é gravado. */
  const commitTrail = (updated: LearningTrail) => {
    setTrail(updated);
    if (!isDemo) saveLearningTrail(updated);
  };

  const trackTrailEvent = (type: TrailAnalyticsEventType, payload?: TrailAnalyticsEvent['payload']) => {
    if (!isDemo) recordTrailEvent(type, payload);
  };

  const handleFeedback = (rating: SessionLoadRating) => {
    if (!trail || !todaySessionId) return;
    const updated = applySessionFeedback(trail, todaySessionId, rating);
    commitTrail(updated);
    const feedback = updated.feedbackHistory?.find((item) => item.sessionId === todaySessionId);
    trackTrailEvent('session_feedback', {
      sessionId: todaySessionId,
      rating,
      completedMinutes: feedback?.completedMinutes || 0,
      nextTargetMinutes: feedback?.nextTargetMinutes || updated.availability.minutesPerSession,
    });
    setAdaptationMessage(rating === 'light' ? 'Ótimo ritmo. As próximas sessões ganharam até 10 minutos.' : rating === 'heavy' ? 'Carga reduzida. Reorganizamos as próximas sessões para ficarem mais leves.' : 'Ritmo mantido. As próximas sessões continuam com a mesma meta.');
  };

  const handleSaveRoutine = () => {
    if (!trail || draftAvailability.weekdays.length === 0) return;
    const updated = updateTrailAvailability(trail, draftAvailability);
    commitTrail(updated);
    trackTrailEvent('routine_adjusted', { weekdays: draftAvailability.weekdays.length, minutesPerSession: draftAvailability.minutesPerSession });
    setAdaptationMessage('Rotina atualizada. Apenas os conteúdos pendentes foram reorganizados.');
    setAdjustOpen(false);
  };

  const handlePostpone = (sessionId: string) => {
    if (!trail) return;
    const updated = postponeTrailSession(trail, sessionId);
    commitTrail(updated);
    trackTrailEvent('session_postponed', { sessionId });
    setAdaptationMessage('Sessão adiada. As próximas datas foram ajustadas sem alterar o que você já concluiu.');
  };

  const handleRemove = (item: LearningTrailItem) => {
    if (!trail) return;
    commitTrail(removeTrailItem(trail, item.id));
    trackTrailEvent('content_removed', { contentId: item.id, title: item.title });
    setAdaptationMessage('Conteúdo removido da agenda. Você pode restaurá-lo em “Ajustar rotina”.');
  };

  const handleRestore = (item: LearningTrailItem) => {
    if (!trail) return;
    commitTrail(restoreTrailItem(trail, item.id));
    trackTrailEvent('content_restored', { contentId: item.id, title: item.title });
  };

  useEffect(() => {
    // Conteúdo de exemplo não gera notificação: ninguém agendou essa sessão.
    if (!isLoaded || isDemo || todayPending.length === 0) return;
    const notificationKey = `@smartlms:last_trilha_notif:${today}`;
    if (localStorage.getItem(notificationKey)) return;
    addNotification({ title: 'Sua sessão de hoje está pronta', message: `${todayPending.length} conteúdo(s), ${todayPending.reduce((sum, item) => sum + item.durationMin, 0)} minutos planejados.`, targetAudience: 'all', channels: ['platform'] });
    localStorage.setItem(notificationKey, 'sent');
  }, [addNotification, isDemo, isLoaded, today, todayPending]);

  if (!isLoaded) {
    return (
      <div className="pt-[76px]">
        <div className="editorial-container py-12 sm:py-16" aria-busy="true" aria-label="Carregando sua trilha">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-5 h-14 w-full max-w-2xl rounded-xl" />
          <Skeleton className="mt-4 h-6 w-full max-w-xl" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="mt-12 h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!trail || trail.items.length === 0) {
    return (
      <main className="editorial-container flex min-h-[78vh] items-center justify-center pt-[76px]">
        <div className="w-full max-w-xl">
          {storageError && (
            <Alert status="danger" className="mb-6">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Não foi possível ler a trilha salva</Alert.Title>
                <Alert.Description>
                  O dado guardado neste dispositivo está indisponível. Suas respostas originais não foram apagadas.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <Card className="border-hairline">
            <EmptyState className="gap-0 px-6 py-14 text-center sm:px-12">
              <span className="icon-draw grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
                <TrailIcon size={28} />
              </span>
              <p className="eyebrow mt-6">Sua próxima etapa</p>
              <h1 className="display-3 mt-3 text-foreground">Vamos montar uma rotina que cabe na sua semana.</h1>
              <p className="mt-4 leading-7 text-muted">
                Responda algumas perguntas e receba sessões organizadas pelos seus objetivos e pelo tempo disponível.
              </p>
              <Link href="/onboarding" className={cn(buttonVariants({ variant: 'primary' }), 'mt-8')}>
                Criar minha trilha <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </EmptyState>
          </Card>
        </div>
      </main>
    );
  }

  const renderSessions = (mode: 'timeline' | 'calendar') => (
    <div className={cn(mode === 'timeline' ? 'space-y-10' : 'grid gap-7 lg:grid-cols-2')}>
      {sessions.map(([sessionId, items], index) => {
        const date = new Date(`${items[0].scheduledDate}T12:00:00`);
        const isToday = items[0].scheduledDate === today;
        const isLast = index === sessions.length - 1;
        const canPostpone = items.some((item) => item.status === 'pending') && items[0].scheduledDate >= today;

        return (
          <Rise
            as="section"
            key={sessionId}
            className={cn('relative min-w-0', mode === 'timeline' ? 'sm:pl-[4.5rem]' : 'surface-card p-5')}
          >
            {/* Rail da linha do tempo: vive na calha à esquerda, nunca atrás dos cards. */}
            {mode === 'timeline' && !isLast && (
              <span aria-hidden="true" className="absolute -bottom-10 left-5 top-12 hidden w-px bg-hairline sm:block" />
            )}

            <div className="mb-5 flex flex-wrap items-center gap-4">
              <span
                data-numeric
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-full text-sm font-extrabold',
                  isToday ? 'bg-accent text-accent-foreground shadow-elev-2' : 'bg-default text-default-foreground',
                  mode === 'timeline' && 'sm:absolute sm:left-0 sm:top-0',
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-display font-extrabold capitalize tracking-[-0.02em] text-foreground">
                  {date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h3>
                <p className="mt-1 text-xs font-semibold text-muted" data-numeric>
                  {items.reduce((sum, item) => sum + item.durationMin, 0)} minutos · {items.length} {items.length === 1 ? 'conteúdo' : 'conteúdos'}
                </p>
              </div>
              <span aria-hidden="true" className="h-px min-w-8 flex-1 bg-hairline" />
              {canPostpone && (
                <Button variant="tertiary" size="sm" onClick={() => handlePostpone(sessionId)}>
                  Adiar sessão
                </Button>
              )}
            </div>

            <div className={cn('grid gap-4', mode === 'timeline' && 'md:grid-cols-2 xl:grid-cols-3')}>
              {items.map((item) => (
                <div key={item.id} className="group/item relative min-w-0">
                  <TrailContentCard item={item} today={today} />
                  {item.status === 'pending' && (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Remover ${item.title} da trilha`}
                      onClick={() => handleRemove(item)}
                      className="absolute right-3 top-3 text-muted opacity-100 transition-opacity hover:text-danger md:opacity-0 md:group-hover/item:opacity-100 md:group-focus-within/item:opacity-100"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Rise>
        );
      })}
    </div>
  );

  return (
    <div className="pt-[76px]">
      <section className="border-b border-hairline">
        <div className="editorial-container py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <Rise>
              <p className="eyebrow">Agenda personalizada</p>
              <h1 className="display-1 mt-3 max-w-3xl text-foreground">Uma rotina clara, no seu ritmo.</h1>
              <p className="lede mt-6">
                Seu plano distribui o que importa nos dias que você escolheu — sem bloquear o restante do conteúdo.
              </p>
            </Rise>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setAdjustOpen(true)}>
                <Settings2 className="size-4" aria-hidden="true" /> Ajustar rotina
              </Button>
              <Link href="/onboarding?edit=1" className={buttonVariants({ variant: 'outline' })}>
                Rever objetivos
              </Link>
            </div>
          </div>

          {/* `data-numeric` herda: todas as métricas comparáveis viram tabulares. */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-numeric>
            <StatCard label="Progresso real" value={`${completion}%`} icon={Route} tone="primary" />
            <StatCard label="Concluídos" value={`${completed}/${trail.items.length}`} icon={CheckCircle2} tone="sage" />
            <StatCard label="Meta semanal" value={`${weeklyMinutes} min`} icon={Clock3} tone="terracotta" />
            <StatCard label="Foco principal" value={focus} icon={Target} tone="neutral" />
          </div>

          <div className="mt-6">
            <ProgressBar value={completion} color="accent" size="md" data-numeric>
              <Label className="text-xs font-semibold text-muted">Trilha concluída</Label>
              <ProgressBar.Output className="text-xs font-bold text-accent" />
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </div>
        </div>
      </section>

      <main className="editorial-container py-10 sm:py-14">
        {isDemo && (
          <Alert status="accent" className="mb-8 items-center gap-3 sm:gap-4">
            <Alert.Indicator>
              <Sparkles className="size-5" aria-hidden="true" />
            </Alert.Indicator>
            <Alert.Content className="min-w-0">
              <Alert.Title>Você está vendo uma trilha de exemplo.</Alert.Title>
              <Alert.Description>
                Explore a tela à vontade: nada aqui é salvo neste dispositivo. Responda ao onboarding para receber a sua.
              </Alert.Description>
            </Alert.Content>
            <Link href="/onboarding" className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'ml-auto shrink-0')}>
              Criar minha trilha <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Alert>
        )}

        {adaptationMessage && (
          <div role="status" aria-live="polite" className="mb-8">
            <Alert status="accent">
              <Alert.Indicator>
                <Sparkles className="size-5" aria-hidden="true" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Description>{adaptationMessage}</Alert.Description>
              </Alert.Content>
            </Alert>
          </div>
        )}

        {replanned && (
          <Alert status="warning" className="mb-8">
            <Alert.Indicator>
              <RefreshCw className="size-5" aria-hidden="true" />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>Sua agenda foi reorganizada.</Alert.Title>
              <Alert.Description>
                Conteúdos que ficaram pendentes foram distribuídos nas próximas sessões disponíveis.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {todayPending.length > 0 ? (
          /*
           * Banner, não card de destaque: "o que eu faço agora" é a pergunta da
           * home. Repetir aqui a mesma sessão em tamanho grande fazia as duas
           * telas competirem — esta é o plano completo, e é só isso.
           */
          <Card className="mb-12 gap-0 overflow-hidden border-hairline p-0">
            <div className="flex flex-col gap-5 bg-accent-soft/45 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="min-w-0">
                <p className="eyebrow">Hoje</p>
                <p
                  className="mt-2 flex items-center gap-2 font-display text-lg font-extrabold tracking-[-0.02em] text-foreground"
                  data-numeric
                >
                  <Clock3 className="size-4 shrink-0" aria-hidden="true" />
                  {todayPending.length} {todayPending.length === 1 ? 'conteúdo' : 'conteúdos'} ·{' '}
                  {todayPending.reduce((sum, item) => sum + item.durationMin, 0)} min pendentes
                </p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted" data-numeric>
                  O plano reservou {trail.adaptiveMinutesPerSession || trail.availability.minutesPerSession} minutos
                  para esta sessão. Seu próximo passo fica no painel.
                </p>
              </div>
              <Link href="/" className={cn(buttonVariants({ variant: 'primary' }), 'shrink-0')}>
                Ir para o painel <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="border-t border-hairline px-6 py-5 sm:px-8">
              <SessionFeedback
                title="Como essa carga pareceu?"
                hint="Sua resposta ajusta apenas as próximas sessões."
                selected={todayFeedback?.rating}
                onSelect={handleFeedback}
              />
            </div>
          </Card>
        ) : (
          <Card className="mb-12 gap-0 overflow-hidden border-hairline p-0">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="eyebrow">Hoje</p>
                <h2 className="display-3 mt-2 text-foreground">Nenhuma sessão pendente para hoje.</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                  Você pode descansar ou adiantar qualquer conteúdo planejado — nada está bloqueado.
                </p>
              </div>
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-success-soft text-success-soft-foreground">
                <CheckCircle2 className="size-7" aria-hidden="true" />
              </span>
            </div>

            {todayItems.length > 0 && (
              <div className="border-t border-hairline bg-background-secondary/50 px-6 py-5 sm:px-8">
                <SessionFeedback
                  title="Como foi a sessão concluída?"
                  hint="Isso calibra o tamanho das próximas sessões."
                  selected={todayFeedback?.rating}
                  onSelect={handleFeedback}
                />
              </div>
            )}
          </Card>
        )}

        <Tabs.Root selectedKey={viewMode} onSelectionChange={(key) => setViewMode(String(key) as 'timeline' | 'calendar')}>
          <div className="mb-8 flex flex-col gap-5 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Plano de aprendizagem</p>
              <h2 className="display-2 mt-2 text-foreground">Suas próximas sessões</h2>
            </div>
            <Tabs.List aria-label="Modo de visualização das sessões">
              <Tabs.Tab id="timeline">
                <LayoutList className="size-4" aria-hidden="true" /> Trilha
              </Tabs.Tab>
              <Tabs.Tab id="calendar">
                <CalendarDays className="size-4" aria-hidden="true" /> Agenda
              </Tabs.Tab>
            </Tabs.List>
          </div>

          <Tabs.Panel id="timeline">{renderSessions('timeline')}</Tabs.Panel>
          <Tabs.Panel id="calendar">{renderSessions('calendar')}</Tabs.Panel>
        </Tabs.Root>
      </main>

      <Drawer.Root isOpen={adjustOpen} onOpenChange={setAdjustOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog>
              <Drawer.Header className="items-start">
                <div className="min-w-0">
                  <p className="eyebrow">Ajuste rápido</p>
                  <Drawer.Heading className="display-3 mt-2 text-foreground">Sua rotina, sem recomeçar</Drawer.Heading>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Conclusões são preservadas. Apenas a agenda pendente será recalculada.
                  </p>
                </div>
                <Drawer.CloseTrigger aria-label="Fechar ajustes" />
              </Drawer.Header>

              <Drawer.Body className="gap-8">
                <Fieldset>
                  <Fieldset.Legend>Dias de estudo</Fieldset.Legend>
                  <Fieldset.Group className="mt-3">
                    <ToggleButtonGroup
                      aria-label="Dias de estudo"
                      selectionMode="multiple"
                      isDetached
                      selectedKeys={draftAvailability.weekdays.map(String)}
                      onSelectionChange={(keys) =>
                        setDraftAvailability((current) => ({
                          ...current,
                          weekdays: Array.from(keys).map((key) => Number(key) as Weekday),
                        }))
                      }
                      className="grid grid-cols-4 gap-2 sm:grid-cols-7"
                    >
                      {weekdays.map((day) => (
                        <ToggleButton key={day.value} id={String(day.value)}>
                          {day.label}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                    {draftAvailability.weekdays.length === 0 && (
                      <p className="text-xs font-semibold text-danger">Escolha pelo menos um dia da semana.</p>
                    )}
                  </Fieldset.Group>
                </Fieldset>

                <Fieldset>
                  <Fieldset.Legend>Tempo por sessão</Fieldset.Legend>
                  <Fieldset.Group className="mt-3 gap-4">
                    <ToggleButtonGroup
                      aria-label="Tempo por sessão"
                      selectionMode="single"
                      isDetached
                      selectedKeys={[String(draftAvailability.minutesPerSession)]}
                      onSelectionChange={(keys) => {
                        const [next] = Array.from(keys);
                        if (next !== undefined) {
                          setDraftAvailability((current) => ({ ...current, minutesPerSession: Number(next) }));
                        }
                      }}
                      className="flex flex-wrap gap-2"
                    >
                      {minutePresets.map((minutes) => (
                        <ToggleButton key={minutes} id={String(minutes)}>
                          {minutes} min
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>

                    <NumberField
                      value={draftAvailability.minutesPerSession}
                      minValue={10}
                      maxValue={240}
                      step={5}
                      onChange={(value) =>
                        setDraftAvailability((current) => ({
                          ...current,
                          minutesPerSession: Math.max(10, Math.min(240, Number.isNaN(value) ? 10 : value)),
                        }))
                      }
                    >
                      <Label>Outro valor</Label>
                      <NumberField.Group>
                        <NumberField.DecrementButton />
                        <NumberField.Input />
                        <NumberField.IncrementButton />
                      </NumberField.Group>
                      <Description>Entre 10 e 240 minutos por sessão.</Description>
                    </NumberField>
                  </Fieldset.Group>
                </Fieldset>

                {(trail.excludedItems?.length || 0) > 0 && (
                  <section aria-labelledby="removed-content-title">
                    <h3 id="removed-content-title" className="font-display font-extrabold text-foreground">
                      Conteúdos removidos
                    </h3>
                    <p className="mt-1 text-xs text-muted">Restaure itens que deseja reconsiderar.</p>
                    <ul className="mt-4 space-y-2">
                      {trail.excludedItems?.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface p-3"
                        >
                          <span className="min-w-0 truncate text-sm font-semibold text-foreground">{item.title}</span>
                          <Button size="sm" variant="tertiary" onClick={() => handleRestore(item)}>
                            <RotateCcw className="size-3.5" aria-hidden="true" /> Restaurar
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </Drawer.Body>

              <Drawer.Footer>
                <Button
                  variant="primary"
                  fullWidth
                  isDisabled={draftAvailability.weekdays.length === 0}
                  onClick={handleSaveRoutine}
                >
                  <RefreshCw className="size-4" aria-hidden="true" /> Recalcular próximas sessões
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer.Root>
    </div>
  );
}
