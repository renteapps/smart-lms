import {
  EligibleLesson,
  LearningRole,
  LearningTrail,
  LearningTrailItem,
  Questionnaire,
  ResolvedContent,
  SessionLoadRating,
  StudyAvailability,
  Weekday,
} from '@/types/trilha';
import { createContentIndex, EMPTY_CONTENT_INDEX, type ContentIndex, type ContentResolver } from '@/lib/contentCatalog';
import { mockEligibleLessons, TRAIL_CONTENT_INDEX } from '@/lib/seed/questionnaire';

type UserAnswers = Record<string, string[]>;
type Candidate = ResolvedContent & {
  score: number;
  learningRole: LearningRole;
  firstSeen: number;
  reasons: Set<string>;
  warnings: string[];
};

const rolePriority: Record<LearningRole, number> = {
  essential: 0,
  deepening: 1,
  extra: 2,
};

export const DEFAULT_AVAILABILITY: StudyAvailability = {
  weekdays: [1, 3, 5],
  minutesPerSession: 30,
};

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromLocalDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function nextPreferredDate(from: Date, weekdays: Weekday[], includeFrom = true): Date {
  const cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);
  if (!includeFrom) cursor.setDate(cursor.getDate() + 1);

  for (let offset = 0; offset < 14; offset += 1) {
    if (weekdays.includes(cursor.getDay() as Weekday)) return cursor;
    cursor.setDate(cursor.getDate() + 1);
  }
  return cursor;
}

function normalizeIndex(indexOrResolver?: ContentIndex | ContentResolver): ContentIndex {
  if (!indexOrResolver) return TRAIL_CONTENT_INDEX;
  if (typeof indexOrResolver === 'function') {
    return { ...createContentIndex([], mockEligibleLessons), resolve: indexOrResolver };
  }
  return indexOrResolver;
}



export function validateQuestionnaire(
  questionnaire: Questionnaire,
  indexOrResolver?: ContentIndex | ContentResolver,
): string[] {
  const index = normalizeIndex(indexOrResolver);
  const errors: string[] = [];
  const availabilityQuestions = questionnaire.questions.filter((question) => question.type === 'availability');

  if (availabilityQuestions.length !== 1) errors.push('Mantenha exatamente uma pergunta de disponibilidade.');
  if (questionnaire.questions.at(-1)?.type !== 'availability') errors.push('A disponibilidade precisa ser a última pergunta.');

  questionnaire.questions.forEach((question) => {
    if (question.type === 'availability') return;
    if (question.options.length === 0) errors.push(`A pergunta “${question.text}” precisa ter ao menos uma opção.`);
    question.options.forEach((option) => {
      option.contentMappings?.forEach((mapping) => {
        const resolved = index.resolve(mapping);
        if (resolved.length === 0) errors.push(`“${mapping.title}” não pôde ser encontrado ou expandido.`);
        if ((mapping.type === 'article' || mapping.type === 'external_link') && !mapping.estimatedDurationMin) {
          errors.push(`Informe a duração estimada de “${mapping.title}”.`);
        }
      });
    });
  });

  return [...new Set(errors)];
}

/**
 * Fração somada ao score por acerto de afinidade.
 *
 * Deliberadamente pequena: afinidade **desempata**, nunca decide. Como a
 * ordenação olha `rolePriority` antes do score, ela também não consegue
 * promover um `extra` acima de um `essential` mapeado pelo admin.
 */
const AFFINITY_WEIGHT = 0.1;
/** Mínimo para um conteúdo não mapeado entrar sozinho: um acerto de tópico ou problema. */
const AFFINITY_ENTRY_THRESHOLD = 2;

type AffinitySignal = { tag: string; label: string };

