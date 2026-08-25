'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  CalendarDays, Check, CheckCircle2, Clock3,
  ExternalLink, FileText, LayoutList, PlayCircle, RefreshCw, Route, Settings2, Sparkles, TriangleAlert,
} from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CalendarCheckOut01Icon } from '@hugeicons/core-free-icons';
import { ArrowRight02Icon } from '@/components/ui/arrow-right-02';
import { UndoIcon, type UndoIconHandle } from '@/components/ui/undo';
import {
  Alert, AlertDialog, Button, buttonVariants, Card, Chip, Description, Drawer, EmptyState, Fieldset,
  Label, NumberField, Skeleton, Tabs, ToggleButton, ToggleButtonGroup,
} from '@heroui/react';
import { AvailabilityMode, LearningRole, LearningTrail, LearningTrailItem, SessionLoadRating, StudyAvailability, Weekday } from '@/types/trilha';
import { refreshTrail, saveTrail, setTrailItemCompletion } from '@/app/actions/trail';
import { applySessionFeedback, clampSessionMinutes, effectiveAvailability, fromLocalDateKey, minutesForWeekday, postponeTrailItem, postponeTrailSession, toLocalDateKey, updateTrailAvailability, weeklyMinutes } from '@/lib/matching';
import { computeStudyStats, contentHref, LONGER_CONTENT_HINT, LONGER_CONTENT_LABEL, LONGER_CONTENT_SHORT } from '@/lib/studentHome';
import StudyLedger from '@/components/home/StudyLedger';
import TrailProgressPanel from '@/components/home/TrailProgressPanel';
import { recordTrailEvent, TrailAnalyticsEvent, TrailAnalyticsEventType } from '@/lib/trailAnalytics';
import { useNotifications } from '@/contexts/NotificationContext';
import { useCardTransition } from '@/contexts/CardTransitionContext';
import { TrailIcon } from '@/components/ui/AnimatedIcon';
import { Reveal } from '@/components/ui/Reveal';
import { Rise } from '@/components/ui/Rise';
import { cn } from '@/lib/utils';

/**
 * As três perguntas que o plano responde — uma aba para cada.
 *
 * `next` = "o que eu faço agora", `calendar` = "quando eu faço",
 * `full` = "onde eu estou". Antes havia duas abas que respondiam a mesma
 * pergunta ("quando") em tamanhos de card diferentes, e nenhuma respondia às
 * outras duas.
 */
type TrailView = 'next' | 'calendar' | 'full';

/**
 * O que está para ser adiado.
 *
 * Sessão e conteúdo compartilham o mesmo diálogo porque a pergunta é a mesma
 * ("adiar?") e só a consequência muda — duas caixas idênticas com textos
 * diferentes seriam duas fontes de verdade para o mesmo estado.
 */
type PostponeTarget =
  | { kind: 'session'; sessionId: string }
  | { kind: 'item'; item: LearningTrailItem };

/** Quantas sessões a aba de próximos passos mostra antes de mandar para a trilha completa. */
const NEXT_SESSIONS_HORIZON = 3;

/**
 * Janela do aviso de "sessão mais longa chegando": os 14 dias depois de hoje.
 *
 * Não usa limite de semana civil de propósito — quem abre a trilha numa sexta
 * quer saber tanto do que sobra desta semana quanto do começo da próxima, e um
 * corte no domingo partiria esse aviso ao meio. Só olha para a frente: o
 * conteúdo de hoje, se for mais longo, já aparece no card de hoje logo abaixo.
 */
const LONGER_CONTENT_HORIZON_DAYS = 14;

const VIEW_META: Record<TrailView, { title: string; hint: string }> = {
  next: {
    title: 'Seus próximos passos',
    hint: 'O que fazer nas próximas sessões, hoje inclusive. O que você concluir hoje fica visível aqui até o dia virar.',
  },
  calendar: {
    title: 'Sua agenda',
    hint: 'Quando cada conteúdo está planejado. Adie um dia inteiro se a semana apertar e o resto se reorganiza.',
  },
  full: {
    title: 'Sua trilha completa',
    hint: 'Todo o seu plano na ordem em que foi montado, do começo ao fim, incluindo o que já concluiu.',
  },
};

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

/**
 * Concluído hoje.
 *
 * `completedAt` é a verdade; `scheduledDate` só entra como reserva para itens
 * antigos gravados antes de existir carimbo de conclusão. Sem essa distinção,
 * uma aula adiantada hoje mas agendada para sexta apareceria como card de
 * concluído dentro da sessão de sexta, que ainda nem chegou.
 */
function completedOn(item: LearningTrailItem, dateKey: string): boolean {
  if (item.status !== 'completed') return false;
  if (item.completedAt) {
    const at = new Date(item.completedAt);
    return !Number.isNaN(at.getTime()) && toLocalDateKey(at) === dateKey;
  }
  return item.scheduledDate === dateKey;
}

