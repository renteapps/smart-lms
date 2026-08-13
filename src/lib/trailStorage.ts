import { LearningTrail, LearningTrailItem, Questionnaire } from '@/types/trilha';
import { DEFAULT_AVAILABILITY, schedulePendingItems, toLocalDateKey } from '@/lib/matching';
import { mockEligibleLessons, mockQuestionnaire } from '@/lib/mocks/trilhaMocks';
import { recordTrailEvent } from '@/lib/trailAnalytics';

export const QUESTIONNAIRE_STORAGE_KEY = '@smartlms:questionnaire:v3';
export const TRAIL_STORAGE_KEY = 'minha_trilha';

export type StorageReadResult<T> = {
  data: T | null;
  error?: 'invalid' | 'unsupported';
  migrated?: boolean;
};

export function loadQuestionnaire(): Questionnaire {
  if (typeof window === 'undefined') return mockQuestionnaire;
  const raw = window.localStorage.getItem(QUESTIONNAIRE_STORAGE_KEY);
  if (!raw) return mockQuestionnaire;
  try {
    const parsed = JSON.parse(raw) as Questionnaire;
    return parsed.questions?.length ? parsed : mockQuestionnaire;
  } catch {
    return mockQuestionnaire;
  }
}

export function saveQuestionnaire(questionnaire: Questionnaire): void {
  window.localStorage.setItem(QUESTIONNAIRE_STORAGE_KEY, JSON.stringify(questionnaire));
}

function migrateLegacyTrail(parsed: { userId?: string; items?: Array<{ lessonId?: string; order?: number; reason?: string; locked?: boolean }> }): LearningTrail | null {
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
  const draft: LearningTrailItem[] = parsed.items.flatMap((legacy, index) => {
    const lesson = mockEligibleLessons.find((item) => item.lessonId === legacy.lessonId);
    if (!lesson) return [];
    return [{
      id: lesson.lessonId,
      type: 'lesson' as const,
      title: lesson.title,
      durationMin: Math.round(lesson.duration / 60),
      courseId: lesson.courseSlug,
      moduleId: lesson.moduleId,
      order: legacy.order || index + 1,
      reason: legacy.reason || 'Importado da sua trilha anterior',
      score: 1,
      learningRole: 'essential' as const,
      status: 'pending' as const,
      scheduledDate: '',
      sessionId: '',
    }];
  });
  if (draft.length === 0) return null;
  return {
    formatVersion: 3,
    userId: parsed.userId || 'user-1',
    items: schedulePendingItems(draft, DEFAULT_AVAILABILITY),
    generatedAt: Date.now(),
    questionnaireVersion: mockQuestionnaire.version,
    answers: {},
    availability: DEFAULT_AVAILABILITY,
  };
}

export function readLearningTrail(): StorageReadResult<LearningTrail> {
  if (typeof window === 'undefined') return { data: null };
  const raw = window.localStorage.getItem(TRAIL_STORAGE_KEY);
  if (!raw) return { data: null };
  try {
    const parsed = JSON.parse(raw) as LearningTrail & { items?: unknown[] };
    if (parsed.formatVersion === 3 && Array.isArray(parsed.items) && parsed.availability) return { data: parsed };
    const migrated = migrateLegacyTrail(parsed);
    return migrated ? { data: migrated, migrated: true } : { data: null, error: 'unsupported' };
  } catch {
    return { data: null, error: 'invalid' };
  }
}

export function saveLearningTrail(trail: LearningTrail): void {
  window.localStorage.setItem(TRAIL_STORAGE_KEY, JSON.stringify(trail));
}

export function setTrailItemCompletion(contentId: string, completed: boolean): LearningTrail | null {
  const result = readLearningTrail();
  if (!result.data) return null;
  const previous = result.data.items.find((item) => item.id === contentId);
  const now = new Date();
  const trail: LearningTrail = {
    ...result.data,
    items: result.data.items.map((item) => item.id === contentId ? {
      ...item,
      status: completed ? 'completed' : 'pending',
      completedAt: completed ? now.toISOString() : undefined,
      scheduledDate: completed ? item.scheduledDate || toLocalDateKey(now) : item.scheduledDate,
    } : item),
  };
  saveLearningTrail(trail);
  if (completed && previous?.status !== 'completed') {
    recordTrailEvent('content_completed', { contentId, title: previous?.title || contentId, durationMin: previous?.durationMin || 0 });
  }
  return trail;
}
