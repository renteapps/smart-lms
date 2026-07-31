import { EligibleLesson, Questionnaire } from '@/types/trilha';

export const mockEligibleLessons: EligibleLesson[] = [
  {
    lessonId: 'lesson-1',
    courseSlug: 'curso-base',
    moduleId: 'mod-1',
    title: 'Fundamentos da Prática',
    description: 'Introdução aos conceitos principais e como se preparar.',
    duration: 1200, // 20 min
    topics: ['fundamentos', 'iniciacao'],
    problemasQueResolve: ['falta de base', 'inseguranca'],
    nivel: 'iniciante',
    objetivo: 'Começar com segurança',
    publico: 'Novos alunos'
  },
  {
    lessonId: 'lesson-2',
    courseSlug: 'curso-base',
    moduleId: 'mod-1',
    title: 'Primeiros Passos',
    description: 'Aplicações práticas para quem está começando.',
    duration: 1800, // 30 min
    topics: ['pratica', 'iniciacao'],
    problemasQueResolve: ['procrastinacao'],
    nivel: 'iniciante',
    prerequisitos: ['lesson-1']
  },
  {
    lessonId: 'lesson-3',
    courseSlug: 'curso-avancado',
    moduleId: 'mod-2',
    title: 'Aprofundamento Técnico',
    description: 'Técnicas avançadas para extrair mais resultados.',
    duration: 2400, // 40 min
    topics: ['tecnica', 'aprofundamento'],
    problemasQueResolve: ['estagnacao'],
    nivel: 'avancado',
    objetivo: 'Escalar resultados'
  }
];

export const mockQuestionnaire: Questionnaire = {
  version: 2,
  status: 'published',
  questions: [
    {
      id: 'q_formato',
      type: 'single',
      text: 'Qual o seu formato preferido de consumo?',
      role: 'perfil',
      visualType: 'cards',
      options: [
        { label: 'Prática Rápida (Mão na massa)', tags: ['pratica'] },
        { label: 'Teoria Profunda (Conceitos base)', tags: ['fundamentos'] }
      ]
    },
    {
      id: 'q_objetivo',
      type: 'single',
      text: 'O que você mais quer alcançar agora?',
      role: 'perfil',
      visualType: 'list',
      options: [
        { label: 'Sair do zero com segurança', tags: ['iniciacao', 'iniciante'], weight: 2 },
        { label: 'Aprofundar o que já pratico', tags: ['aprofundamento', 'avancado'], weight: 2 }
      ]
    },
    {
      id: 'q_problema',
      type: 'multiple',
      text: 'O que mais te trava hoje?',
      role: 'problema',
      visualType: 'physics',
      options: [
        { label: 'Procrastinação', tags: ['procrastinacao'] },
        { label: 'Insegurança', tags: ['inseguranca'] },
        { label: 'Comunicação', tags: ['comunicacao'] },
        { label: 'Liderança', tags: ['lideranca'] },
        { label: 'Falta de Tempo', tags: ['tempo'] },
        { label: 'Estagnação', tags: ['estagnacao'] },
        { label: 'Inteligência Emocional', tags: ['emocional'] }
      ]
    },
    {
      id: 'q_habilidades',
      type: 'multiple',
      text: 'Que habilidades você quer desenvolver?',
      role: 'interesse',
      visualType: 'physics',
      options: [
        { label: 'Liderança', tags: ['lideranca'] },
        { label: 'Produtividade', tags: ['produtividade'] },
        { label: 'Comunicação', tags: ['comunicacao'] },
        { label: 'Criatividade', tags: ['criatividade'] },
        { label: 'Autogestão', tags: ['autogestao'] },
        { label: 'Colaboração', tags: ['colaboracao'] }
      ]
    },
    {
      id: 'q_tempo',
      type: 'single',
      text: 'Quanto tempo por semana você consegue estudar?',
      role: 'restricao',
      visualType: 'list',
      options: [
        { label: 'Até 1 hora', timeBudgetMin: 60 },
        { label: 'Até 3 horas', timeBudgetMin: 180 },
        { label: 'Mais de 3 horas', timeBudgetMin: 600 }
      ]
    }
  ]
};
