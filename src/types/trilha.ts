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

export type QuestionOption = {
  label: string;
  tags?: string[]; // Mapeamento para topics, problemas ou nivel
  timeBudgetMin?: number; // Específico para perguntas de tempo
  weight?: number;
  subOptions?: QuestionOption[];
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
