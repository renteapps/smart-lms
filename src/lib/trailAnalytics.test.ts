import { describe, expect, it } from 'vitest';
import { summarizeTrailAnalytics, TrailAnalyticsData } from './trailAnalytics';
import { LearningTrail } from '@/types/trilha';

describe('trail effectiveness metrics', () => {
  it('summarizes completion, replans, feedback, funnel and removed content', () => {
    const trail: LearningTrail = {
      formatVersion: 3, userId: 'u1', generatedAt: 1, questionnaireVersion: 1, answers: {},
      availability: { weekdays: [1], minutesPerSession: 30 },
      items: [
        { id: 'a', type: 'lesson', title: 'A', durationMin: 20, order: 1, reason: 'x', score: 1, learningRole: 'essential', status: 'completed', scheduledDate: '2026-08-10', sessionId: 's1' },
        { id: 'b', type: 'lesson', title: 'B', durationMin: 20, order: 2, reason: 'x', score: 1, learningRole: 'essential', status: 'pending', scheduledDate: '2026-08-17', sessionId: 's2' },
      ],
      feedbackHistory: [{ sessionId: 's1', rating: 'right', submittedAt: '2026-08-10', plannedMinutes: 20, completedMinutes: 20, previousTargetMinutes: 30, nextTargetMinutes: 30 }],
    };
    const data: TrailAnalyticsData = { formatVersion: 1, events: [
      { id: '1', type: 'onboarding_started', occurredAt: '' },
      { id: '2', type: 'onboarding_step_viewed', occurredAt: '', payload: { step: 1, label: 'Objetivo' } },
      { id: '3', type: 'plan_generated', occurredAt: '' },
      { id: '4', type: 'trail_replanned', occurredAt: '' },
      { id: '5', type: 'content_removed', occurredAt: '', payload: { contentId: 'c', title: 'Conteúdo C' } },
    ] };
    const summary = summarizeTrailAnalytics(data, trail);
    expect(summary.completionRate).toBe(50);
    expect(summary.averageSupportedMinutes).toBe(20);
    expect(summary.replanRate).toBe(50);
    expect(summary.onboardingCompletionRate).toBe(100);
    expect(summary.ignoredContents[0].title).toBe('Conteúdo C');
  });
});
