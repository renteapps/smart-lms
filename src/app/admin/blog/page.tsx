import { createClient } from "@/lib/supabase/server";
import { AdminBlogClient, type AdminArticleRow } from "./AdminBlogClient";

export default async function AdminBlogPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, category, format, is_published, featured, updated_at")
    .order("updated_at", { ascending: false });

  const articles: AdminArticleRow[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category ?? "Geral",
    format: row.format ?? "text",
    isPublished: row.is_published ?? true,
    featured: row.featured ?? false,
    updatedAt: row.updated_at,
  }));

  return <AdminBlogClient initialArticles={articles} />;
}
