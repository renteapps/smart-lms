'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, CalendarDays, Check, CheckCircle2, Clock3,
  ExternalLink, FileText, LayoutList, PlayCircle, RefreshCw, Route, Settings2, Sparkles, Target,
} from 'lucide-react';
import {
  Alert, AlertDialog, Button, buttonVariants, Card, Chip, Description, Drawer, EmptyState, Fieldset,
  Label, NumberField, ProgressBar, Skeleton, Tabs, ToggleButton, ToggleButtonGroup,
} from '@heroui/react';
import { AvailabilityMode, LearningRole, LearningTrail, LearningTrailItem, SessionLoadRating, StudyAvailability, Weekday } from '@/types/trilha';
import { refreshTrail, saveTrail, setTrailItemCompletion } from '@/app/actions/trail';
import { applySessionFeedback, clampSessionMinutes, effectiveAvailability, minutesForWeekday, postponeTrailSession, toLocalDateKey, updateTrailAvailability, weeklyMinutes } from '@/lib/matching';
import { contentHref } from '@/lib/studentHome';
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

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=85&w=1000&auto=format&fit=crop';

/**
 * Identidade de cada tipo de conteúdo.
 *
 * Aula, artigo e link externo pedem coisas diferentes do aluno — assistir, ler,
 * sair da plataforma. O card diz isso de longe, por ícone e cor, antes de
 * qualquer leitura.
 */
function typeVisual(type: LearningTrailItem['type']) {
  if (type === 'article') {
    return {
      label: 'Artigo',
      Icon: FileText,
      band: 'bg-warning-soft text-warning-soft-foreground',
      badge: 'bg-warning-soft text-warning-soft-foreground',
    };
  }
  if (type === 'external_link') {
    return {
      label: 'Link externo',
      Icon: ExternalLink,
      band: 'bg-default text-default-foreground',
      badge: 'bg-surface text-foreground',
    };
  }
  return {
    label: 'Aula',
    Icon: PlayCircle,
    band: 'bg-accent-soft text-accent-soft-foreground',
    badge: 'bg-accent text-accent-foreground',
  };
}

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
  /** Reserva a faixa inferior para o botão de concluir (artigo e link externo). */
  withCompleteAction?: boolean;
};

