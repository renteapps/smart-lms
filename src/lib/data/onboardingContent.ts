import { createClient } from "@/lib/supabase/client";
import type { ContentType, ContentMapping, ResolvedContent } from "@/types/trilha";

export type CatalogContentItem = {
  id: string;
  type: ContentType;
  title: string;
  category?: string;
  slug?: string;
  url?: string;
  estimatedDurationMin?: number;
  childIds?: string[];
};

export async function fetchCatalogContent(type: string): Promise<CatalogContentItem[]> {
  const supabase = createClient();
  const items: CatalogContentItem[] = [];

  try {
    if (type === 'all' || type === 'course') {
      const { data: courses } = await supabase.from('courses').select('id, title, category');
      if (courses) {
        for (const c of courses) {
          items.push({
            id: c.id,
            type: 'course',
            title: c.title,
            category: c.category || 'Curso',
          });
        }
      }
    }

    if (type === 'all' || type === 'module') {
      const { data: modules } = await supabase.from('modules').select('id, title, courses(title)');
      if (modules) {
        for (const m of modules) {
          items.push({
            id: m.id,
            type: 'module',
            title: m.title,
            category: (m.courses as any)?.title || 'Módulo',
          });
        }
      }
    }

    if (type === 'all' || type === 'lesson') {
      const { data: lessons } = await supabase.from('lessons').select('id, title, duration, modules(title)');
      if (lessons) {
        for (const l of lessons) {
          let parsedDuration = 10;
          if (l.duration) {
            const num = parseInt(String(l.duration).replace(/[^0-9]/g, ''));
            if (!isNaN(num)) parsedDuration = num;
          }
          items.push({
            id: l.id,
            type: 'lesson',
            title: l.title,
            category: (l.modules as any)?.title || 'Aula',
            estimatedDurationMin: parsedDuration,
          });
        }
      }
    }

    if (type === 'all' || type === 'article') {
      const { data: articles } = await supabase.from('articles').select('id, title, slug, reading_time_minutes, category');
      if (articles) {
        for (const a of articles) {
          items.push({
            id: a.id,
            type: 'article',
            title: a.title,
            slug: a.slug,
            category: a.category || 'Artigo',
            estimatedDurationMin: a.reading_time_minutes || 5,
          });
        }
      }
    }

    return items;
  } catch (err) {
    console.error("Error fetching catalog content:", err);
    return [];
  }
}
