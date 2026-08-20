import { LearningTrail, LearningTrailItem, SessionLoadRating } from '@/types/trilha';

export type TrailAnalyticsEventType =
  | 'onboarding_started'
  | 'onboarding_step_viewed'
  | 'plan_generated'
  | 'trail_replanned'
  | 'trail_expanded'
  | 'routine_adjusted'
  | 'routine_eased'
  | 'session_postponed'
  | 'session_feedback'
  | 'content_removed'
  | 'content_restored'
  | 'content_completed';

export type TrailAnalyticsEvent = {
  id: string;
  type: TrailAnalyticsEventType;
  occurredAt: string;
  payload?: Record<string, string | number | boolean>;
};

export type TrailAnalyticsData = {
  formatVersion: 1;
  events: TrailAnalyticsEvent[];
};

export type TrailAnalyticsSummary = {
  plannedSessions: number;
  completedSessions: number;
  completionRate: number;
  averageSupportedMinutes: number;
  replanRate: number;
  replanCount: number;
  onboardingStarts: number;
  onboardingCompletions: number;
  onboardingCompletionRate: number;
  stepViews: Array<{ step: number; label: string; views: number; dropRate: number }>;
  ignoredContents: Array<{ id: string; title: string; count: number }>;
  feedbackCounts: Record<SessionLoadRating, number>;
};

export function emptyTrailAnalytics(): TrailAnalyticsData {
  return { formatVersion: 1, events: [] };
}

export function summarizeTrailAnalytics(data: TrailAnalyticsData, trailOrTrails: LearningTrail | LearningTrail[] | null): TrailAnalyticsSummary {
  const trails = Array.isArray(trailOrTrails) ? trailOrTrails : trailOrTrails ? [trailOrTrails] : [];
  
  const sessions = new Map<string, LearningTrailItem[]>();
  let completedSessionsCount = 0;
  
  trails.forEach(trail => {
    const trailSessions = new Map<string, LearningTrailItem[]>();
    trail.items.forEach((item) => {
      const key = `${trail.userId || Math.random()}-${item.sessionId}`;
      trailSessions.set(key, [...(trailSessions.get(key) || []), item]);
    });
    
    trailSessions.forEach((items, key) => {
      sessions.set(key, items);
      if (items.length > 0 && items.every((item) => item.status === 'completed')) {
        completedSessionsCount++;
      }
    });
  });

  const plannedSessions = sessions.size;
  const completedSessions = completedSessionsCount;
  
  const feedback = trails.flatMap(t => t.feedbackHistory || []);
  const supported = feedback.filter((item) => item.rating !== 'heavy' && item.completedMinutes > 0);
  const replanTypes = new Set<TrailAnalyticsEventType>(['trail_replanned', 'routine_adjusted', 'session_postponed']);
  const replans = data.events.filter((event) => replanTypes.has(event.type)).length;
  const starts = data.events.filter((event) => event.type === 'onboarding_started').length;
  const completions = data.events.filter((event) => event.type === 'plan_generated').length;

  const stepMap = new Map<number, { label: string; views: number }>();
  data.events.filter((event) => event.type === 'onboarding_step_viewed').forEach((event) => {
    const step = Number(event.payload?.step || 0);
    const current = stepMap.get(step) || { label: String(event.payload?.label || `Etapa ${step}`), views: 0 };
    current.views += 1;
    stepMap.set(step, current);
  });
  const sortedSteps = [...stepMap.entries()].sort(([a], [b]) => a - b);
  const stepViews = sortedSteps.map(([step, value], index) => {
    const nextViews = sortedSteps[index + 1]?.[1].views ?? completions;
    return { step, label: value.label, views: value.views, dropRate: value.views ? Math.max(0, Math.round(((value.views - nextViews) / value.views) * 100)) : 0 };
  });

  const ignoredMap = new Map<string, { id: string; title: string; count: number }>();
  data.events.filter((event) => event.type === 'content_removed').forEach((event) => {
    const id = String(event.payload?.contentId || 'unknown');
    const current = ignoredMap.get(id) || { id, title: String(event.payload?.title || 'Conteúdo'), count: 0 };
    current.count += 1;
    ignoredMap.set(id, current);
  });

  const feedbackCounts: Record<SessionLoadRating, number> = { light: 0, right: 0, heavy: 0 };
  feedback.forEach((item) => { feedbackCounts[item.rating] += 1; });

  return {
    plannedSessions,
    completedSessions,
    completionRate: plannedSessions ? Math.round((completedSessions / plannedSessions) * 100) : 0,
    averageSupportedMinutes: supported.length ? Math.round(supported.reduce((sum, item) => sum + item.completedMinutes, 0) / supported.length) : 0,
    replanRate: plannedSessions ? Math.min(100, Math.round((replans / plannedSessions) * 100)) : 0,
    replanCount: replans,
    onboardingStarts: starts,
    onboardingCompletions: completions,
    onboardingCompletionRate: starts ? Math.min(100, Math.round((completions / starts) * 100)) : 0,
    stepViews,
    ignoredContents: [...ignoredMap.values()].sort((a, b) => b.count - a.count),
    feedbackCounts,
  };
}

export const TRAIL_ANALYTICS_STORAGE_KEY = 'smartlms_trail_analytics';

export function readTrailAnalytics(): TrailAnalyticsData {
  if (typeof window === 'undefined') return emptyTrailAnalytics();
  try {
    const raw = window.localStorage.getItem(TRAIL_ANALYTICS_STORAGE_KEY);
    if (!raw) return emptyTrailAnalytics();
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.events) ? parsed : emptyTrailAnalytics();
  } catch {
    return emptyTrailAnalytics();
  }
}

export function recordTrailEvent(
  type: TrailAnalyticsEventType,
  payload?: Record<string, string | number | boolean>,
): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readTrailAnalytics();
    const event: TrailAnalyticsEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      occurredAt: new Date().toISOString(),
      payload,
    };
    current.events.push(event);
    window.localStorage.setItem(TRAIL_ANALYTICS_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Erro ao registrar evento de analytics da trilha:', err);
  }
}
