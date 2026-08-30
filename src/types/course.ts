/**
 * Tipos do núcleo acadêmico.
 *
 * Antes viviam em `lib/mockData.ts` colados ao curso de exemplo. Agora são só
 * tipos: quem os preenche é `lib/data/courses.ts`, lendo do Supabase.
 */

import type { CourseSalesConfig } from "@/lib/salesUrlHelper";

/** Formato do editor de blocos antigo (pré-BlockNote). Mantido só para migrar aulas já salvas — ver `lib/editor/legacyBlocks.ts`. */
export type ContentBlock = {
  id: string;
  type: 'paragraph' | 'h1' | 'h2' | 'video' | 'quiz' | 'reflexao' | 'citacao' | 'table';
  content: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
};

/**
 * Bloco de conteúdo no formato do BlockNote (ver `lib/editor/blockSchema.tsx`
 * para o schema completo, incluindo os blocos próprios de vídeo/quiz/destaque).
 * Tipado de forma solta aqui de propósito: este arquivo não deve depender do
 * BlockNote (client-only) para poder ser importado em código de servidor.
 */
export type LessonContentBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  content?: unknown;
  children?: LessonContentBlock[];
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
  pandavideoId?: string;
  transcription?: string;
  content: string;
  blocks?: LessonContentBlock[];
  attachments: LessonAttachment[];
  durationInMinutes: number;
  order?: number;
  isPublished?: boolean;
  isCompleted?: boolean;
  /** 0 a 5. */
  userRating?: number;
  lastWatchedSecond?: number;
  slug?: string;
  shortDescription?: string;
  /**
   * Thumb vertical (2:3) da aula. É a capa que a galeria do curso destaque e o
   * carrossel da home mostram; nos cursos com módulos ela é opcional e a aula
   * herda a capa do curso.
   */
  coverUrl?: string;
  quizId?: string;
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
  slug?: string;
  description?: string;
  coverUrl?: string;
  order: number;
  lessons: Lesson[];
};

export type CourseStatus = 'Publicado' | 'Rascunho' | 'Arquivado';

/**
 * Como o curso se organiza — e, por consequência, como ele é editado e exibido.
 *
 * `modules`: o curso comum, uma sequência de módulos com aulas dentro.
 * `gallery`: o curso destaque, uma coleção de aulas avulsas (masterclasses)
 * exibida como galeria de thumbs verticais, sem módulos.
 *
 * Escolhido na criação e imutável: converter um curso reorganizaria conteúdo já
 * publicado por cima do progresso dos alunos. O banco recusa a troca — ver
 * `supabase/migrations/20260821090000_gallery_courses.sql`.
 */
export type CourseLayout = 'modules' | 'gallery';

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
  status?: CourseStatus;
  layout: CourseLayout;
  isFeatured?: boolean;
  instructorNames?: string[];
  coordinatorName?: string;
  createdAt?: string;
  updatedAt?: string;
  modules: Module[];
  /** Emite certificado automático ao concluir 100% das aulas. */
  enableCertificates?: boolean;
  /** Libera os módulos gradualmente após a compra, em vez de tudo de uma vez. */
  dripContent?: boolean;
  enableComments?: boolean;
  /** O aluno só pode assistir a próxima aula após concluir a anterior. */
  requireSequentialProgress?: boolean;
  /** Dias de acesso após a matrícula. Vazio/nulo = acesso vitalício. */
  accessExpirationDays?: number | null;
  /** Máximo de matriculados. Vazio/nulo = ilimitado. */
  maxStudents?: number | null;
  /** Só em curso galeria: publica as 8 aulas mais recentes num carrossel na home. */
  homeCarousel?: boolean;
  /** Link de checkout ou venda principal com suporte a tags dinâmicas. */
  salesUrl?: string | null;
  /** URL da landing page descritiva do curso. */
  salesPageUrl?: string | null;
  /** Configurações de ofertas, plataforma e checkouts dinâmicos. */
  salesConfig?: CourseSalesConfig | Record<string, unknown> | null;
};

/** Contrato leve usado na capa, sidebar e navegação entre aulas. */
export type CourseOutlineLesson = Pick<
  Lesson,
  | 'id'
  | 'moduleId'
  | 'title'
  | 'type'
  | 'durationInMinutes'
  | 'order'
  | 'isPublished'
  | 'isCompleted'
  | 'userRating'
  | 'lastWatchedSecond'
  | 'slug'
  | 'shortDescription'
  | 'coverUrl'
>;

export type CourseOutlineModule = Omit<Module, 'lessons'> & {
  lessons: CourseOutlineLesson[];
};

export type CourseOutline = Omit<Course, 'modules'> & {
  modules: CourseOutlineModule[];
};

export type CourseOverviewData = CourseOutline;
export type LessonDetail = Lesson;

/** Estado do curso para o aluno da sessão. */
export type StudentCourseState =
  | {
      kind: 'locked';
      /** Template do checkout; as variáveis são resolvidas no card com os dados do aluno. */
      salesUrl: string | null;
    }
  | { kind: 'available' }
  | { kind: 'in-progress'; progress: number }
  | {
      kind: 'completed';
      certificateEnabled: boolean;
      certificateIssued: boolean;
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
  isFeatured?: boolean;
  orderIndex?: number;
  createdAt?: string;
  /** Só vem preenchido quando há um aluno na sessão. */
  progress?: number;
  /** Configuração acadêmica usada para decidir o CTA ao concluir. */
  certificateEnabled?: boolean;
  /** Presente nas vitrines do aluno; consumidores administrativos podem omitir. */
  studentState?: StudentCourseState;
};

/** Aula em andamento, para a faixa "continue de onde parou". */
export type ContinueLesson = {
  id: string;
  slug?: string;
  courseId: string;
  courseSlug?: string;
  title: string;
  moduleName: string;
  duration: string;
  cover: string;
  progress: number;
};

/** Aula como ela aparece na galeria e no carrossel: só a thumb e o essencial. */
export type GalleryLesson = {
  id: string;
  title: string;
  /** Thumb vertical já resolvida — cai na capa do curso quando a aula não tem uma. */
  cover: string;
  durationInMinutes: number;
  shortDescription?: string;
  isCompleted?: boolean;
  /** Sem matrícula nem plano que cubra o curso: aparece na prévia, mas não dá para assistir. */
  locked?: boolean;
  href: string;
  /** 0 a 100, só presente quando a aula foi começada e ainda não foi concluída. */
  progress?: number;
};

/** Uma faixa do carrossel da home: um curso galeria e suas 8 aulas mais recentes. */
export type HomeCarouselRow = {
  courseId: string;
  courseSlug?: string;
  courseTitle: string;
  category?: string;
  isFeatured?: boolean;
  createdAt?: string;
  courseHref: string;
  /** Curso inteiro está travado para o aluno da sessão — todas as aulas da faixa seguem o mesmo estado. */
  locked: boolean;
  /** Template de checkout do curso; variáveis dinâmicas resolvidas no card com os dados do aluno. */
  salesUrl: string | null;
  lessons: GalleryLesson[];
};
