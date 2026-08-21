import { updateTrailAvailability, DEFAULT_AVAILABILITY } from './src/lib/matching.ts';
import { LearningTrail } from './src/types/trilha.ts';

const trail: LearningTrail = {
  formatVersion: 3,
  userId: '123',
  generatedAt: Date.now(),
  questionnaireVersion: 1,
  answers: {},
  availability: DEFAULT_AVAILABILITY,
  items: [
    {
      id: '1',
      type: 'lesson',
      title: 'Aula 1',
      durationMin: 30,
      order: 1,
      score: 1,
      learningRole: 'essential',
      status: 'completed',
      scheduledDate: '2023-01-01',
      sessionId: 's1',
    },
    {
      id: '2',
      type: 'lesson',
      title: 'Aula 2',
      durationMin: 30,
      order: 2,
      score: 1,
      learningRole: 'essential',
      status: 'pending',
      scheduledDate: '2023-01-02',
      sessionId: 's2',
    }
  ]
};

const updated = updateTrailAvailability(trail, {
  weekdays: [2, 4], // Ter, Qui
  minutesPerSession: 60,
  mode: 'uniform'
}, new Date('2023-01-02T12:00:00Z'));

console.log(updated.items);
