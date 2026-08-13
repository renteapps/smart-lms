import { Questionnaire } from '@/types/trilha';
import { DEFAULT_AVAILABILITY, generateLearningTrail } from '@/lib/matching';
import { MOCK_CONTENT_ITEMS, resolveContentMapping } from '@/lib/mocks/onboardingMocks';

export type AdminTrailDiagnostic = {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
};

export function analyzeQuestionnaire(questionnaire: Questionnaire): AdminTrailDiagnostic[] {
  const diagnostics: AdminTrailDiagnostic[] = [];
  const knownContentIds = new Set(MOCK_CONTENT_ITEMS.map((item) => item.id));
  const allResolved = new Map<string, ReturnType<typeof resolveContentMapping>[number]>();

  questionnaire.questions.filter((question) => question.type !== 'availability').forEach((question) => {
    question.options.forEach((option, optionIndex) => {
      if (!option.contentMappings?.length) diagnostics.push({
        id: `empty-${question.id}-${optionIndex}`,
        severity: 'warning',
        title: 'Resposta sem conteúdo associado',
        detail: `“${option.label}”, em “${question.text}”, não influencia a trilha final.`,
      });
      option.contentMappings?.forEach((mapping) => resolveContentMapping(mapping).forEach((item) => allResolved.set(item.id, item)));
    });

    if (question.type === 'single') {
      const owners = new Map<string, string[]>();
      question.options.forEach((option) => option.contentMappings?.forEach((mapping) => {
        resolveContentMapping(mapping).forEach((item) => owners.set(item.id, [...(owners.get(item.id) || []), option.label]));
      }));
      owners.forEach((labels, contentId) => {
        if (new Set(labels).size > 1) diagnostics.push({
          id: `conflict-${question.id}-${contentId}`,
          severity: 'info',
          title: 'Conteúdo em respostas exclusivas',
          detail: `O mesmo conteúdo aparece em “${[...new Set(labels)].join('” e “')}”. Confirme se essa recomendação deve ser comum às duas escolhas.`,
        });
      });
    }
  });

  allResolved.forEach((content) => content.prerequisites?.forEach((id) => {
    if (!knownContentIds.has(id)) diagnostics.push({
      id: `missing-${content.id}-${id}`,
      severity: 'error',
      title: 'Pré-requisito ausente',
      detail: `“${content.title}” depende de ${id}, que não está disponível no catálogo.`,
    });
  }));

  const totalMinutes = [...allResolved.values()].reduce((sum, item) => sum + item.durationMin, 0);
  const estimatedWeeks = totalMinutes / (DEFAULT_AVAILABILITY.weekdays.length * DEFAULT_AVAILABILITY.minutesPerSession);
  if (estimatedWeeks > 8) diagnostics.push({
    id: 'long-trail', severity: 'warning', title: 'Trilha potencialmente longa',
    detail: `A curadoria contém cerca de ${Math.ceil(estimatedWeeks)} semanas de conteúdo no ritmo padrão. Considere mover parte para “Extra”.`,
  });

  const defaultAnswers = Object.fromEntries(questionnaire.questions
    .filter((question) => question.type !== 'availability')
    .map((question) => [question.id, question.options[0] ? [question.options[0].label] : []]));
  const preview = generateLearningTrail('diagnostic', defaultAnswers, questionnaire, DEFAULT_AVAILABILITY);
  const sessionLoads = Object.values(preview.items.reduce<Record<string, number>>((groups, item) => {
    groups[item.sessionId] = (groups[item.sessionId] || 0) + item.durationMin;
    return groups;
  }, {}));
  if (sessionLoads.some((minutes) => minutes > DEFAULT_AVAILABILITY.minutesPerSession)) diagnostics.push({
    id: 'overloaded-session', severity: 'warning', title: 'Sessão acima da meta',
    detail: 'Ao menos um conteúdo é maior que a sessão padrão de 30 minutos e ficará sozinho no calendário.',
  });
  if (sessionLoads.length > 1 && Math.max(...sessionLoads) - Math.min(...sessionLoads) > 20) diagnostics.push({
    id: 'unbalanced-week', severity: 'info', title: 'Carga semanal desbalanceada',
    detail: 'A simulação encontrou uma diferença superior a 20 minutos entre sessões. Revise durações ou a ordem pedagógica.',
  });

  return diagnostics;
}
