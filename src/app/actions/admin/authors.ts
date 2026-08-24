"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import type { ArticleAuthor } from "@/types/blog";

export type AuthorRow = ArticleAuthor & {
  articlesCount?: number;
};

export type AuthorInput = {
  name: string;
  title: string;
  avatarUrl?: string | null;
  bio?: string | null;
  slug?: string;
};

function slugify(text: string) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");
}

export async function getArticleAuthors(): Promise<AuthorRow[]> {
  try {
    const { supabase, adminClient } = await requireAdmin();
    const client = adminClient ?? supabase;

    const { data: authors, error } = await client
      .from("article_authors")
      .select("id, name, slug, title, avatar_url, bio, created_at")
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao buscar autores:", error);
      return [];
    }

    // Buscar contagem de artigos por autor
    const { data: articles } = await client
      .from("articles")
      .select("author_id");

    const counts: Record<string, number> = {};
    if (articles) {
      for (const a of articles) {
        if (a.author_id) {
          counts[a.author_id] = (counts[a.author_id] || 0) + 1;
        }
      }
    }

    return (authors || []).map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      title: a.title ?? "",
      avatarUrl: a.avatar_url ?? undefined,
      bio: a.bio ?? undefined,
      createdAt: a.created_at,
      articlesCount: counts[a.id] || 0,
    }));
  } catch (error) {
    console.error("Erro em getArticleAuthors:", error);
    return [];
  }
}

export async function createArticleAuthor(input: AuthorInput): Promise<{
  success: boolean;
  data?: ArticleAuthor;
  message?: string;
}> {
  try {
    const { supabase, adminClient } = await requireAdmin();
    const client = adminClient ?? supabase;

    const name = input.name.trim();
    if (!name) {
      return { success: false, message: "O nome do autor é obrigatório." };
    }

    let baseSlug = input.slug?.trim() ? slugify(input.slug) : slugify(name);
    if (!baseSlug) baseSlug = "autor";

    // Garantir unicidade do slug
    const { data: existing } = await client
      .from("article_authors")
      .select("slug")
      .ilike("slug", `${baseSlug}%`);

    const taken = new Set((existing ?? []).map((r: { slug: string }) => r.slug));
    let slug = baseSlug;
    let counter = 2;
    while (taken.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const { data, error } = await client
      .from("article_authors")
      .insert([
        {
          name,
          slug,
          title: input.title?.trim() || "",
          avatar_url: input.avatarUrl || null,
          bio: input.bio?.trim() || "",
        },
      ])
      .select("id, name, slug, title, avatar_url, bio, created_at")
      .single();

    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/blog/autores");
    revalidatePath("/admin/blog");
    revalidatePath("/blog");

    return {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        title: data.title ?? "",
        avatarUrl: data.avatar_url ?? undefined,
        bio: data.bio ?? undefined,
        createdAt: data.created_at,
      },
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function updateArticleAuthor(
  id: string,
  input: AuthorInput,
): Promise<{
  success: boolean;
  data?: ArticleAuthor;
  message?: string;
}> {
  try {
    const { supabase, adminClient } = await requireAdmin();
    const client = adminClient ?? supabase;

    const name = input.name.trim();
    if (!name) {
      return { success: false, message: "O nome do autor é obrigatório." };
    }

    const updateData: Record<string, unknown> = {
      name,
      title: input.title?.trim() || "",
      avatar_url: input.avatarUrl || null,
      bio: input.bio?.trim() || "",
      updated_at: new Date().toISOString(),
    };

    if (input.slug?.trim()) {
      updateData.slug = slugify(input.slug);
    }

    const { data, error } = await client
      .from("article_authors")
      .update(updateData)
      .eq("id", id)
      .select("id, name, slug, title, avatar_url, bio, created_at")
      .single();

    if (error) return { success: false, message: error.message };

    // Sincronizar nome nos artigos vinculados
    await client
      .from("articles")
      .update({ author: name })
      .eq("author_id", id);

    revalidatePath("/admin/blog/autores");
    revalidatePath("/admin/blog");
    revalidatePath("/blog");

    return {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        title: data.title ?? "",
        avatarUrl: data.avatar_url ?? undefined,
        bio: data.bio ?? undefined,
        createdAt: data.created_at,
      },
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deleteArticleAuthor(
  id: string,
  authorName: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase, adminClient } = await requireAdmin();
    const client = adminClient ?? supabase;

    const { error } = await client
      .from("article_authors")
      .delete()
      .eq("id", id);

    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/blog/autores");
    revalidatePath("/admin/blog");
    revalidatePath("/blog");

    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