/** "21 de ago" — data curta para as linhas densas da trilha completa. */
function shortDate(dateKey: string): string {
  if (!dateKey) return '—';
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** "sex., 28 de ago." — dia da semana + data, para o aviso de sessão mais longa. */
function weekdayDate(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

function statusLabel(item: LearningTrailItem, today: string): string {
  if (item.status === 'completed') return 'Concluído';
  if (item.rescheduleReason === 'overdue') {
    return item.overdueSince ? `Atrasado desde ${shortDate(item.overdueSince)}` : 'Atrasado';
  }
  if (item.scheduledDate < today || (item.rescheduled && !item.rescheduleReason)) return 'Atrasado';
  if (item.rescheduleReason === 'postponed') return 'Adiado';
  if (item.rescheduleReason === 'adjusted' || item.rescheduled) return 'Replanejado';
  if (item.scheduledDate === today) return 'Hoje';
  return 'Planejado';
}

/** Estado nunca é só cor: cada situação tem cor, ícone e texto. */
function statusVisual(item: LearningTrailItem, today: string) {
  if (item.status === 'completed') return { color: 'success', icon: <Check className="size-3" aria-hidden="true" /> } as const;
  if (item.rescheduled || item.scheduledDate < today) return { color: 'warning', icon: <RefreshCw className="size-3" aria-hidden="true" /> } as const;
  if (item.scheduledDate === today) return { color: 'accent', icon: <Sparkles className="size-3" aria-hidden="true" /> } as const;
  return { color: 'default', icon: <CalendarDays className="size-3" aria-hidden="true" /> } as const;
}

type TrailContentCardProps = {
  item: LearningTrailItem;
  today: string;
  /** Dentro do card de destaque o realce já existe no contêiner — não empilhar. */
  subdued?: boolean;
  /** Reserva a faixa inferior para os botões de ação (concluir / adiar). */
  withActionBar?: boolean;
  /** Usa um layout minimalista em formato de lista (sem imagem de capa). */
  compact?: boolean;
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
function TrailContentCard({ item, today, subdued = false, withActionBar = false, compact = false }: TrailContentCardProps) {
  const { triggerTransition } = useCardTransition();
  const href = contentHref(item);
  const external = item.type === 'external_link';
  const completed = item.status === 'completed';
  const type = typeVisual(item.type);
  const status = statusVisual(item, today);
  const showStatus = completed || item.rescheduled || item.scheduledDate <= today;
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
        compact && 'flex-row items-center p-3 gap-3 min-h-0'
      )}
    >
      {!compact ? (
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
      ) : (
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', completed ? 'bg-success text-success-foreground' : type.band)}>
          {completed ? <Check className="size-5" aria-hidden="true" /> : <type.Icon className="size-5" aria-hidden="true" />}
        </div>
      )}

      <div className={cn('flex flex-1 flex-col min-w-0', !compact ? 'p-5' : 'py-0.5', !compact && withActionBar && 'pb-16')}>
        {!compact && origin && (
          <p className="truncate text-xs font-bold uppercase tracking-[0.08em] text-muted">{origin}</p>
        )}

        <h4
          className={cn(
            'font-display font-extrabold leading-snug tracking-[-0.02em] truncate',
            compact ? 'text-sm' : 'mt-1.5 text-base sm:text-lg',
            completed ? 'text-muted line-through decoration-success/50' : 'text-foreground',
          )}
        >
          {item.title}
        </h4>

        {!compact && !external && item.courseName && item.moduleName && (
          <p className="mt-1.5 truncate text-xs text-muted">Módulo: {item.moduleName}</p>
        )}

        {compact ? (
          <div className="mt-0.5 flex items-center gap-2 text-[0.6875rem] font-medium text-muted truncate" data-numeric>
            <span className="flex items-center gap-1">
              <Clock3 className="size-3" aria-hidden="true" /> {item.durationMin} min
            </span>
            {item.overBudget && !completed && (
              <span className="flex shrink-0 items-center gap-1 text-warning" title={LONGER_CONTENT_HINT}>
                <TriangleAlert className="size-3" aria-hidden="true" /> {LONGER_CONTENT_SHORT}
              </span>
            )}
            {showStatus && !completed && (
              <span className="flex items-center gap-1 truncate text-foreground/75">
                {status.icon} {statusLabel(item, today)}
              </span>
            )}
          </div>
        ) : (
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

            {item.overBudget && !completed && (
              <Chip size="sm" variant="soft" color="warning" title={LONGER_CONTENT_HINT}>
                <TriangleAlert className="size-3" aria-hidden="true" />
                {LONGER_CONTENT_LABEL}
              </Chip>
            )}

            {!completed && (
              <ArrowRight02Icon
                size={16}
                className="ml-auto text-accent transition-transform duration-[var(--duration-md)] ease-[var(--ease-zen)] group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </div>
    </Card>
  );

  const body = subdued ? card : <Reveal className="h-full rounded-2xl">{card}</Reveal>;
  const classes = cn('group block h-full rounded-2xl', !compact && 'min-h-[188px]');

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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted">{hint}</p>
      </div>
      {/*
       * Uma coluna no mobile.
       *
       * `.toggle-button` é `white-space: nowrap` e `width: fit-content`, então em
       * três colunas de ~110px o detalhe ("+10 min nas próximas") não encolhia
       * nem quebrava: vazava por cima do vizinho e o terceiro botão saía do card.
       * Empilhado, cada opção vira uma linha com o rótulo à esquerda e o efeito à
       * direita, e sobra largura para os dois.
       */}
      <ToggleButtonGroup
        aria-label={title}
        selectionMode="single"
        isDetached
        fullWidth
        selectedKeys={selected ? [selected] : []}
        onSelectionChange={(keys) => {
          const [next] = Array.from(keys);
          if (next !== undefined) onSelect(String(next) as SessionLoadRating);
        }}
        className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3 lg:shrink-0"
      >
        {feedbackLabels.map((feedback) => (
          <ToggleButton
            key={feedback.value}
            id={feedback.value}
            className="h-auto w-full min-w-0 flex-row items-center justify-between gap-3 whitespace-normal px-3.5 py-2.5 text-left sm:flex-col sm:items-start sm:justify-center sm:gap-0.5"
          >
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
  const [viewMode, setViewMode] = useState<TrailView>('next');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [postponeTarget, setPostponeTarget] = useState<PostponeTarget | null>(null);
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
      if (item.status !== 'pending' && !completedOn(item, today)) return result;
      result[item.sessionId] = [...(result[item.sessionId] || []), item];
      return result;
    }, {});
    return Object.entries(groups).sort(([, a], [, b]) => a[0].scheduledDate.localeCompare(b[0].scheduledDate));
  }, [trail, today]);

  /*
   * Horizonte curto: as próximas sessões, não o plano inteiro.
   *
   * Uma trilha real tem dezenas de conteúdos. Despejar todos como cards
   * transforma o plano num backlog — a pessoa abre para saber o que fazer e
   * recebe a conta de tudo que falta. Três sessões é o recorte que responde
   * "esta semana" sem virar cobrança; o resto vive na aba da trilha completa.
   * O corte é por sessão, não por data, porque quem estuda 5x por semana e quem
   * estuda 1x precisam do mesmo número de próximos passos, não do mesmo prazo.
   */
  const nextSessions = useMemo(() => sessions.slice(0, NEXT_SESSIONS_HORIZON), [sessions]);
  const sessionsBeyondHorizon = Math.max(0, sessions.length - NEXT_SESSIONS_HORIZON);

  /*
   * Aviso antecipado de sessão mais longa, para além do card de hoje.
   *
   * O card "Hoje" só fala do dia atual — quem estuda 20 minutos por sessão não
   * tinha como saber, chegando na quinta, que a quinta reserva uma masterclass
   * de 60. `overBudget` já marca esses dias (ver `schedulePendingItems`); aqui
   * só se junta o que está pendente e mais longo dentro das duas próximas
   * semanas, um por dia, para dar tempo da pessoa se programar.
   */
  const upcomingLongerSessions = useMemo(() => {
    if (!trail) return [];
    const horizonEnd = fromLocalDateKey(today);
    horizonEnd.setDate(horizonEnd.getDate() + LONGER_CONTENT_HORIZON_DAYS);
    const horizonEndKey = toLocalDateKey(horizonEnd);

    const byDate = new Map<string, number>();
    trail.items.forEach((item) => {
      if (item.status !== 'pending' || !item.overBudget) return;
      if (item.scheduledDate <= today || item.scheduledDate > horizonEndKey) return;
      byDate.set(item.scheduledDate, (byDate.get(item.scheduledDate) || 0) + item.durationMin);
    });

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, minutes]) => ({ date, minutes }));
  }, [trail, today]);

  /*
   * Cada aba carrega o seu número. Sem eles a pessoa precisa abrir as três para
   * descobrir onde está o volume — e "Agenda" e "Trilha completa" mostram contas
   * diferentes (sessões planejadas x conteúdos da trilha).
   */
  const tabItems = useMemo(
    () => [
      { id: 'next' as const, label: 'Próximos passos', count: nextSessions.length, icon: LayoutList },
      { id: 'calendar' as const, label: 'Agenda', count: sessions.length, icon: CalendarDays },
      { id: 'full' as const, label: 'Trilha completa', count: trail?.items.length ?? 0, icon: Route },
    ],
    [nextSessions.length, sessions.length, trail?.items.length],
  );

  /*
   * A trilha completa é uma lista só, na ordem do plano.
   *
   * Antes era agrupada por curso, e isso confundia de duas maneiras. Uma aula
   * avulsa de "Negociação" virava um card com o nome do curso, barra de
   * progresso e numeração começando em 1 — indistinguível do curso inteiro estar
   * na trilha. E o agrupamento embaralhava a sequência: tudo de um curso saía
   * junto, "de uma vez", mesmo quando o plano intercalava formações.
   *
   * `order` é a ordem que o motor montou a partir da curadoria (essencial antes
   * de aprofundamento antes de extra e, dentro de cada faixa, a ordem que o
   * admin mapeou no onboarding, com os pré-requisitos resolvidos). O curso de
   * origem vira legenda da linha em vez de cabeçalho de bloco.
   */
  const fullTrailItems = useMemo(
    () => (trail ? [...trail.items].sort((a, b) => a.order - b.order) : []),
    [trail],
  );

  const stats = useMemo(() => (trail ? computeStudyStats(trail) : null), [trail]);
  const undoIconRef = useRef<UndoIconHandle>(null);

  const todayItems = trail?.items.filter((item) => item.scheduledDate === today) || [];
  const todayPending = todayItems.filter((item) => item.status === 'pending');
  const completed = trail?.items.filter((item) => item.status === 'completed').length || 0;
  const completion = trail?.items.length ? Math.round((completed / trail.items.length) * 100) : 0;
  const weeklyGoal = trail ? weeklyMinutes(effectiveAvailability(trail)) : 0;
  const todaySessionId = todayItems[0]?.sessionId;
  const todayBudget = trail
    ? minutesForWeekday(effectiveAvailability(trail), new Date().getDay() as Weekday)
    : 0;
  const todayFeedback = trail?.feedbackHistory?.find((item) => item.sessionId === todaySessionId);

  /*
   * Orçamento do dia. `todayBudget` é 0 fora da rotina, então o medidor precisa
   * tratar "sem reserva" como barra cheia em vez de dividir por zero.
   */
  const todayPendingMinutes = todayPending.reduce((sum, item) => sum + item.durationMin, 0);
  const overBudget = todayPendingMinutes > todayBudget;
  const budgetPercent = todayBudget > 0
    ? Math.min(100, Math.round((todayPendingMinutes / todayBudget) * 100))
    : 100;

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
    setPostponeTarget(null);
  };

  /**
   * Adiar um conteúdo só.
   *
   * Sem confirmação, ao contrário de adiar a sessão: aqui a mudança é local — um
   * item cai para o próximo dia da rotina e o resto do dia continua de pé — e o
   * aviso em `aria-live` já conta o que aconteceu, inclusive quando a sequência
   * do curso obrigou colegas do mesmo dia a irem junto.
   */
  const handlePostponeItem = (item: LearningTrailItem) => {
    if (!trail) return;
    const updated = postponeTrailItem(trail, item.id);
    if (updated === trail) return;

    const movedTogether = updated.items.filter(
      (next) => next.id !== item.id
        && next.scheduledDate !== trail.items.find((prev) => prev.id === next.id)?.scheduledDate,
    ).length;

    commitTrail(updated);
    trackTrailEvent('content_postponed', { itemId: item.id });
    setPostponeTarget(null);
    setAdaptationMessage(
      movedTogether > 0
        ? `“${item.title}” foi para o próximo dia da sua rotina, e ${movedTogether} ${movedTogether === 1 ? 'conteúdo seguinte teve' : 'conteúdos seguintes tiveram'} as datas ajustadas. O resto da sessão atual continua valendo.`
        : `“${item.title}” foi para o próximo dia da sua rotina. O resto da sessão atual continua valendo.`,
    );
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
                Criar minha trilha <ArrowRight02Icon size={16} aria-hidden="true" />
              </Link>
            </EmptyState>
          </Card>
        </div>
      </main>
    );
  }

  const renderSessions = (
    mode: 'timeline' | 'calendar',
    list: Array<[string, LearningTrailItem[]]>,
  ) => (
    <div className={cn(mode === 'timeline' ? 'space-y-10' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}>
      {list.map(([sessionId, items], index) => {
        const date = new Date(`${items[0].scheduledDate}T12:00:00`);
        const isToday = items[0].scheduledDate === today;
        const isLast = index === list.length - 1;
        const pendingItems = items.filter((item) => item.status === 'pending');
        const doneItems = items.filter((item) => item.status === 'completed');
        const canPostpone = pendingItems.length > 0 && items[0].scheduledDate >= today;

        return (
          <Rise
            as="section"
            key={sessionId}
            className={cn('relative min-w-0 flex flex-col', mode === 'timeline' ? 'sm:pl-[4.5rem]' : 'surface-card p-4 shadow-sm')}
          >
            {/* Rail da linha do tempo: vive na calha à esquerda, nunca atrás dos cards. */}
            {mode === 'timeline' && !isLast && (
              <span aria-hidden="true" className="absolute -bottom-10 left-5 top-12 hidden w-px bg-hairline sm:block" />
            )}

            {/*
             * No mobile o cabeçalho é uma coluna: número + data em cima, ação
             * embaixo. Tudo na mesma linha espremia o título entre o filete e o
             * botão, e "Sábado, 23 de agosto" virava "Sába…".
             */}
            <div
              className={cn(
                'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4',
                mode === 'timeline' ? 'mb-5' : 'mb-4',
              )}
            >
              <div className="flex min-w-0 items-center gap-4 sm:contents">
              {mode === 'timeline' && (
                <span
                  data-numeric
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-full text-sm font-extrabold',
                    isToday ? 'bg-accent text-accent-foreground shadow-elev-2' : 'bg-default text-default-foreground',
                    'sm:absolute sm:left-0 sm:top-0',
                  )}
                >
                  {index + 1}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={cn("font-display font-extrabold first-letter:uppercase tracking-[-0.02em] text-foreground truncate", mode === 'calendar' ? 'text-sm' : 'text-lg')}>
                    {date.toLocaleDateString('pt-BR', mode === 'calendar' ? { weekday: 'short', day: '2-digit', month: 'short' } : { weekday: 'long', day: '2-digit', month: 'long' })}
                  </h3>
                  {mode === 'calendar' && (
                    <span
                      data-numeric
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full text-[0.6875rem] font-extrabold',
                        isToday ? 'bg-accent text-accent-foreground shadow-elev-2' : 'bg-default text-default-foreground',
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
                {/* O cabeçalho conta o que falta; o que já foi feito aparece ao lado. */}
                <p className={cn("mt-0.5 font-semibold text-muted truncate", mode === 'calendar' ? 'text-[0.6875rem]' : 'text-xs')} data-numeric>
                  {pendingItems.reduce((sum, item) => sum + item.durationMin, 0)} min ·{' '}
                  {pendingItems.length} {mode === 'calendar' ? 'cont.' : (pendingItems.length === 1 ? 'conteúdo' : 'conteúdos')}
                  {doneItems.length > 0 && (
                    <span className="text-success"> · {doneItems.length} {mode === 'calendar' ? 'concl.' : (doneItems.length > 1 ? 'concluídos' : 'concluído')}</span>
                  )}
                </p>
              </div>
              </div>

              {mode === 'timeline' && (
                <>
                  {/* O filete só existe para preencher a linha; no mobile não há linha. */}
                  <span aria-hidden="true" className="hidden h-px min-w-8 flex-1 bg-hairline sm:block" />
                  {canPostpone && (
                    <Button
                      variant="tertiary"
                      size="sm"
                      className="self-start sm:self-auto"
                      onClick={() => setPostponeTarget({ kind: 'session', sessionId })}
                    >
                      <HugeiconsIcon icon={CalendarCheckOut01Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
                      Adiar sessão
                    </Button>
                  )}
                </>
              )}
            </div>

            {mode === 'calendar' && canPostpone && (
              <div className="mb-4">
                <Button
                  variant="tertiary"
                  size="sm"
                  className="h-8 w-full justify-center text-xs"
                  onClick={() => setPostponeTarget({ kind: 'session', sessionId })}
                >
                  <HugeiconsIcon icon={CalendarCheckOut01Icon} size={14} strokeWidth={1.8} aria-hidden="true" />
                  Adiar sessão
                </Button>
              </div>
            )}

            <div className={cn('grid gap-3 flex-1', mode === 'timeline' && 'md:grid-cols-2 xl:grid-cols-3')}>
              {items.map((item) => {
                /*
                 * Aula fecha sozinha: a sala de aula grava a conclusão. Artigo e
                 * link externo abrem fora da plataforma e não têm como avisar —
                 * sem este botão, eles ficavam pendentes para sempre e seguravam
                 * a agenda de quem já os tinha lido.
                 */
                const selfReported = item.status === 'pending'
                  && (item.type === 'article' || item.type === 'external_link');

                /*
                 * Adiar um conteúdo, não o dia inteiro. Só faz sentido para o que
                 * ainda está pendente e para hoje ou depois — adiar o passado é
                 * trabalho do replanejamento automático.
                 */
                const canPostponeItem = item.status === 'pending' && item.scheduledDate >= today;

                return (
                  <div key={item.id} className="group/item lift-item relative min-w-0 flex flex-col">
                    <TrailContentCard item={item} today={today} withActionBar={selfReported && mode === 'timeline'} compact={mode === 'calendar'} subdued={mode === 'calendar'} />

                    {/*
                     * Adiar é escape, não ação principal: mora no canto do card,
                     * como ícone. Fica sempre visível em vez de aparecer no hover
                     * — no toque não existe hover, e foi justamente no celular que
                     * a tela ficou difícil de usar.
                     *
                     * É irmão do card, não filho: o card inteiro é um link, e
                     * <button> dentro de <a> não é HTML válido.
                     */}
                    {canPostponeItem && (
                      <button
                        type="button"
                        onClick={() => setPostponeTarget({ kind: 'item', item })}
                        aria-label={`Adiar “${item.title}” para o próximo dia da rotina`}
                        title="Adiar conteúdo"
                        className={cn(
                          'material-thin press absolute z-10 grid place-items-center rounded-full text-muted',
                          'transition-colors duration-[var(--duration-md)] hover:text-foreground',
                          mode === 'calendar' ? 'right-2 top-2 size-7' : 'right-2.5 top-2.5 size-8',
                        )}
                      >
                        <HugeiconsIcon
                          icon={CalendarCheckOut01Icon}
                          size={mode === 'calendar' ? 13 : 15}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </button>
                    )}

                    {selfReported && (
                      <Button
                        size="sm"
                        variant={mode === 'calendar' ? 'ghost' : 'tertiary'}
                        isDisabled={completingId === item.id}
                        onClick={() => handleComplete(item)}
                        className={cn(mode === 'calendar' ? 'mt-2 h-8 w-full justify-center text-xs' : 'absolute inset-x-5 bottom-4 justify-center')}
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

  const renderFullTrail = () => (
    <Rise as="section" className="surface-card p-5 sm:p-6">
      {/* Linhas, não cards: numa trilha de dezenas de conteúdos a densidade é o recurso escasso. */}
      <ul className="border-t border-hairline">
        {fullTrailItems.map((item, index) => {
          const done = item.status === 'completed';
          const href = contentHref(item);
          const external = item.type === 'external_link';
          const type = typeVisual(item.type);
          const origin = item.courseName || item.moduleName;
          const visiblyRescheduled = item.status === 'pending'
            && (item.rescheduled || item.scheduledDate < today);

          const row = (
            <>
              <span
                data-numeric
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full text-[0.6875rem] font-extrabold',
                  done ? 'bg-success text-success-foreground' : 'bg-default text-default-foreground',
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-sm font-bold',
                    done ? 'text-muted line-through decoration-success/50' : 'text-foreground',
                  )}
                >
                  {item.title}
                </span>
                {/*
                 * A origem vira legenda da linha. É o que responde "de onde veio
                 * isto" sem sugerir que o curso inteiro entrou na trilha.
                 */}
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  <type.Icon className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {type.label}
                    {origin ? ` · ${origin}` : ''}
                    {item.moduleName && item.moduleName !== origin ? ` · ${item.moduleName}` : ''}
                  </span>
                </span>
              </span>

              <span className="shrink-0 text-xs font-semibold text-muted" data-numeric>
                {item.durationMin} min
              </span>

              <span
                className={cn(
                  'hidden w-40 shrink-0 text-right text-xs font-semibold sm:block',
                  done ? 'text-success' : visiblyRescheduled ? 'text-warning' : 'text-muted',
                )}
                data-numeric
                title={item.overdueSince ? `Previsto originalmente para ${shortDate(item.overdueSince)}` : undefined}
              >
                {done
                  ? 'Concluído'
                  : visiblyRescheduled
                    ? `${statusLabel(item, today)} · ${shortDate(item.scheduledDate)}`
                    : shortDate(item.scheduledDate)}
              </span>
            </>
          );

          const classes = cn(
            'flex items-center gap-3 border-b border-hairline py-3 transition-colors',
            done ? 'opacity-70' : 'hover:bg-background-secondary/60',
          );

          return (
            <li key={item.id}>
              {external ? (
                <a href={href} target="_blank" rel="noreferrer" className={classes}>{row}</a>
              ) : (
                <Link href={href} className={classes}>{row}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </Rise>
  );

  return (
    <div className="pt-[76px]">
      <section className="relative isolate overflow-hidden">
        {/*
         * Aura local da abertura.
         *
         * O `ambient-canvas` do RouteShell é fixo e propositalmente discreto —
         * bom de fundo, fraco de abertura. Estas três manchas desfocadas ancoram
         * o topo desta página e, principalmente, dão ao vidro do painel de
         * progresso algo de colorido para refratar.
         */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[46rem] [mask-image:linear-gradient(to_bottom,black_45%,transparent_95%)]"
        >
          <div className="absolute -left-32 top-0 size-[36rem] rounded-full bg-accent/16 blur-[130px]" />
          <div className="absolute -right-28 top-16 size-[32rem] rounded-full bg-warning/10 blur-[130px]" />
          <div className="absolute left-1/2 top-64 size-[30rem] -translate-x-1/2 rounded-full bg-success/10 blur-[140px]" />
        </div>

        <div className="editorial-container pb-10 pt-14 sm:pb-12 sm:pt-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
            <Rise>
              <p className="eyebrow">Agenda personalizada</p>
              <h1 className="display-2 mt-3 max-w-2xl text-foreground">Por que estes conteúdos</h1>
              <p className="lede mt-5">
                Montamos sua sequência a partir do que você respondeu. Mudou de objetivo ou de rotina? Ajuste, a agenda se reorganiza sozinha.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setAdjustOpen(true)}>
                  <Settings2 className="size-4" aria-hidden="true" /> Ajustar rotina
                </Button>
                {/*
                 * O ícone é controlado por ref: com o handle montado, o próprio
                 * componente para de escutar o mouse e a volta acontece no hover
                 * do botão inteiro, não só nos 16px do desenho.
                 */}
                <Link
                  href="/onboarding?edit=1"
                  className={buttonVariants({ variant: 'outline' })}
                  onMouseEnter={() => undoIconRef.current?.startAnimation()}
                  onMouseLeave={() => undoIconRef.current?.stopAnimation()}
                >
                  <UndoIcon ref={undoIconRef} size={16} aria-hidden="true" />
                  Reajustar trilha
                </Link>
              </div>
            </Rise>

            <Rise delay={90} className="min-w-0">
              <TrailProgressPanel
                completion={completion}
                completed={completed}
                total={trail.items.length}
                weeklyGoal={weeklyGoal}
              />
            </Rise>
          </div>

          {stats && <StudyLedger stats={stats} />}
        </div>
      </section>

      <main className="editorial-container pb-10 pt-6 sm:pb-14 sm:pt-8">
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
              Criar minha trilha <ArrowRight02Icon size={16} aria-hidden="true" />
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
              <Alert.Title>Conteúdo atrasado, agenda ajustada.</Alert.Title>
              <Alert.Description>
                O que não foi concluído ficou marcado como atrasado e foi distribuído com o restante
                nas próximas sessões disponíveis.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {upcomingLongerSessions.length > 0 && (
          <Alert status="warning" className="mb-8">
            <Alert.Indicator>
              <TriangleAlert className="size-5" aria-hidden="true" />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>
                {upcomingLongerSessions.length === 1
                  ? 'Uma sessão mais longa está chegando.'
                  : `${upcomingLongerSessions.length} sessões mais longas estão chegando.`}
              </Alert.Title>
              <Alert.Description data-numeric>
                {upcomingLongerSessions.slice(0, 3).map((session, index) => (
                  <span key={session.date}>
                    {index > 0 && ' · '}
                    <span className="font-semibold text-foreground first-letter:uppercase">
                      {weekdayDate(session.date)}
                    </span>
                    {' '}({session.minutes} min)
                  </span>
                ))}
                {upcomingLongerSessions.length > 3 && ` e mais ${upcomingLongerSessions.length - 3}`}
                {' '}— reserve um tempo extra nesses dias, ou adie a sessão se não encaixar.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {todayPending.length > 0 ? (
          /*
           * Banner, não card de destaque: "o que eu faço agora" é a pergunta da
           * home. Repetir aqui a mesma sessão em tamanho grande fazia as duas
           * telas competirem — esta é o plano completo, e é só isso.
           *
           * Onde havia um botão "Ir para o painel" agora mora o medidor do dia.
           * O botão mandava embora de uma tela que a pessoa acabou de abrir, e o
           * texto ("seu próximo passo fica no painel") só existia para explicá-lo.
           */
          <div className="material-thin mb-12 overflow-hidden rounded-[1.75rem]">
            <div className="flex flex-col gap-7 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-12 sm:p-8">
              <div className="min-w-0">
                <p className="eyebrow">Hoje</p>
                <p
                  className="mt-2 flex items-start gap-2.5 font-display text-xl font-extrabold tracking-[-0.02em] text-foreground"
                  data-numeric
                >
                  {/* `mt-[3px]`: com o título quebrando em duas linhas, centralizar o ícone o deixava boiando entre elas. */}
                  <Clock3 className="mt-[3px] size-5 shrink-0 text-accent" aria-hidden="true" />
                  {todayPending.length} {todayPending.length === 1 ? 'conteúdo' : 'conteúdos'} ·{' '}
                  {todayPendingMinutes} min pendentes
                </p>
                <p className="mt-2.5 max-w-xl text-sm leading-6 text-muted" data-numeric>
                  O plano reservou {todayBudget} minutos para hoje, com folga de 20% para não cortar
                  uma aula ao meio.
                </p>
              </div>

              <div className="w-full shrink-0 sm:w-60" data-numeric>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="eyebrow">Reservado hoje</span>
                  <span className="font-display text-sm font-bold text-foreground">
                    {todayPendingMinutes}
                    <span className="text-muted">/{todayBudget} min</span>
                  </span>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-hairline-strong">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none',
                      overBudget ? 'bg-warning' : 'bg-accent',
                    )}
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
                <p className="mt-2.5 text-xs leading-5 text-muted">
                  {overBudget
                    ? 'Passou do reservado. Adie o excedente se o dia apertar.'
                    : `Ainda cabem ${todayBudget - todayPendingMinutes} min na sua rotina de hoje.`}
                </p>
              </div>
            </div>

            <div className="border-t border-hairline px-6 py-5 sm:px-8">
              <SessionFeedback
                title="Como essa carga pareceu?"
                hint="Sua resposta ajusta apenas as próximas sessões."
                selected={todayFeedback?.rating}
                onSelect={handleFeedback}
              />
            </div>
          </div>
        ) : (
          <div className="material-thin mb-12 overflow-hidden rounded-[1.75rem]">
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="min-w-0">
                <p className="eyebrow">Hoje</p>
                <h2 className="display-3 mt-2 text-foreground">Nenhuma sessão pendente para hoje.</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                  Você pode descansar ou adiantar qualquer conteúdo planejado, nada está bloqueado.
                </p>
              </div>
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-success-soft text-success-soft-foreground">
                <CheckCircle2 className="size-7" aria-hidden="true" />
              </span>
            </div>

            {todayItems.length > 0 && (
              <div className="border-t border-hairline px-6 py-5 sm:px-8">
                <SessionFeedback
                  title="Como foi a sessão concluída?"
                  hint="Isso calibra o tamanho das próximas sessões."
                  selected={todayFeedback?.rating}
                  onSelect={handleFeedback}
                />
              </div>
            )}
          </div>
        )}

        <Tabs.Root
          selectedKey={viewMode}
          onSelectionChange={(key) => setViewMode(String(key) as TrailView)}
          className="gap-0"
        >
          <div className="mb-8 border-b border-hairline pb-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
              <div className="min-w-0">
                <p className="eyebrow">Plano de aprendizagem</p>
                {/*
                 * `display-3`, não `display-2`: o h1 da página já é display-2 e
                 * dois títulos do mesmo tamanho deixavam a tela sem hierarquia.
                 */}
                <h2 className="display-3 mt-2 text-foreground">{VIEW_META[viewMode].title}</h2>
              </div>

              {/*
               * O `ListContainer` é o que traz a trilha do controle segmentado e
               * o scroller; sem ele (e sem o `Indicator` dentro de cada aba) as
               * abas viravam três rótulos soltos, sem nem dizer qual estava ativa.
               * Mesmo arranjo de `LessonTabs`.
               */}
              <Tabs.ListContainer className="material-thin w-full shrink-0 rounded-full px-1 sm:w-auto">
                <Tabs.List aria-label="Como ver seu plano">
                  {tabItems.map(({ id, label, count, icon: Icon }) => (
                    <Tabs.Tab
                      key={id}
                      id={id}
                      // Sem isto o contador entra no nome acessível como "Agenda8".
                      aria-label={`${label} (${count})`}
                      className="group h-11 w-auto shrink-0 gap-2 rounded-full px-4 text-sm font-semibold"
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span>{label}</span>
                      <span
                        aria-hidden="true"
                        className="rounded-full bg-default px-1.5 py-0.5 text-[0.6875rem] font-bold text-muted transition-colors group-data-[selected]:bg-accent-soft group-data-[selected]:text-accent-soft-foreground"
                        data-numeric
                      >
                        {count}
                      </span>
                      <Tabs.Indicator className="rounded-full" />
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
            </div>

            {/* A dica ganha a largura inteira embaixo, em vez de espremer o título. */}
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">{VIEW_META[viewMode].hint}</p>
          </div>

          <Tabs.Panel id="next">
            {nextSessions.length > 0 ? (
              <>
                {renderSessions('timeline', nextSessions)}

                {/*
                 * O que ficou fora do horizonte não some — vira uma linha só, e
                 * quem quiser a conta inteira escolhe vê-la.
                 */}
                {sessionsBeyondHorizon > 0 && (
                  <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-6">
                    <p className="text-sm font-semibold text-muted" data-numeric>
                      Mais {sessionsBeyondHorizon} {sessionsBeyondHorizon === 1 ? 'sessão planejada' : 'sessões planejadas'} depois destas.
                    </p>
                    <Button variant="tertiary" onClick={() => setViewMode('full')}>
                      Ver trilha completa <ArrowRight02Icon size={16} aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="border-hairline">
                <EmptyState className="gap-0 px-6 py-12 text-center">
                  <span className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success-soft-foreground">
                    <CheckCircle2 className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="display-3 mt-5 text-foreground">Nada pendente por aqui.</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-muted">
                    Você concluiu tudo que estava planejado. Reveja seus objetivos para trazer conteúdo novo,
                    ou acompanhe seu progresso na trilha completa.
                  </p>
                  <Button variant="tertiary" className="mt-6" onClick={() => setViewMode('full')}>
                    Ver trilha completa <ArrowRight02Icon size={16} aria-hidden="true" />
                  </Button>
                </EmptyState>
              </Card>
            )}
          </Tabs.Panel>

          <Tabs.Panel id="calendar">{renderSessions('calendar', sessions)}</Tabs.Panel>
          <Tabs.Panel id="full">{renderFullTrail()}</Tabs.Panel>
        </Tabs.Root>
      </main>

      <AlertDialog.Root
        isOpen={postponeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPostponeTarget(null);
        }}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="md">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Icon status="warning">
                  <HugeiconsIcon icon={CalendarCheckOut01Icon} size={20} strokeWidth={1.8} aria-hidden="true" />
                </AlertDialog.Icon>
                <AlertDialog.Heading>
                  {postponeTarget?.kind === 'item' ? 'Adiar este conteúdo?' : 'Adiar esta sessão?'}
                </AlertDialog.Heading>
              </AlertDialog.Header>

              <AlertDialog.Body>
                {postponeTarget?.kind === 'item' ? (
                  <p>
                    “{postponeTarget.item.title}” vai para o próximo dia da sua rotina e o resto da
                    sessão atual continua valendo. Os próximos dias serão reorganizados para não
                    acumular conteúdo, mantendo a ordem das aulas.
                  </p>
                ) : (
                  <p>
                    Deseja realmente adiar esta sessão? As próximas datas serão reorganizadas automaticamente,
                    sem alterar o que você já concluiu.
                  </p>
                )}
              </AlertDialog.Body>

              <AlertDialog.Footer>
                <Button variant="tertiary" onClick={() => setPostponeTarget(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!postponeTarget) return;
                    if (postponeTarget.kind === 'item') handlePostponeItem(postponeTarget.item);
                    else handlePostpone(postponeTarget.sessionId);
                  }}
                >
                  {postponeTarget?.kind === 'item' ? 'Sim, adiar conteúdo' : 'Sim, adiar sessão'}
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
