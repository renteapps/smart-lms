import {
  ContentMapping,
  LearningRole,
  LearningTrail,
  LearningTrailItem,
  Questionnaire,
  ResolvedContent,
  StudyAvailability,
  Weekday,
} from '@/types/trilha';
import { MOCK_CONTENT_ITEMS, resolveContentMapping } from '@/lib/mocks/onboardingMocks';

type UserAnswers = Record<string, string[]>;
type ContentResolver = (mapping: ContentMapping) => ResolvedContent[];
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

function mappingForContentId(id: string): ContentMapping | null {
  const source = MOCK_CONTENT_ITEMS.find((item) => item.id === id);
  if (!source) return null;
  return {
    id: source.id,
    type: source.type,
    title: source.title,
    slug: source.slug,
    url: source.url,
    estimatedDurationMin: source.estimatedDurationMin,
    learningRole: 'essential',
  };
}

export function validateQuestionnaire(questionnaire: Questionnaire): string[] {
  const errors: string[] = [];
  const availabilityQuestions = questionnaire.questions.filter((question) => question.type === 'availability');

  if (availabilityQuestions.length !== 1) errors.push('Mantenha exatamente uma pergunta de disponibilidade.');
  if (questionnaire.questions.at(-1)?.type !== 'availability') errors.push('A disponibilidade precisa ser a última pergunta.');

  questionnaire.questions.forEach((question) => {
    if (question.type === 'availability') return;
    if (question.options.length === 0) errors.push(`A pergunta “${question.text}” precisa ter ao menos uma opção.`);
    question.options.forEach((option) => {
      option.contentMappings?.forEach((mapping) => {
        const resolved = resolveContentMapping(mapping);
        if (resolved.length === 0) errors.push(`“${mapping.title}” não pôde ser encontrado ou expandido.`);
        if ((mapping.type === 'article' || mapping.type === 'external_link') && !mapping.estimatedDurationMin) {
          errors.push(`Informe a duração estimada de “${mapping.title}”.`);
        }
      });
    });
  });

  return [...new Set(errors)];
}

function collectCandidates(answers: UserAnswers, questionnaire: Questionnaire, resolver: ContentResolver): Candidate[] {
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

  const ensurePrerequisite = (id: string, inheritedScore: number, path: string[]): void => {
    if (path.includes(id)) {
      const cyclic = candidates.get(path.at(-1) || id);
      cyclic?.warnings.push(`Ciclo de pré-requisitos detectado: ${[...path, id].join(' → ')}`);
      return;
    }

    let candidate = candidates.get(id);
    if (!candidate) {
      const mapping = mappingForContentId(id);
      const content = mapping ? resolveContentMapping(mapping)[0] : undefined;
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
  resolver: ContentResolver = resolveContentMapping,
): LearningTrail {
  const existingCompleted = new Map(
    (existingTrail?.items || []).filter((item) => item.status === 'completed').map((item) => [item.id, item]),
  );

  const candidates = collectCandidates(answers, questionnaire, resolver);
  const draftItems: LearningTrailItem[] = candidates.map((candidate, index) => {
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

  const items = schedulePendingItems(draftItems, availability, startDate);
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
  };
}

export function replanLearningTrail(trail: LearningTrail, startDate = new Date()): { trail: LearningTrail; changed: boolean } {
  const today = toLocalDateKey(startDate);
  const overdueIds = new Set(trail.items.filter((item) => item.status === 'pending' && item.scheduledDate < today).map((item) => item.id));
  const hasOverdue = overdueIds.size > 0;
  if (!hasOverdue) return { trail, changed: false };

  const replannedItems = schedulePendingItems(trail.items, trail.availability, startDate).map((item) => ({
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
