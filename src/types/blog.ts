import type { LessonContentBlock } from './course';

export type ArticleFormat = 'text' | 'audio' | 'both';
export type ArticleStatus = 'published' | 'scheduled' | 'draft';

export type ArticleAuthor = {
  id: string;
  name: string;
  slug: string;
  title: string;
  avatarUrl?: string;
  bio?: string;
  createdAt?: string;
};

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  category: string;
  author: string;
  authorId?: string;
  authorDetails?: ArticleAuthor;
  publishedAt: number; // Timestamp
  readingTime?: number; // In minutes, for text or both formats
  format: ArticleFormat;
  body?: any; // MDXContent representation (could be raw string or compiled source depending on the MDX solution)
  blocks?: LessonContentBlock[]; // Editor de blocos (BlockNote) — fonte de verdade do conteúdo
  audio?: {
    url: string; // Arquivo no bucket `article-audio` (ou URL externa legada)
    duration: number; // In seconds
    transcript?: string; // Markdown or raw text for accessibility
    /** Envoltória gerada na conversão: inteiros 0–100, um por barra da onda. */
    peaks?: number[];
  };
  relatedCourseSlug?: string; // CTA for funnels
  featured?: boolean; // If it should appear in the featured spot
  premium?: boolean; // Future-proofing for gated content
};
