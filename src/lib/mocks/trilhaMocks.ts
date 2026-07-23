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
      text: 'O que mais te trava hoje? Toque para explorar',
      role: 'problema',
      visualType: 'physics',
      options: [
        {
          label: 'Procrastinação',
          tags: ['procrastinacao'],
          subOptions: [
            { label: 'Falta de energia', tags: ['energia'] },
            { label: 'Muito planejamento', tags: ['planejamento'] },
            { label: 'Distração fácil', tags: ['foco'] }
          ]
        },
        {
          label: 'Insegurança',
          tags: ['inseguranca'],
          subOptions: [
            { label: 'Medo de errar', tags: ['medo'] },
            { label: 'Síndrome do Impostor', tags: ['impostor'] },
            { label: 'Perfeccionismo', tags: ['perfeccionismo'] }
          ]
        },
        {
          label: 'Comunicação',
          tags: ['comunicacao'],
          subOptions: [
            { label: 'Falar em público', tags: ['apresentacao'] },
            { label: 'Dar feedback', tags: ['feedback'] },
            { label: 'Conflitos no time', tags: ['conflito'] }
          ]
        },
        {
          label: 'Liderança',
          tags: ['lideranca'],
          subOptions: [
            { label: 'Delegar tarefas', tags: ['delegacao'] },
            { label: 'Engajar o time', tags: ['engajamento'] }
          ]
        },
        {
          label: 'Falta de Tempo',
          tags: ['tempo'],
          subOptions: [
            { label: 'Múltiplas prioridades', tags: ['priorizacao'] },
            { label: 'Reuniões demais', tags: ['reunioes'] }
          ]
        },
        {
          label: 'Estagnação',
          tags: ['estagnacao'],
          subOptions: [
            { label: 'Sem clareza de carreira', tags: ['carreira'] },
            { label: 'Falta de desafios', tags: ['desafio'] }
          ]
        },
        {
          label: 'Inteligência Emocional',
          tags: ['emocional'],
          subOptions: [
            { label: 'Lidar com pressão', tags: ['pressao'] },
            { label: 'Autoconhecimento', tags: ['autoconhecimento'] }
          ]
        }
      ]
    },
    {
      id: 'q_habilidades',
      type: 'multiple',
      text: 'Que habilidades você quer desenvolver? Toque para ver mais',
      role: 'interesse',
      visualType: 'physics',
      options: [
        {
          label: 'Liderança',
          tags: ['lideranca'],
          subOptions: [
            { label: 'Influência', tags: ['influencia'] },
            { label: 'Tomada de decisão', tags: ['decisao'] },
            { label: 'Visão estratégica', tags: ['estrategia'] }
          ]
        },
        {
          label: 'Produtividade',
          tags: ['produtividade'],
          subOptions: [
            { label: 'Foco profundo', tags: ['foco'] },
            { label: 'Gestão de energia', tags: ['energia'] }
          ]
        },
        {
          label: 'Comunicação',
          tags: ['comunicacao'],
          subOptions: [
            { label: 'Storytelling', tags: ['storytelling'] },
            { label: 'Escuta ativa', tags: ['escuta'] },
            { label: 'Negociação', tags: ['negociacao'] }
          ]
        },
        {
          label: 'Criatividade',
          tags: ['criatividade'],
          subOptions: [
            { label: 'Pensamento lateral', tags: ['lateral'] },
            { label: 'Inovação', tags: ['inovacao'] }
          ]
        },
        {
          label: 'Autogestão',
          tags: ['autogestao'],
          subOptions: [
            { label: 'Disciplina', tags: ['disciplina'] },
            { label: 'Resiliência', tags: ['resiliencia'] }
          ]
        },
        {
          label: 'Colaboração',
          tags: ['colaboracao'],
          subOptions: [
            { label: 'Trabalho em equipe', tags: ['equipe'] },
            { label: 'Empatia', tags: ['empatia'] }
          ]
        }
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
