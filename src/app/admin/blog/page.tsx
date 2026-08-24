import { createClient } from "@/lib/supabase/server";
import { AdminBlogClient, type AdminArticleRow } from "./AdminBlogClient";

export default async function AdminBlogPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, category, cover, format, is_published, published_at, featured, updated_at")
    .order("updated_at", { ascending: false });

  const articles: AdminArticleRow[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category ?? "Geral",
    cover: row.cover ?? null,
    format: row.format ?? "text",
    isPublished: row.is_published ?? true,
    publishedAt: row.published_at,
    featured: row.featured ?? false,
    updatedAt: row.updated_at,
  }));

  return <AdminBlogClient initialArticles={articles} />;
}
