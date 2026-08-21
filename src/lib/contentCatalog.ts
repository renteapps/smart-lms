import type {
  ContentMapping,
  ContentType,
  EligibleLesson,
  ResolvedContent,
  SchedulableContentType,
} from '@/types/trilha';

/**
 * Catálogo de conteúdo mapeável pelo questionário.
 *
 * Antes era uma constante em `mocks/onboardingMocks.ts`; virou um índice
 * construído a partir do banco (ver `lib/data/content.ts`). As funções puras que
 * dependiam do catálogo — matching, diagnósticos do admin — passaram a receber
 * este índice, para que continuem testáveis sem tocar no Supabase.
 */

export type ContentItem = {
  id: string;
  type: ContentType;
  title: string;
  category?: string;
  slug?: string;
  url?: string;
  estimatedDurationMin?: number;
  /** Para curso e módulo: as aulas que ele expande. */
  childIds?: string[];
  courseId?: string;
  /** Nome do curso — o card da trilha mostra a que formação a aula pertence. */
  courseName?: string;
  moduleId?: string;
  moduleName?: string;
  cover?: string;
  prerequisites?: string[];
  /** Posição da aula na ordem editorial do curso — o agendador nunca a inverte. */
  sequence?: number;
};

export type ContentResolver = (mapping: ContentMapping) => ResolvedContent[];

export interface ContentIndex {
  items: ContentItem[];
  /** Aulas que o motor de afinidade pode puxar sozinho. */
  eligibleLessons: EligibleLesson[];
  has(id: string): boolean;
  byId(id: string): ContentItem | undefined;
  /** Mapeamento sintético para um id solto — usado ao resolver pré-requisitos. */
  mappingFor(id: string): ContentMapping | null;
  resolve: ContentResolver;
}

const SCHEDULABLE: SchedulableContentType[] = ['lesson', 'article', 'external_link'];

function isSchedulable(type: ContentType): type is SchedulableContentType {
  return (SCHEDULABLE as ContentType[]).includes(type);
}

export function createContentIndex(
  items: ContentItem[] = [],
  eligibleLessons: EligibleLesson[] = [],
): ContentIndex {
  const byId = new Map(items.map((item) => [item.id, item]));

  const resolve: ContentResolver = (mapping) => {
    const source = items.find((item) => item.id === mapping.id && item.type === mapping.type);

    if (!source) {
      // Link externo criado direto no questionário não precisa existir no catálogo.
      if (mapping.type === 'external_link' && mapping.url && mapping.estimatedDurationMin) {
        return [{
          id: mapping.id,
          type: 'external_link',
          title: mapping.title,
          url: mapping.url,
          durationMin: mapping.estimatedDurationMin,
          cover: mapping.cover,
        }];
      }
      return [];
    }

    if (source.type === 'course' || source.type === 'module') {
      return (source.childIds || []).flatMap((childId) => {
        const child = byId.get(childId);
        if (!child || child.type !== 'lesson') return [];
        return resolve({
          id: child.id,
          type: 'lesson',
          title: child.title,
          slug: child.slug,
          url: child.url,
          estimatedDurationMin: child.estimatedDurationMin,
          learningRole: mapping.learningRole,
        });
      });
    }

    if (!isSchedulable(source.type)) return [];

    return [{
      id: source.id,
      type: source.type,
      title: source.title,
      durationMin: mapping.estimatedDurationMin || source.estimatedDurationMin || 10,
      courseId: source.courseId,
      courseName: source.courseName,
      moduleId: source.moduleId,
      moduleName: source.moduleName,
      slug: source.slug,
      url: source.url,
      // Capa escolhida na curadoria vence a do catálogo.
      cover: mapping.cover || source.cover,
      prerequisites: source.prerequisites?.length ? source.prerequisites : undefined,
      sequence: source.sequence,
    }];
  };

  return {
    items,
    eligibleLessons,
    has: (id) => byId.has(id),
    byId: (id) => byId.get(id),
    mappingFor: (id) => {
      const source = byId.get(id);
      if (!source) return null;
      return {
        id: source.id,
        type: source.type,
        title: source.title,
        slug: source.slug,
        url: source.url,
        estimatedDurationMin: source.estimatedDurationMin,
        learningRole: 'essential',
      };
    },
    resolve,
  };
}

/** Índice vazio: nenhum conteúdo resolve, e nada quebra. */
export const EMPTY_CONTENT_INDEX: ContentIndex = createContentIndex([], []);

export function filterContentByType(index: ContentIndex, type: string): ContentItem[] {
  if (type === 'all') return index.items;
  return index.items.filter((item) => item.type === type);
}
