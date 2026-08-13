import { LearningTrail, LearningTrailItem, Weekday } from '@/types/trilha';
import { toLocalDateKey } from '@/lib/matching';
import { mockQuestionnaire } from '@/lib/mocks/trilhaMocks';

/**
 * Conteúdo de exemplo de /minha-trilha, usado quando o dispositivo ainda não
 * tem trilha salva.
 *
 * Tudo é ancorado na data de abertura: as sessões passadas ficam concluídas, a
 * sessão de hoje sempre tem pendências (senão o destaque da tela apareceria
 * vazio) e duas sessões seguem à frente. Os dias de estudo são derivados dos
 * mesmos offsets das sessões, então a agenda nunca contradiz a rotina exibida
 * no painel “Ajustar rotina”.
 */

const DEMO_USER_ID = 'demo-user';
const MODULE_1 = 'Módulo 1: Introdução ao React';
const MODULE_2 = 'Módulo 2: Componentes e Hooks';

type DemoItem = Omit<LearningTrailItem, 'order' | 'scheduledDate' | 'sessionId' | 'completedAt'> & {
  /** Distância em dias até a sessão que recebe o conteúdo. */
  dayOffset: number;
};

const demoItems: DemoItem[] = [
  {
    dayOffset: -7,
    id: 'l1',
    type: 'lesson',
    title: 'Bem-vindo ao Curso!',
    durationMin: 5,
    courseId: 'c1',
    moduleId: 'm1',
    moduleName: MODULE_1,
    learningRole: 'essential',
    status: 'completed',
    score: 4,
    reason: 'Recomendado por: Sair do zero com segurança',
  },
  {
    dayOffset: -7,
    id: 'a1',
    type: 'article',
    title: 'Como criar uma rotina de aprendizagem sustentável',
    slug: 'rotina-aprendizagem',
    durationMin: 8,
    learningRole: 'essential',
    status: 'completed',
    score: 3,
    reason: 'Recomendado por: Procrastinação',
  },
  {
    dayOffset: -5,
    id: 'l2',
    type: 'lesson',
    title: 'O que é React?',
    durationMin: 12,
    courseId: 'c1',
    moduleId: 'm1',
    moduleName: MODULE_1,
    learningRole: 'essential',
    status: 'completed',
    score: 4,
    reason: 'Conecta Fundamentos e Sair do zero com segurança',
  },
  {
    dayOffset: -5,
    id: 'ext1',
    type: 'external_link',
    title: 'Checklist para sua primeira semana',
    url: 'https://example.com/checklist',
    durationMin: 5,
    learningRole: 'extra',
    status: 'completed',
    score: 1,
    reason: 'Recomendado por: Falta de Tempo',
  },
  {
    dayOffset: 0,
    id: 'l-profile-1',
    type: 'lesson',
    title: 'Diagnóstico: Descubra seu Perfil de Liderança',
    durationMin: 10,
    courseId: 'c1',
    moduleId: 'm1',
    moduleName: MODULE_1,
    learningRole: 'essential',
    status: 'pending',
    score: 4,
    reason: 'Recomendado por: Sair do zero com segurança',
  },
  {
    dayOffset: 0,
    id: 'l3',
    type: 'lesson',
    title: 'Criando seu primeiro componente',
    durationMin: 15,
    courseId: 'c1',
    moduleId: 'm2',
    moduleName: MODULE_2,
    learningRole: 'deepening',
    status: 'pending',
    score: 3,
    reason: 'Recomendado por: Prática',
  },
  {
    dayOffset: 2,
    id: 'a2',
    type: 'article',
    title: 'Prática deliberada: como aprender fazendo',
    slug: 'pratica-deliberada',
    durationMin: 10,
    learningRole: 'extra',
    status: 'pending',
    score: 2,
    reason: 'Conecta Prática e Autogestão',
  },
  {
    dayOffset: 2,
    id: 'a3',
    type: 'article',
    title: 'O que trava sua promoção quase nunca é técnica',
    slug: 'primeiro-artigo',
    durationMin: 6,
    learningRole: 'extra',
    status: 'pending',
    score: 1,
    reason: 'Recomendado por: Estagnação',
  },
  {
    dayOffset: 4,
    id: 'l4',
    type: 'lesson',
    title: 'Entendendo useState',
    durationMin: 20,
    courseId: 'c1',
    moduleId: 'm2',
    moduleName: MODULE_2,
    learningRole: 'deepening',
    status: 'pending',
    score: 3,
    reason: 'Recomendado por: Estagnação',
    // Mostra como um conteúdo que ficou para trás reaparece já replanejado.
    rescheduled: true,
  },
];

const demoExcludedItems: DemoItem[] = [
  {
    dayOffset: 2,
    id: 'ext2',
    type: 'external_link',
    title: 'Workshop gravado: hábitos de estudo',
    url: 'https://example.com/workshop',
    durationMin: 35,
    learningRole: 'extra',
    status: 'pending',
    score: 1,
    reason: 'Recomendado por: Autogestão',
  },
  {
    dayOffset: 4,
    id: 'ext3',
    type: 'external_link',
    title: 'Planilha de acompanhamento semanal',
    url: 'https://example.com/planilha',
    durationMin: 15,
    learningRole: 'extra',
    status: 'pending',
    score: 1,
    reason: 'Recomendado por: Falta de Tempo',
  },
];

function shiftDays(from: Date, days: number): Date {
  const date = new Date(from);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function scheduleDemoItem(item: DemoItem, index: number, from: Date): LearningTrailItem {
  const { dayOffset, ...content } = item;
  const date = shiftDays(from, dayOffset);
  const scheduledDate = toLocalDateKey(date);
  const completedAt = content.status === 'completed'
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 19, 30).toISOString()
    : undefined;

  return { ...content, order: index + 1, scheduledDate, sessionId: `${scheduledDate}-1`, completedAt };
}

export function createDemoLearningTrail(from = new Date()): LearningTrail {
  const items = demoItems.map((item, index) => scheduleDemoItem(item, index, from));
  const excludedItems = demoExcludedItems.map((item, index) => scheduleDemoItem(item, demoItems.length + index, from));
  const weekdays = [...new Set(demoItems.map((item) => shiftDays(from, item.dayOffset).getDay() as Weekday))].sort();
  const lastCompletedSession = items.filter((item) => item.status === 'completed').at(-1);

  return {
    formatVersion: 3,
    userId: DEMO_USER_ID,
    items,
    excludedItems,
    generatedAt: shiftDays(from, -7).getTime(),
    questionnaireVersion: mockQuestionnaire.version,
    // A primeira resposta vira o “Foco principal” no painel de métricas.
    answers: {
      q_objetivo: ['Sair do zero com segurança'],
      q_formato: ['Teoria Profunda (Conceitos base)'],
      q_problema: ['Procrastinação', 'Falta de Tempo'],
      q_habilidades: ['Fundamentos', 'Prática'],
    },
    availability: { weekdays, minutesPerSession: 45 },
    adaptiveMinutesPerSession: 45,
    feedbackHistory: lastCompletedSession
      ? [{
        sessionId: lastCompletedSession.sessionId,
        rating: 'right',
        submittedAt: lastCompletedSession.completedAt || new Date(from).toISOString(),
        plannedMinutes: 17,
        completedMinutes: 17,
        previousTargetMinutes: 45,
        nextTargetMinutes: 45,
      }]
      : [],
  };
}