function normalizeTag(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** As tags que o admin já autorou nas opções que a pessoa marcou. */
function collectAffinitySignals(answers: UserAnswers, questionnaire: Questionnaire): AffinitySignal[] {
  const signals: AffinitySignal[] = [];

  questionnaire.questions.forEach((question) => {
    if (question.type === 'availability') return;
    const selected = answers[question.id] || [];
    question.options.forEach((option) => {
      if (!selected.includes(option.label)) return;
      (option.tags || []).forEach((tag) => signals.push({ tag: normalizeTag(tag), label: option.label }));
    });
  });

  return signals;
}

function scoreAffinity(lesson: EligibleLesson, signals: AffinitySignal[]): { score: number; label: string | null } {
  const topics = new Set((lesson.topics || []).map(normalizeTag));
  const problems = new Set((lesson.problemasQueResolve || []).map(normalizeTag));
  const level = normalizeTag(lesson.nivel);

  let score = 0;
  let label: string | null = null;

  signals.forEach((signal) => {
    if (topics.has(signal.tag) || problems.has(signal.tag)) {
      score += 2;
      label = label ?? signal.label;
    } else if (level === signal.tag) {
      score += 1;
      label = label ?? signal.label;
    }
  });

  return { score, label };
}

/**
 * Aplica a afinidade sobre os candidatos já coletados.
 *
 * O motor original só enxergava conteúdo **explicitamente mapeado** por um admin
 * numa opção de resposta: `tags`, `topics`, `nivel` e `problemasQueResolve` eram
 * preenchidos na tela de curadoria e nunca lidos. Na prática, um curso novo só
 * entrava na trilha de alguém se alguém o mapeasse à mão — o oposto de
 * automático, e insustentável com muitos cursos.
 *
 * Aqui esses metadados finalmente pesam: reforçam o score de quem já é candidato
 * e deixam conteúdo não mapeado entrar como `extra`. Só entra sozinho quem já tem
 * os pré-requisitos cobertos — puxar uma cadeia inteira de dependências por causa
 * de um "extra" inflaria a trilha sem que ninguém tenha pedido.
 */
function applyAffinity(
  candidates: Map<string, Candidate>,
  signals: AffinitySignal[],
  catalog: EligibleLesson[],
  resolver: ContentResolver,
  seenOrder: number,
): void {
  if (signals.length === 0) return;
  let order = seenOrder;

  catalog.forEach((lesson) => {
    const { score, label } = scoreAffinity(lesson, signals);
    if (score === 0 || !label) return;

    const existing = candidates.get(lesson.lessonId);
    if (existing) {
      existing.score += score * AFFINITY_WEIGHT;
      return;
    }

    if (score < AFFINITY_ENTRY_THRESHOLD) return;
    const prerequisitesReady = (lesson.prerequisitos || []).every((id) => candidates.has(id));
    if (!prerequisitesReady) return;

    const [content] = resolver({
      id: lesson.lessonId,
      type: 'lesson',
      title: lesson.title,
      learningRole: 'extra',
    });
    if (!content) return;

    candidates.set(lesson.lessonId, {
      ...content,
      score: score * AFFINITY_WEIGHT,
      learningRole: 'extra',
      firstSeen: order,
      reasons: new Set([`seu interesse em ${label}`]),
      warnings: [],
    });
    order += 1;
  });
}

function collectCandidates(
  answers: UserAnswers,
  questionnaire: Questionnaire,
  index: ContentIndex,
): Candidate[] {
  const resolver: ContentResolver = index.resolve;
  const catalog: EligibleLesson[] = index.eligibleLessons;
  const candidates = new Map<string, Candidate>();
  let seenOrder = 0;

  questionnaire.questions.forEach((question) => {
    const selected = answers[question.id] || [];
    if (question.type === 'availability' || selected.length === 0) return;

    question.options.forEach((option) => {
      if (!selected.includes(option.label)) return;
      const weight = option.weight || 1;
      (option.contentMappings || []).forEach((mapping) => {
        resolver(mapping).forEach((content) => {
          const existing = candidates.get(content.id);
          if (existing) {
            existing.score += weight;
            existing.reasons.add(option.label);
            if (rolePriority[mapping.learningRole] < rolePriority[existing.learningRole]) {
              existing.learningRole = mapping.learningRole;
            }
            return;
          }

          candidates.set(content.id, {
            ...content,
            score: weight,
            learningRole: mapping.learningRole,
            firstSeen: seenOrder,
            reasons: new Set([option.label]),
            warnings: [],
          });
          seenOrder += 1;
        });
      });
    });
  });

  // Antes da varredura de pré-requisitos: o que a afinidade trouxer também
  // precisa ter suas dependências resolvidas e entrar na ordenação topológica.
  applyAffinity(candidates, collectAffinitySignals(answers, questionnaire), catalog, resolver, seenOrder);

  const ensurePrerequisite = (id: string, inheritedScore: number, path: string[]): void => {
    if (path.includes(id)) {
      const cyclic = candidates.get(path.at(-1) || id);
      cyclic?.warnings.push(`Ciclo de pré-requisitos detectado: ${[...path, id].join(' → ')}`);
      return;
    }

    let candidate = candidates.get(id);
    if (!candidate) {
      const mapping = index.mappingFor(id);
      const content = mapping ? resolver(mapping)[0] : undefined;
      if (!content) {
        const dependent = candidates.get(path.at(-1) || '');
        dependent?.warnings.push(`Pré-requisito ${id} não encontrado.`);
        return;
      }
      candidate = {
        ...content,
        score: inheritedScore,
        learningRole: 'essential',
        firstSeen: -1,
        reasons: new Set(['Pré-requisito da sua sequência']),
        warnings: [],
      };
      candidates.set(id, candidate);
    }
    candidate.prerequisites?.forEach((prerequisiteId) => ensurePrerequisite(prerequisiteId, candidate!.score, [...path, id]));
  };

  [...candidates.values()].forEach((candidate) => {
    candidate.prerequisites?.forEach((id) => ensurePrerequisite(id, candidate.score, [candidate.id]));
  });

  const sorted = [...candidates.values()].sort((a, b) =>
    rolePriority[a.learningRole] - rolePriority[b.learningRole]
    || b.score - a.score
    || a.firstSeen - b.firstSeen
    || a.title.localeCompare(b.title),
  );

  const ordered: Candidate[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (candidate: Candidate) => {
    if (visited.has(candidate.id)) return;
    if (visiting.has(candidate.id)) {
      candidate.warnings.push('Ciclo de pré-requisitos ignorado para manter a trilha disponível.');
      return;
    }
    visiting.add(candidate.id);
    candidate.prerequisites?.forEach((id) => {
      const prerequisite = candidates.get(id);
      if (prerequisite) visit(prerequisite);
      else candidate.warnings.push(`Pré-requisito ${id} não encontrado.`);
    });
    visiting.delete(candidate.id);
    visited.add(candidate.id);
    ordered.push(candidate);
  };

  sorted.forEach(visit);
  return ordered;
}

export function schedulePendingItems(
  items: LearningTrailItem[],
  availability: StudyAvailability,
  startDate = new Date(),
): LearningTrailItem[] {
  const weekdays = availability.weekdays.length > 0 ? availability.weekdays : DEFAULT_AVAILABILITY.weekdays;
  const budget = Math.max(10, Math.min(240, availability.minutesPerSession || DEFAULT_AVAILABILITY.minutesPerSession));
  let sessionDate = nextPreferredDate(startDate, weekdays);
  let sessionMinutes = 0;
  let sessionNumber = 1;

  return items.map((item) => {
    if (item.status === 'completed') return item;
    const mustAdvance = sessionMinutes > 0 && sessionMinutes + item.durationMin > budget;
    if (mustAdvance) {
      sessionDate = nextPreferredDate(sessionDate, weekdays, false);
      sessionMinutes = 0;
      sessionNumber += 1;
    }

    const dateKey = toLocalDateKey(sessionDate);
    const scheduled = {
      ...item,
      scheduledDate: dateKey,
      sessionId: `${dateKey}-${sessionNumber}`,
      overBudget: item.durationMin > budget,
    };
    sessionMinutes += item.durationMin;
    return scheduled;
  });
}

export function generateLearningTrail(
  userId: string,
  answers: UserAnswers,
  questionnaire: Questionnaire,
  availability: StudyAvailability,
  existingTrail?: LearningTrail | null,
  startDate = new Date(),
  indexOrResolver?: ContentIndex | ContentResolver,
): LearningTrail {
  const index = normalizeIndex(indexOrResolver);
  const existingCompleted = new Map(
    (existingTrail?.items || []).filter((item) => item.status === 'completed').map((item) => [item.id, item]),
  );

  const candidates = collectCandidates(answers, questionnaire, index);
  const excludedIds = new Set((existingTrail?.excludedItems || []).map((item) => item.id));
  const draftItems: LearningTrailItem[] = candidates.filter((candidate) => !excludedIds.has(candidate.id)).map((candidate, index) => {
    const completed = existingCompleted.get(candidate.id);
    return {
      id: candidate.id,
      type: candidate.type,
      title: candidate.title,
      durationMin: candidate.durationMin,
      courseId: candidate.courseId,
      moduleId: candidate.moduleId,
      moduleName: candidate.moduleName,
      slug: candidate.slug,
      url: candidate.url,
      cover: candidate.cover,
      prerequisites: candidate.prerequisites,
      order: index + 1,
      reason: candidate.reasons.size > 1
        ? `Conecta ${[...candidate.reasons].slice(0, 2).join(' e ')}`
        : `Recomendado por: ${[...candidate.reasons][0]}`,
      score: candidate.score,
      learningRole: candidate.learningRole,
      status: completed ? 'completed' : 'pending',
      scheduledDate: completed?.scheduledDate || '',
      sessionId: completed?.sessionId || '',
      completedAt: completed?.completedAt,
      warnings: candidate.warnings.length > 0 ? candidate.warnings : undefined,
    };
  });

  /*
   * Conteúdo concluído que deixou de ser recomendado continua na trilha.
   *
   * O mapa acima só preservava o que voltasse a ser candidato: mudar uma resposta
   * apagava do histórico tudo que a nova combinação não mapeia. Como as pesquisas
   * de recalibração regeneram a trilha com frequência, isso derrubaria sequência,
   * minutos estudados e percentual concluído a cada ajuste — a pessoa perderia
   * trabalho que realmente fez. Recalibrar muda o que vem pela frente, nunca o
   * que já passou.
   */
  const candidateIds = new Set(draftItems.map((item) => item.id));
  const retainedCompleted = [...existingCompleted.values()].filter((item) => !candidateIds.has(item.id));
  const orderedItems = [...retainedCompleted, ...draftItems].map((item, index) => ({
    ...item,
    order: index + 1,
  }));

  const items = schedulePendingItems(orderedItems, availability, startDate);
  return {
    formatVersion: 3,
    userId,
    items,
    generatedAt: Date.now(),
    questionnaireVersion: questionnaire.version,
    answers,
    availability: {
      weekdays: [...new Set(availability.weekdays)].sort() as Weekday[],
      minutesPerSession: Math.max(10, Math.min(240, availability.minutesPerSession)),
    },
    adaptiveMinutesPerSession: existingTrail?.adaptiveMinutesPerSession,
    feedbackHistory: existingTrail?.feedbackHistory || [],
    excludedItems: existingTrail?.excludedItems || [],
  };
}

function effectiveAvailability(trail: LearningTrail): StudyAvailability {
  return {
    ...trail.availability,
    minutesPerSession: trail.adaptiveMinutesPerSession || trail.availability.minutesPerSession,
  };
}

export function updateTrailAvailability(
  trail: LearningTrail,
  availability: StudyAvailability,
  startDate = new Date(),
): LearningTrail {
  const normalized: StudyAvailability = {
    weekdays: [...new Set(availability.weekdays)].sort() as Weekday[],
    minutesPerSession: Math.max(10, Math.min(240, availability.minutesPerSession)),
  };
  return {
    ...trail,
    availability: normalized,
    adaptiveMinutesPerSession: undefined,
    items: schedulePendingItems(trail.items, normalized, startDate),
    replannedAt: Date.now(),
  };
}

export function applySessionFeedback(
  trail: LearningTrail,
  sessionId: string,
  rating: SessionLoadRating,
  now = new Date(),
): LearningTrail {
  const sessionItems = trail.items.filter((item) => item.sessionId === sessionId);
  const previousTarget = trail.adaptiveMinutesPerSession || trail.availability.minutesPerSession;
  const delta = rating === 'light' ? 10 : rating === 'heavy' ? -10 : 0;
  const nextTarget = Math.max(10, Math.min(240, previousTarget + delta));
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const feedback = {
    sessionId,
    rating,
    submittedAt: now.toISOString(),
    plannedMinutes: sessionItems.reduce((sum, item) => sum + item.durationMin, 0),
    completedMinutes: sessionItems.filter((item) => item.status === 'completed').reduce((sum, item) => sum + item.durationMin, 0),
    previousTargetMinutes: previousTarget,
    nextTargetMinutes: nextTarget,
  };

  return {
    ...trail,
    adaptiveMinutesPerSession: nextTarget,
    feedbackHistory: [...(trail.feedbackHistory || []).filter((item) => item.sessionId !== sessionId), feedback],
    items: schedulePendingItems(trail.items, { ...trail.availability, minutesPerSession: nextTarget }, tomorrow),
    replannedAt: Date.now(),
  };
}

export function postponeTrailSession(trail: LearningTrail, sessionId: string): LearningTrail {
  const session = trail.items.filter((item) => item.sessionId === sessionId && item.status === 'pending');
  if (session.length === 0) return trail;
  const targetDate = session[0].scheduledDate;
  const shiftedDates = new Map<string, string>();
  const futureDates = [...new Set(trail.items
    .filter((item) => item.status === 'pending' && item.scheduledDate >= targetDate)
    .map((item) => item.scheduledDate))].sort();
  futureDates.forEach((date) => {
    shiftedDates.set(date, toLocalDateKey(nextPreferredDate(fromLocalDateKey(date), trail.availability.weekdays, false)));
  });

  return {
    ...trail,
    items: trail.items.map((item) => {
      const shifted = item.status === 'pending' ? shiftedDates.get(item.scheduledDate) : undefined;
      return shifted ? { ...item, scheduledDate: shifted, sessionId: `${shifted}-postponed`, rescheduled: true } : item;
    }),
    replannedAt: Date.now(),
  };
}

export function removeTrailItem(trail: LearningTrail, contentId: string, startDate = new Date()): LearningTrail {
  const removed = trail.items.find((item) => item.id === contentId);
  if (!removed || removed.status === 'completed') return trail;
  const remaining = trail.items.filter((item) => item.id !== contentId);
  return {
    ...trail,
    items: schedulePendingItems(remaining, effectiveAvailability(trail), startDate),
    excludedItems: [...(trail.excludedItems || []).filter((item) => item.id !== contentId), removed],
    replannedAt: Date.now(),
  };
}

export function restoreTrailItem(trail: LearningTrail, contentId: string, startDate = new Date()): LearningTrail {
  const restored = trail.excludedItems?.find((item) => item.id === contentId);
  if (!restored) return trail;
  const items = [...trail.items, { ...restored, status: 'pending' as const, completedAt: undefined }].sort((a, b) => a.order - b.order);
  return {
    ...trail,
    items: schedulePendingItems(items, effectiveAvailability(trail), startDate),
    excludedItems: trail.excludedItems?.filter((item) => item.id !== contentId),
    replannedAt: Date.now(),
  };
}

export function replanLearningTrail(trail: LearningTrail, startDate = new Date()): { trail: LearningTrail; changed: boolean } {
  const today = toLocalDateKey(startDate);
  const overdueIds = new Set(trail.items.filter((item) => item.status === 'pending' && item.scheduledDate < today).map((item) => item.id));
  const hasOverdue = overdueIds.size > 0;
  if (!hasOverdue) return { trail, changed: false };

  const replannedItems = schedulePendingItems(trail.items, effectiveAvailability(trail), startDate).map((item) => ({
    ...item,
    rescheduled: overdueIds.has(item.id) || item.rescheduled,
  }));

  return {
    changed: true,
    trail: {
      ...trail,
      items: replannedItems,
      replannedAt: Date.now(),
    },
  };
}
