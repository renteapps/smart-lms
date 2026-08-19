export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type StudyAvailability = {
  weekdays: Weekday[];
  minutesPerSession: number;
};

export type EligibleLesson = {
  lessonId: string;
  courseSlug: string;
  moduleId: string;
  title: string;
  description: string;
  duration: number;
  topics: string[];
  problemasQueResolve: string[];
  nivel: 'iniciante' | 'intermediario' | 'avancado';
  objetivo?: string;
  publico?: string;
  prerequisitos?: string[];
};

export type ContentType = 'lesson' | 'module' | 'course' | 'article' | 'external_link';
export type SchedulableContentType = 'lesson' | 'article' | 'external_link';
export type LearningRole = 'essential' | 'deepening' | 'extra';
export type SessionLoadRating = 'light' | 'right' | 'heavy';

export type ContentMapping = {
  id: string;
  type: ContentType;
  title: string;
  slug?: string;
  url?: string;
  learningRole: LearningRole;
  estimatedDurationMin?: number;
};

export type QuestionOption = {
  label: string;
  tags?: string[];
  weight?: number;
  contentMappings?: ContentMapping[];
};

export type AvailabilityQuestionConfig = {
  minutePresets: number[];
  minMinutes: number;
  maxMinutes: number;
};

export type Question = {
  id: string;
  type: 'single' | 'multiple' | 'availability';
  text: string;
  role: 'perfil' | 'problema' | 'interesse' | 'nivel' | 'restricao' | 'disponibilidade';
  visualType?: 'list' | 'physics' | 'cards';
  options: QuestionOption[];
  availabilityConfig?: AvailabilityQuestionConfig;
};

export type Questionnaire = {
  version: number;
  status: 'draft' | 'published' | 'archived';
  questions: Question[];
};

/** Uma linha de `trail_questionnaires` com os metadados de auditoria — usada no histórico do admin. */
export type QuestionnaireVersion = Questionnaire & {
  id: string;
  notes?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  createdBy?: string | null;
};

export type ResolvedContent = {
  id: string;
  type: SchedulableContentType;
  title: string;
  durationMin: number;
  courseId?: string;
  moduleId?: string;
  moduleName?: string;
  slug?: string;
  url?: string;
  cover?: string;
  prerequisites?: string[];
};

export type LearningTrailItem = ResolvedContent & {
  order: number;
  reason: string;
  score: number;
  learningRole: LearningRole;
  status: 'pending' | 'completed';
  scheduledDate: string;
  sessionId: string;
  overBudget?: boolean;
  rescheduled?: boolean;
  completedAt?: string;
  warnings?: string[];
};

export type SessionFeedback = {
  sessionId: string;
  rating: SessionLoadRating;
  submittedAt: string;
  plannedMinutes: number;
  completedMinutes: number;
  previousTargetMinutes: number;
  nextTargetMinutes: number;
};

export type LearningTrail = {
  formatVersion: 3;
  userId: string;
  items: LearningTrailItem[];
  generatedAt: number;
  replannedAt?: number;
  questionnaireVersion: number;
  answers: Record<string, string[]>;
  availability: StudyAvailability;
  adaptiveMinutesPerSession?: number;
  feedbackHistory?: SessionFeedback[];
  excludedItems?: LearningTrailItem[];
};
