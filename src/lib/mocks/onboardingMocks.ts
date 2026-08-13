import { ContentMapping, ContentType, ResolvedContent } from '@/types/trilha';
import { MOCK_COURSE } from '@/lib/mockData';

export type MockContentItem = {
  id: string;
  type: ContentType;
  title: string;
  category?: string;
  slug?: string;
  url?: string;
  estimatedDurationMin?: number;
  childIds?: string[];
};

const lessonCover = 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=85&w=1000&auto=format&fit=crop';

const lessonItems: MockContentItem[] = MOCK_COURSE.modules.flatMap((module) =>
  module.lessons.map((lesson) => ({
    id: lesson.id,
    type: 'lesson' as const,
    title: lesson.title,
    category: module.title,
    estimatedDurationMin: lesson.durationInMinutes,
  })),
);

export const MOCK_CONTENT_ITEMS: MockContentItem[] = [
  {
    id: MOCK_COURSE.id,
    type: 'course',
    title: MOCK_COURSE.title,
    category: 'Formação completa',
    childIds: MOCK_COURSE.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
  },
  ...MOCK_COURSE.modules.map((module) => ({
    id: module.id,
    type: 'module' as const,
    title: module.title,
    category: MOCK_COURSE.title,
    childIds: module.lessons.map((lesson) => lesson.id),
  })),
  ...lessonItems,
  { id: 'a1', type: 'article', title: 'Como criar uma rotina de aprendizagem sustentável', slug: 'rotina-aprendizagem', category: 'Produtividade', estimatedDurationMin: 8 },
  { id: 'a2', type: 'article', title: 'Prática deliberada: como aprender fazendo', slug: 'pratica-deliberada', category: 'Aprendizagem', estimatedDurationMin: 10 },
  { id: 'a3', type: 'article', title: 'O que trava sua promoção quase nunca é técnica', slug: 'primeiro-artigo', category: 'Carreira', estimatedDurationMin: 6 },
  { id: 'ext1', type: 'external_link', title: 'Checklist para sua primeira semana', url: 'https://example.com/checklist', category: 'Material de apoio', estimatedDurationMin: 5 },
];

export const getMockContentByType = (type: string) => {
  if (type === 'all') return MOCK_CONTENT_ITEMS;
  return MOCK_CONTENT_ITEMS.filter((item) => item.type === type);
};

export function resolveContentMapping(mapping: ContentMapping): ResolvedContent[] {
  const source = MOCK_CONTENT_ITEMS.find((item) => item.id === mapping.id && item.type === mapping.type);
  if (!source) {
    if (mapping.type === 'external_link' && mapping.url && mapping.estimatedDurationMin) {
      return [{ id: mapping.id, type: 'external_link', title: mapping.title, url: mapping.url, durationMin: mapping.estimatedDurationMin }];
    }
    return [];
  }

  if (source.type === 'course' || source.type === 'module') {
    return (source.childIds || []).flatMap((id) => {
      const child = MOCK_CONTENT_ITEMS.find((item) => item.id === id && item.type === 'lesson');
      return child ? resolveContentMapping({ ...child, learningRole: mapping.learningRole }) : [];
    });
  }

  const lesson = MOCK_COURSE.modules.flatMap((module) =>
    module.lessons.map((item) => ({ item, module })),
  ).find(({ item }) => item.id === source.id);

  return [{
    id: source.id,
    type: source.type,
    title: source.title,
    durationMin: mapping.estimatedDurationMin || source.estimatedDurationMin || 10,
    courseId: lesson ? MOCK_COURSE.id : undefined,
    moduleId: lesson?.module.id,
    moduleName: lesson?.module.title,
    slug: source.slug,
    url: source.url,
    cover: lesson?.module.coverUrl || lessonCover,
    prerequisites: lesson ? getLessonPrerequisites(lesson.item.id) : undefined,
  }];
}

function getLessonPrerequisites(lessonId: string): string[] | undefined {
  const lessons = MOCK_COURSE.modules.flatMap((module) => module.lessons);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  return index > 0 ? [lessons[index - 1].id] : undefined;
}
