import { EligibleLesson, Questionnaire } from '@/types/trilha';
import { createContentIndex, type ContentItem } from '@/lib/contentCatalog';

export const mockEligibleLessons: EligibleLesson[] = [
  { lessonId: 'l1', courseSlug: 'c1', moduleId: 'm1', title: 'Bem-vindo ao Curso!', duration: 300, topics: ['fundamentos'], problemasQueResolve: ['inseguranca'], nivel: 'iniciante' },
  { lessonId: 'l2', courseSlug: 'c1', moduleId: 'm1', title: 'O que é React?', duration: 720, topics: ['fundamentos'], problemasQueResolve: ['falta de base'], nivel: 'iniciante', prerequisitos: ['l1'] },
  { lessonId: 'l-profile-1', courseSlug: 'c1', moduleId: 'm1', title: 'Perfil de Estudo', duration: 600, topics: ['fundamentos'], problemasQueResolve: ['inseguranca'], nivel: 'iniciante', prerequisitos: ['l1'] },
  { lessonId: 'l3', courseSlug: 'c1', moduleId: 'm2', title: 'Criando seu primeiro componente', duration: 900, topics: ['pratica'], problemasQueResolve: ['procrastinacao'], nivel: 'intermediario', prerequisitos: ['l2', 'l-profile-1'] },
  { lessonId: 'l4', courseSlug: 'c1', moduleId: 'm2', title: 'Entendendo useState', duration: 1200, topics: ['aprofundamento'], problemasQueResolve: ['estagnacao'], nivel: 'avancado', prerequisitos: ['l3'] },
];

/** Itens de conteúdo correspondentes ao mockQuestionnaire para uso nos testes de matching. */
const TRAIL_CONTENT_ITEMS: ContentItem[] = [
  { id: 'm1', type: 'module', title: 'Módulo 1: Introdução ao React', childIds: ['l1', 'l2', 'l-profile-1'] },
  { id: 'm2', type: 'module', title: 'Módulo 2: Componentes e Hooks', childIds: ['l3', 'l4'] },
  { id: 'l1', type: 'lesson', title: 'Bem-vindo ao Curso!', estimatedDurationMin: 5, moduleId: 'm1' },
  { id: 'l-profile-1', type: 'lesson', title: 'Perfil de Estudo', estimatedDurationMin: 10, moduleId: 'm1', prerequisites: ['l1'] },
  { id: 'l2', type: 'lesson', title: 'O que é React?', estimatedDurationMin: 12, moduleId: 'm1', prerequisites: ['l1'] },
  { id: 'l3', type: 'lesson', title: 'Criando seu primeiro componente', estimatedDurationMin: 15, moduleId: 'm2', prerequisites: ['l2', 'l-profile-1'] },
  { id: 'l4', type: 'lesson', title: 'Entendendo useState', estimatedDurationMin: 20, moduleId: 'm2', prerequisites: ['l3'] },

  { id: 'a1', type: 'article', title: 'Como criar uma rotina de aprendizagem sustentável', slug: 'rotina-aprendizagem', estimatedDurationMin: 8 },
  { id: 'a2', type: 'article', title: 'Prática deliberada: como aprender fazendo', slug: 'pratica-deliberada', estimatedDurationMin: 10 },
  { id: 'ext1', type: 'external_link', title: 'Checklist para sua primeira semana', url: 'https://example.com/checklist', estimatedDurationMin: 5 },
];

/** ContentIndex pronto para uso nos testes de matching sem necessidade de banco. */
export const TRAIL_CONTENT_INDEX = createContentIndex(TRAIL_CONTENT_ITEMS, mockEligibleLessons);

export const mockQuestionnaire: Questionnaire = {
  version: 3,
  status: 'published',
  questions: [
    {
      id: 'q_formato', type: 'single', role: 'perfil', visualType: 'cards',
      text: 'Qual o seu formato preferido de consumo?',
      options: [
        { label: 'Prática Rápida (Mão na massa)', tags: ['pratica'], contentMappings: [
          { id: 'm2', type: 'module', title: 'Módulo 2: Componentes e Hooks', learningRole: 'deepening' },
          { id: 'a2', type: 'article', title: 'Prática deliberada: como aprender fazendo', learningRole: 'extra', estimatedDurationMin: 10 },
        ] },
        { label: 'Teoria Profunda (Conceitos base)', tags: ['fundamentos'], contentMappings: [
          { id: 'm1', type: 'module', title: 'Módulo 1: Introdução ao React', learningRole: 'essential' },
        ] },
      ],
    },
    {
      id: 'q_objetivo', type: 'single', role: 'perfil', visualType: 'list',
      text: 'O que você mais quer alcançar agora?',
      options: [
        { label: 'Sair do zero com segurança', tags: ['iniciacao', 'iniciante'], weight: 2, contentMappings: [
          { id: 'm1', type: 'module', title: 'Módulo 1: Introdução ao React', learningRole: 'essential' },
          { id: 'ext1', type: 'external_link', title: 'Checklist para sua primeira semana', url: 'https://example.com/checklist', learningRole: 'extra', estimatedDurationMin: 5 },
        ] },
        { label: 'Aprofundar o que já pratico', tags: ['aprofundamento', 'avancado'], weight: 2, contentMappings: [
          { id: 'm2', type: 'module', title: 'Módulo 2: Componentes e Hooks', learningRole: 'essential' },
        ] },
      ],
    },
    {
      id: 'q_problema', type: 'multiple', role: 'problema', visualType: 'physics',
      text: 'O que mais te trava hoje?',
      options: [
        { label: 'Procrastinação', tags: ['procrastinacao'], contentMappings: [{ id: 'a1', type: 'article', title: 'Como criar uma rotina de aprendizagem sustentável', learningRole: 'essential', estimatedDurationMin: 8 }] },
        { label: 'Insegurança', tags: ['inseguranca'], contentMappings: [{ id: 'l1', type: 'lesson', title: 'Bem-vindo ao Curso!', learningRole: 'essential' }] },
        { label: 'Falta de Tempo', tags: ['tempo'], contentMappings: [{ id: 'ext1', type: 'external_link', title: 'Checklist para sua primeira semana', url: 'https://example.com/checklist', learningRole: 'extra', estimatedDurationMin: 5 }] },
        { label: 'Estagnação', tags: ['estagnacao'], contentMappings: [{ id: 'l4', type: 'lesson', title: 'Entendendo useState', learningRole: 'deepening' }] },
      ],
    },
    {
      id: 'q_habilidades', type: 'multiple', role: 'interesse', visualType: 'physics',
      text: 'Que habilidades você quer desenvolver?',
      options: [
        { label: 'Fundamentos', tags: ['fundamentos'], contentMappings: [{ id: 'l2', type: 'lesson', title: 'O que é React?', learningRole: 'essential' }] },
        { label: 'Prática', tags: ['pratica'], contentMappings: [{ id: 'l3', type: 'lesson', title: 'Criando seu primeiro componente', learningRole: 'deepening' }] },
        { label: 'Autogestão', tags: ['autogestao'], contentMappings: [{ id: 'a1', type: 'article', title: 'Como criar uma rotina de aprendizagem sustentável', learningRole: 'extra', estimatedDurationMin: 8 }] },
      ],
    },
    {
      id: 'q_disponibilidade', type: 'availability', role: 'disponibilidade', visualType: 'list', options: [],
      text: 'Quando você quer reservar tempo para estudar?',
      availabilityConfig: { minutePresets: [15, 30, 45, 60, 90], minMinutes: 10, maxMinutes: 240, allowPerDayMinutes: true },
    },
  ],
};


