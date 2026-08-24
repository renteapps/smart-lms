import type { Article, ArticleFormat } from "@/types/blog";
import { logQueryError, type DB, type Row } from "./types";

const ARTICLE_SELECT = `
  id, slug, title, excerpt, cover, category, author, author_id, published_at, reading_time,
  format, body, blocks, audio_url, audio_duration, audio_transcript, related_course_id,
  featured, premium, courses:related_course_id ( slug ),
  author_rel:author_id ( id, name, slug, title, avatar_url, bio )
`;

export function mapArticle(row: Row): Article {
  const authorObj = row.author_rel;
  const authorName = authorObj?.name || row.author || "Equipe";
  const authorDetails = authorObj
    ? {
        id: authorObj.id,
        name: authorObj.name,
        slug: authorObj.slug,
        title: authorObj.title ?? "",
        avatarUrl: authorObj.avatar_url ?? undefined,
        bio: authorObj.bio ?? undefined,
      }
    : undefined;

  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    cover: row.cover ?? "",
    category: row.category ?? "Geral",
    author: authorName,
    authorId: row.author_id ?? undefined,
    authorDetails,
    publishedAt: new Date(row.published_at).getTime(),
    readingTime: row.reading_time ?? undefined,
    format: (row.format ?? "text") as ArticleFormat,
    body: row.body ?? "",
    blocks: row.blocks ?? [],
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
  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("is_published", true)
    .lte("published_at", nowIso)
    .order("published_at", { ascending: false });

  logQueryError("getAllArticles", error);
  return (data ?? []).map(mapArticle);
}

export async function getArticleBySlug(db: DB, slug: string): Promise<Article | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .lte("published_at", nowIso)
    .maybeSingle();

  logQueryError("getArticleBySlug", error);
  return data ? mapArticle(data) : null;
}

export async function getArticlesByCategory(db: DB, category: string): Promise<Article[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("is_published", true)
    .lte("published_at", nowIso)
    .ilike("category", category)
    .order("published_at", { ascending: false });

  logQueryError("getArticlesByCategory", error);
  return (data ?? []).map(mapArticle);
}

export async function getArticleSlugs(db: DB): Promise<string[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("articles")
    .select("slug")
    .eq("is_published", true)
    .lte("published_at", nowIso);
  logQueryError("getArticleSlugs", error);
  return (data ?? []).map((row: Row) => row.slug);
}
