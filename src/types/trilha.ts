export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * `uniform`: o mesmo tempo em todos os dias escolhidos.
 * `per_day`: cada dia da semana tem sua própria meta de minutos.
 */
export type AvailabilityMode = 'uniform' | 'per_day';

export type StudyAvailability = {
  weekdays: Weekday[];
  /** Meta uniforme e, no modo por dia, o valor padrão de um dia sem minutos próprios. */
  minutesPerSession: number;
  mode?: AvailabilityMode;
  /** Só no modo `per_day`: minutos declarados para cada dia escolhido. */
  minutesByWeekday?: Partial<Record<Weekday, number>>;
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
  /**
   * Capa do conteúdo. Em link externo é a imagem que o próprio site publica em
   * Open Graph, e o admin pode substituí-la enviando outra.
   */
  cover?: string;
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
  /** Oferece ao aluno a opção de definir um tempo diferente por dia da semana. */
  allowPerDayMinutes?: boolean;
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
  /** Posição na ordem editorial do curso — o agendador nunca a inverte. */
  sequence?: number;
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
  /** Antecipado para preencher um dia que sobrava tempo, sem furar a sequência do curso. */
  movedForFit?: boolean;
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
  /**
   * Meta adaptada pelo comportamento (feedback de carga, dias em branco).
   *
   * É lida como **razão** sobre `availability.minutesPerSession`, e essa razão
   * escala também os minutos por dia — assim uma rotina com tempos diferentes
   * encolhe ou cresce mantendo a proporção que a pessoa escolheu.
   */
  adaptiveMinutesPerSession?: number;
  /** Sessões planejadas que passaram sem nenhuma conclusão, desde a última geração. */
  missedSessions?: number;
  /**
   * Carimbo do catálogo + questionário usado na última reconciliação.
   *
   * É o que permite descobrir, com uma consulta só, que o admin mapeou conteúdo
   * novo numa resposta que esta pessoa já deu — e trazê-lo para a trilha dela
   * sem remontar o índice inteiro a cada visita.
   */
  catalogStamp?: string;
  feedbackHistory?: SessionFeedback[];
  excludedItems?: LearningTrailItem[];
};