/** Domínio do link, sem `www.` — é o que diz de onde o conteúdo vem. */
function hostOf(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Card de conteúdo da agenda.
 *
 * A versão anterior desenhava tudo igual: mesmo ícone azul, mesmos dois chips
 * ("Essencial" e "Planejado") em cima de cada card e a frase "Recomendado por"
 * ocupando o corpo. Uma sessão de três conteúdos virava três retângulos
 * indistinguíveis. Agora o que diferencia vem primeiro — a capa, o tipo e a
 * origem (curso da aula, site do link) — e o que se repetia saiu: "Planejado" só
 * aparece quando o estado foge do normal, e o papel pedagógico só quando não é o
 * essencial.
 */
function TrailContentCard({ item, today, subdued = false, withCompleteAction = false }: TrailContentCardProps) {
  const { triggerTransition } = useCardTransition();
  const href = contentHref(item);
  const external = item.type === 'external_link';
  const completed = item.status === 'completed';
  const type = typeVisual(item.type);
  const status = statusVisual(item, today);
  const showStatus = completed || item.rescheduled || item.scheduledDate === today;
  // Aula mostra a formação a que pertence; link mostra de onde vem; artigo, o módulo se houver.
  const origin = external ? hostOf(item.url) : item.courseName || item.moduleName || null;

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
        cover: item.cover || DEFAULT_COVER,
        category: item.courseName || item.moduleName || type.label,
        duration: `${item.durationMin} min`,
        type: 'lesson',
      },
      href,
    });
  };

  const card = (
    <Card
      className={cn(
        'lift h-full gap-0 overflow-hidden border-hairline p-0',
        completed && 'border-success/35 bg-success-soft/25',
      )}
    >
      <div className="relative h-24 shrink-0 overflow-hidden bg-background-secondary">
        {item.cover ? (
          <Image
            src={item.cover}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1280px) 20rem, (min-width: 768px) 45vw, 90vw"
            className={cn(
              'object-cover transition-transform duration-[var(--duration-lg)] group-hover:scale-[1.03]',
              completed && 'opacity-55 saturate-50',
            )}
          />
        ) : (
          <span className={cn('grid h-full w-full place-items-center', type.band)}>
            <type.Icon className="size-7" aria-hidden="true" />
          </span>
        )}

        <span
          className={cn(
            'absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-extrabold uppercase tracking-[0.08em] shadow-elev-1',
            completed ? 'bg-success text-success-foreground' : type.badge,
          )}
        >
          {completed ? <Check className="size-3" aria-hidden="true" /> : <type.Icon className="size-3" aria-hidden="true" />}
          {completed ? 'Concluído' : type.label}
        </span>
      </div>

      <div className={cn('flex flex-1 flex-col p-5', withCompleteAction && 'pb-16')}>
        {origin && (
          <p className="truncate text-xs font-bold uppercase tracking-[0.08em] text-muted">{origin}</p>
        )}

        <h4
          className={cn(
            'mt-1.5 font-display text-base font-extrabold leading-snug tracking-[-0.02em] sm:text-lg',
            completed ? 'text-muted line-through decoration-success/50' : 'text-foreground',
          )}
        >
          {item.title}
        </h4>

        {!external && item.courseName && item.moduleName && (
          <p className="mt-1.5 truncate text-xs text-muted">Módulo: {item.moduleName}</p>
        )}

        <div
          className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hairline pt-3 text-xs font-semibold text-muted"
          data-numeric
        >
          <span className="flex items-center gap-1.5">
            <Clock3 className="size-3.5" aria-hidden="true" /> {item.durationMin} min
          </span>

          {item.learningRole !== 'essential' && (
            <Chip size="sm" variant="soft" color={roleColors[item.learningRole]}>
              {roleLabels[item.learningRole]}
            </Chip>
          )}

          {showStatus && !completed && (
            <Chip size="sm" variant="tertiary" color={status.color}>
              {status.icon}
              {statusLabel(item, today)}
            </Chip>
          )}

          {item.overBudget && <span className="text-warning">Acima da meta</span>}

          {!completed && (
            <ArrowRight
              className="ml-auto size-4 text-accent transition-transform duration-[var(--duration-md)] ease-[var(--ease-zen)] group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          )}
        </div>
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
  const [sessionToPostpone, setSessionToPostpone] = useState<string | null>(null);
  const [draftAvailability, setDraftAvailability] = useState<StudyAvailability>({ weekdays: [1, 3, 5], minutesPerSession: 30 });
  const [adaptationMessage, setAdaptationMessage] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  const today = toLocalDateKey(new Date());

  /*
   * Sem requestAnimationFrame: rAF não dispara em aba oculta, e a trilha
   * ficaria presa no esqueleto até a aba receber foco.
   */
  /*
   * `refreshTrail` faz no servidor as três coisas que mudam entre uma visita e
   * outra: tira da agenda o que já foi concluído fora dela, traz o conteúdo que
   * o admin mapeou depois e redistribui o que ficou para trás. A tela só exibe
   * o resultado — nada de replanejar por aqui e gravar de volta.
   */
  useEffect(() => {
    async function loadTrail() {
      try {
        const res = await refreshTrail();
        if (res.success && res.trail) {
          setTrail(res.trail);
          setDraftAvailability(res.trail.availability);
          setReplanned((res.notice?.missedSessions || 0) > 0);
          if (res.notice?.summary) setAdaptationMessage(res.notice.summary);
        } else if (!res.success) {
          setStorageError(true);
        } else {
          setTrail(null);
        }
      } catch {
        setStorageError(true);
      } finally {
        setIsLoaded(true);
      }
    }
    loadTrail();
  }, []);

  /*
   * A agenda mostra o que falta — e o que acabou de ser feito.
   *
   * Conteúdo concluído continua na trilha como histórico (progresso, sequência,
   * minutos), mas some dos cards dos dias que já passaram: reencontrar na
   * quinta-feira a aula assistida na terça faz a tela parecer cobrança e esconde
   * o que ainda importa. O concluído do dia corrente é a exceção — ele fica, com
   * cara de concluído, porque é a prova visível de que a sessão andou.
   */
  const sessions = useMemo(() => {
    if (!trail) return [];
    const groups = trail.items.reduce<Record<string, LearningTrailItem[]>>((result, item) => {
      const visible = item.status === 'pending' || item.scheduledDate >= today;
      if (!visible) return result;
      result[item.sessionId] = [...(result[item.sessionId] || []), item];
      return result;
    }, {});
    return Object.entries(groups).sort(([, a], [, b]) => a[0].scheduledDate.localeCompare(b[0].scheduledDate));
  }, [trail, today]);

  const todayItems = trail?.items.filter((item) => item.scheduledDate === today) || [];
  const todayPending = todayItems.filter((item) => item.status === 'pending');
  const completed = trail?.items.filter((item) => item.status === 'completed').length || 0;
  const completion = trail?.items.length ? Math.round((completed / trail.items.length) * 100) : 0;
  const weeklyGoal = trail ? weeklyMinutes(effectiveAvailability(trail)) : 0;
  const focus = trail ? Object.values(trail.answers).flat()[0] || 'Seu desenvolvimento' : 'Seu desenvolvimento';
  const todaySessionId = todayItems[0]?.sessionId;
  const todayBudget = trail
    ? minutesForWeekday(effectiveAvailability(trail), new Date().getDay() as Weekday)
    : 0;
  const todayFeedback = trail?.feedbackHistory?.find((item) => item.sessionId === todaySessionId);

  /** No modo exemplo os ajustes valem para a sessão atual, mas nada é gravado. */
  const commitTrail = async (updated: LearningTrail) => {
    setTrail(updated);
    if (!isDemo) await saveTrail(updated);
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

  /** Minutos do dia no rascunho: o valor próprio no modo por dia, a meta única no uniforme. */
  const draftMinutesFor = (weekday: Weekday) =>
    draftAvailability.mode === 'per_day'
      ? draftAvailability.minutesByWeekday?.[weekday] ?? draftAvailability.minutesPerSession
      : draftAvailability.minutesPerSession;

  const changeDraftMode = (mode: AvailabilityMode) => {
    setDraftAvailability((current) => ({
      ...current,
      mode,
      // Entrar no modo por dia parte do que já estava valendo, nunca do zero.
      minutesByWeekday: mode === 'per_day'
        ? Object.fromEntries(current.weekdays.map((day) => [
          day,
          current.minutesByWeekday?.[day] ?? current.minutesPerSession,
        ]))
        : current.minutesByWeekday,
    }));
  };

  const setDraftDayMinutes = (weekday: Weekday, minutes: number) => {
    setDraftAvailability((current) => ({
      ...current,
      minutesByWeekday: {
        ...current.minutesByWeekday,
        [weekday]: clampSessionMinutes(Number.isNaN(minutes) ? current.minutesPerSession : minutes),
      },
    }));
  };

  const handleSaveRoutine = () => {
    if (!trail || draftAvailability.weekdays.length === 0) return;
    const updated = updateTrailAvailability(trail, draftAvailability);
    commitTrail(updated);
    trackTrailEvent('routine_adjusted', {
      weekdays: draftAvailability.weekdays.length,
      minutesPerSession: draftAvailability.minutesPerSession,
      mode: draftAvailability.mode ?? 'uniform',
      weeklyMinutes: weeklyMinutes(draftAvailability),
    });
    setAdaptationMessage('Rotina atualizada. Apenas os conteúdos pendentes foram reorganizados.');
    setAdjustOpen(false);
  };

  const handlePostpone = (sessionId: string) => {
    if (!trail) return;
    const updated = postponeTrailSession(trail, sessionId);
    commitTrail(updated);
    trackTrailEvent('session_postponed', { sessionId });
    setAdaptationMessage('Sessão adiada. As próximas datas foram ajustadas sem alterar o que você já concluiu.');
    setSessionToPostpone(null);
  };

  /**
   * Conclusão declarada pelo próprio aluno.
   *
   * Vai pela action porque a trilha é do servidor: o mesmo caminho que a sala de
   * aula usa, para o item sair da agenda e entrar no progresso de uma vez só.
   */
  const handleComplete = async (item: LearningTrailItem) => {
    if (!trail || completingId) return;
    setCompletingId(item.id);
    try {
      const result = await setTrailItemCompletion(item.id, true);
      if (result.success && result.trail) {
        setTrail(result.trail);
        setAdaptationMessage(`“${item.title}” entrou no seu progresso e saiu da agenda.`);
      }
    } finally {
      setCompletingId(null);
    }
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
        const pendingItems = items.filter((item) => item.status === 'pending');
        const doneItems = items.filter((item) => item.status === 'completed');
        const canPostpone = pendingItems.length > 0 && items[0].scheduledDate >= today;

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
                {/* O cabeçalho conta o que falta; o que já foi feito aparece ao lado. */}
                <p className="mt-1 text-xs font-semibold text-muted" data-numeric>
                  {pendingItems.reduce((sum, item) => sum + item.durationMin, 0)} minutos ·{' '}
                  {pendingItems.length} {pendingItems.length === 1 ? 'conteúdo' : 'conteúdos'}
                  {doneItems.length > 0 && (
                    <span className="text-success"> · {doneItems.length} concluído{doneItems.length > 1 ? 's' : ''}</span>
                  )}
                </p>
              </div>
              <span aria-hidden="true" className="h-px min-w-8 flex-1 bg-hairline" />
              {canPostpone && (
                <Button variant="tertiary" size="sm" onClick={() => setSessionToPostpone(sessionId)}>
                  Adiar sessão
                </Button>
              )}
            </div>

            <div className={cn('grid gap-4', mode === 'timeline' && 'md:grid-cols-2 xl:grid-cols-3')}>
              {items.map((item) => {
                /*
                 * Aula fecha sozinha: a sala de aula grava a conclusão. Artigo e
                 * link externo abrem fora da plataforma e não têm como avisar —
                 * sem este botão, eles ficavam pendentes para sempre e seguravam
                 * a agenda de quem já os tinha lido.
                 */
                const selfReported = item.status === 'pending'
                  && (item.type === 'article' || item.type === 'external_link');

                return (
                  <div key={item.id} className="group/item relative min-w-0">
                    <TrailContentCard item={item} today={today} withCompleteAction={selfReported} />
                    {selfReported && (
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={completingId === item.id}
                        onClick={() => handleComplete(item)}
                        className="absolute inset-x-5 bottom-4 justify-center"
                      >
                        <Check className="size-3.5" aria-hidden="true" />
                        {completingId === item.id ? 'Registrando…' : 'Marcar como concluído'}
                      </Button>
                    )}
                  </div>
                );
              })}
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
            <StatCard label="Meta semanal" value={`${weeklyGoal} min`} icon={Clock3} tone="terracotta" />
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
                  O plano reservou {todayBudget} minutos para hoje, com folga de 20% para não cortar
                  uma aula ao meio. Seu próximo passo fica no painel.
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

      <AlertDialog.Root
        isOpen={sessionToPostpone !== null}
        onOpenChange={(open) => {
          if (!open) setSessionToPostpone(null);
        }}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="md">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Icon status="warning">
                  <CalendarDays className="size-5" aria-hidden="true" />
                </AlertDialog.Icon>
                <AlertDialog.Heading>Adiar esta sessão?</AlertDialog.Heading>
              </AlertDialog.Header>

              <AlertDialog.Body>
                <p>
                  Deseja realmente adiar esta sessão? As próximas datas serão reorganizadas automaticamente,
                  sem alterar o que você já concluiu.
                </p>
              </AlertDialog.Body>

              <AlertDialog.Footer>
                <Button variant="tertiary" onClick={() => setSessionToPostpone(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (sessionToPostpone) handlePostpone(sessionToPostpone);
                  }}
                >
                  Sim, adiar sessão
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog.Root>

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
                      aria-label="Como distribuir o tempo"
                      selectionMode="single"
                      isDetached
                      selectedKeys={[draftAvailability.mode ?? 'uniform']}
                      onSelectionChange={(keys) => {
                        const [next] = Array.from(keys);
                        if (next !== undefined) changeDraftMode(String(next) as AvailabilityMode);
                      }}
                      className="flex flex-wrap gap-2"
                    >
                      <ToggleButton id="uniform">Mesmo tempo todo dia</ToggleButton>
                      <ToggleButton id="per_day">Tempo por dia</ToggleButton>
                    </ToggleButtonGroup>

                    {draftAvailability.mode === 'per_day' ? (
                      weekdays
                        .filter((day) => draftAvailability.weekdays.includes(day.value))
                        .map((day) => (
                          <NumberField
                            key={day.value}
                            value={draftMinutesFor(day.value)}
                            minValue={10}
                            maxValue={240}
                            step={5}
                            onChange={(value) => setDraftDayMinutes(day.value, value)}
                          >
                            <Label>{day.label}</Label>
                            <NumberField.Group>
                              <NumberField.DecrementButton />
                              <NumberField.Input />
                              <NumberField.IncrementButton />
                            </NumberField.Group>
                          </NumberField>
                        ))
                    ) : (
                      <>
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
                              minutesPerSession: clampSessionMinutes(value),
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
                      </>
                    )}

                    <p className="text-xs font-semibold text-muted" data-numeric>
                      Meta semanal: {weeklyMinutes(draftAvailability)} minutos · folga de 20% em cada dia.
                    </p>
                  </Fieldset.Group>
                </Fieldset>

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
