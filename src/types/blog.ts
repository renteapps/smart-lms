export type ArticleFormat = 'text' | 'audio' | 'both';

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  category: string;
  author: string;
  publishedAt: number; // Timestamp
  readingTime?: number; // In minutes, for text or both formats
  format: ArticleFormat;
  body?: any; // MDXContent representation (could be raw string or compiled source depending on the MDX solution)
  audio?: {
    url: string; // Bunny CDN URL
    duration: number; // In seconds
    transcript?: string; // Markdown or raw text for accessibility
  };
  relatedCourseSlug?: string; // CTA for funnels
  featured?: boolean; // If it should appear in the featured spot
  premium?: boolean; // Future-proofing for gated content
};
