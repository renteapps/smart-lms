export type EligibleLesson = {
  lessonId: string;
  courseSlug: string;
  moduleId: string;
  title: string;
  description: string;
  duration: number; // em segundos
  topics: string[];
  problemasQueResolve: string[];
  nivel: 'iniciante' | 'intermediario' | 'avancado';
  objetivo?: string;
  publico?: string;
  prerequisitos?: string[]; // array de lessonIds
};

export type ContentType = 'lesson' | 'module' | 'course' | 'article' | 'external_link';

export type ContentMapping = {
  id: string;                   // UUID do conteúdo
  type: ContentType;            // tipo do conteúdo
  title: string;                // título p/ display no admin
  slug?: string;                // slug (para artigos e cursos)
  url?: string;                 // URL (para links externos)
  unlockAfterDays: number;      // dias após conclusão do onboarding para liberar (0 = imediato)
};

export type QuestionOption = {
  label: string;
  tags?: string[]; // Mapeamento para topics, problemas ou nivel
  timeBudgetMin?: number; // Específico para perguntas de tempo
  weight?: number;
  subOptions?: QuestionOption[];
  contentMappings?: ContentMapping[]; // Associações diretas a conteúdos
};

export type Question = {
  id: string;
  type: 'single' | 'multiple';
  text: string;
  role: 'perfil' | 'problema' | 'interesse' | 'nivel' | 'restricao';
  visualType?: 'list' | 'physics' | 'cards'; // define the UI component used to render the question options
  options: QuestionOption[];
};

export type Questionnaire = {
  version: number;
  status: 'draft' | 'published';
  questions: Question[];
};

export type LearningTrailItem = {
  lessonId: string;
  order: number;
  reason: string;
  locked: boolean;
};

export type LearningTrail = {
  userId: string;
  items: LearningTrailItem[];
  generatedAt: number;
  questionnaireVersion: number;
};
