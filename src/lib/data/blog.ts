import type { Article, ArticleFormat } from "@/types/blog";
import { logQueryError, type DB, type Row } from "./types";

const ARTICLE_SELECT = `
  id, slug, title, excerpt, cover, category, author, published_at, reading_time,
  format, body, audio_url, audio_duration, audio_transcript, related_course_id,
  featured, premium, courses:related_course_id ( slug )
`;

export function mapArticle(row: Row): Article {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    cover: row.cover ?? "",
    category: row.category ?? "Geral",
    author: row.author ?? "Equipe",
    publishedAt: new Date(row.published_at).getTime(),
    readingTime: row.reading_time ?? undefined,
    format: (row.format ?? "text") as ArticleFormat,
    body: row.body ?? "",
    audio: row.audio_url
      ? {
          url: row.audio_url,
          duration: row.audio_duration ?? 0,
          transcript: row.audio_transcript ?? undefined,
        }
      : undefined,
    relatedCourseSlug: row.courses?.slug ?? undefined,
    featured: row.featured ?? false,
    premium: row.premium ?? false,
  };
}

export async function getAllArticles(db: DB): Promise<Article[]> {
  const { data, error } = await db
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  logQueryError("getAllArticles", error);
  return (data ?? []).map(mapArticle);
}

export async function getArticleBySlug(db: DB, slug: string): Promise<Article | null> {
  const { data, error } = await db
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  logQueryError("getArticleBySlug", error);
  return data ? mapArticle(data) : null;
}

export async function getArticlesByCategory(db: DB, category: string): Promise<Article[]> {
  const { data, error } = await db
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("is_published", true)
    .ilike("category", category)
    .order("published_at", { ascending: false });

  logQueryError("getArticlesByCategory", error);
  return (data ?? []).map(mapArticle);
}

export async function getArticleSlugs(db: DB): Promise<string[]> {
  const { data, error } = await db.from("articles").select("slug").eq("is_published", true);
  logQueryError("getArticleSlugs", error);
  return (data ?? []).map((row: Row) => row.slug);
}
