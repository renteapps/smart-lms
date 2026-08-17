/**
 * Tipos do núcleo acadêmico.
 *
 * Antes viviam em `lib/mockData.ts` colados ao curso de exemplo. Agora são só
 * tipos: quem os preenche é `lib/data/courses.ts`, lendo do Supabase.
 */

export type ContentBlock = {
  id: string;
  type: 'paragraph' | 'h1' | 'h2' | 'video' | 'quiz' | 'reflexao' | 'citacao' | 'table';
  content: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
};

export type LessonAttachment = {
  id?: string;
  name: string;
  url: string;
};

export type LessonType = 'video' | 'text' | 'quiz' | 'profile_test';

export type Lesson = {
  id: string;
  moduleId?: string;
  title: string;
  type: LessonType;
  videoUrl?: string;
  content: string;
  blocks?: ContentBlock[];
  attachments: LessonAttachment[];
  durationInMinutes: number;
  order?: number;
  isPublished?: boolean;
  isCompleted?: boolean;
  /** 0 a 5. */
  userRating?: number;
  lastWatchedSecond?: number;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  profileTestId?: string;
  profileTestConfig?: {
    allowSkipIfCompleted?: boolean;
    requireRetake?: boolean;
  };
  /** Metadados pedagógicos usados pelo motor da trilha. */
  topics?: string[];
  solves?: string[];
  level?: 'iniciante' | 'intermediario' | 'avancado';
  objective?: string;
  audience?: string;
  prerequisites?: string[];
  isEligibleForTrail?: boolean;
};

export type Module = {
  id: string;
  courseId?: string;
  title: string;
  description?: string;
  coverUrl?: string;
  order: number;
  lessons: Lesson[];
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  coverUrl?: string;
  duration?: string;
  level: string;
  price?: number;
  tags?: string[];
  isPublished: boolean;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
  modules: Module[];
};

/**
 * Cartão do catálogo: o suficiente para a vitrine, sem carregar módulos e aulas.
 */
export type CatalogCourse = {
  id: string;
  slug?: string;
  title: string;
  category: string;
  description: string;
  cover: string;
  duration: string;
  lessonCount: number;
  level: 'Essencial' | 'Intermediário' | 'Avançado' | string;
  /** Só vem preenchido quando há um aluno na sessão. */
  progress?: number;
};

/** Aula em andamento, para a faixa "continue de onde parou". */
export type ContinueLesson = {
  id: string;
  courseId: string;
  title: string;
  moduleName: string;
  duration: string;
  cover: string;
  progress: number;
};
