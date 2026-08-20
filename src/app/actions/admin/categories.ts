"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type TagRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export async function getCategories() {
  const { supabase, adminClient } = await requireAdmin();
  const client = adminClient ?? supabase;
  const { data, error } = await client
    .from("course_categories")
    .select("*")
    .order("name");
  
  if (error) {
    console.error("Erro ao buscar categorias:", error);
    return [];
  }
  return (data || []) as CategoryRow[];
}

export async function getTags() {
  const { supabase, adminClient } = await requireAdmin();
  const client = adminClient ?? supabase;
  const { data, error } = await client
    .from("course_tags")
    .select("*")
    .order("name");
  
  if (error) {
    console.error("Erro ao buscar tags:", error);
    return [];
  }
  return (data || []) as TagRow[];
}

export async function createCategory(name: string, slug: string) {
  const { supabase, adminClient } = await requireAdmin();
  const client = adminClient ?? supabase;
  
  const { error } = await client
    .from("course_categories")
    .insert([{ name, slug }]);
    
  if (error) return { success: false, message: error.message };
  
  revalidatePath("/admin/cursos/categorias");
  revalidatePath("/admin/cursos");
  return { success: true };
}

export async function updateCategory(id: string, name: string, slug: string, oldName: string) {
  const { supabase, adminClient } = await requireAdmin();
  const client = adminClient ?? supabase;
  
  const { error } = await client
    .from("course_categories")
    .update({ name, slug })
    .eq("id", id);
    
  if (error) return { success: false, message: error.message };

  // Update existing courses that use this category
  if (name !== oldName) {
    await client
      .from("courses")
      .update({ category: name })
      .eq("category", oldName);
  }
  
  revalidatePath("/admin/cursos/categorias");
  revalidatePath("/admin/cursos");
  return { success: true };
}

export async function deleteCategory(id: string, name: string) {
  const { supabase, adminClient } = await requireAdmin();
  const client = adminClient ?? supabase;
  
  const { error } = await client
    .from("course_categories")
    .delete()
    .eq("id", id);
    
  if (error) return { success: false, message: error.message };
  
  revalidatePath("/admin/cursos/categorias");
  revalidatePath("/admin/cursos");
  return { success: true };
}

export async function createTag(name: string, slug: string) {
  const { supabase, adminClient } = await requireAdmin();
  const client = adminClient ?? supabase;
  
  const { error } = await client
    .from("course_tags")
    .insert([{ name, slug }]);
    
  if (error) return { success: false, message: error.message };
  
  revalidatePath("/admin/cursos/categorias");
  revalidatePath("/admin/cursos");
  return { success: true };
}

export async function updateTag(id: string, name: string, slug: string, oldName: string) {
  const { supabase, adminClient } = await requireAdmin();
  const client = adminClient ?? supabase;
  
  const { error } = await client
    .from("course_tags")
    .update({ name, slug })
    .eq("id", id);
    
  if (error) return { success: false, message: error.message };

  // Update existing courses that use this tag
  if (name !== oldName) {
    const { data: courses } = await client
      .from("courses")
      .select("id, tags")
      .contains("tags", [oldName]);
      
    if (courses && courses.length > 0) {
      for (const course of courses) {
        if (course.tags) {
          const newTags = course.tags.map((t: string) => t === oldName ? name : t);
          await client.from("courses").update({ tags: newTags }).eq("id", course.id);
        }
      }
    }
  }
  
  revalidatePath("/admin/cursos/categorias");
  revalidatePath("/admin/cursos");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Categorias de artigos (blog)
// ---------------------------------------------------------------------------

export async function getArticleCategories() {
  const { supabase, adminClient } = await requireAdmin();
  const client = adminClient ?? supabase;
  const { data, error } = await client
    .from("article_categories")
    .select("*")
    .order("name");

  if (error) {
    console.error("Erro ao buscar categorias de artigos:", error);
    return [];
  }
  return (data || []) as CategoryRow[];
}

export async function createArticleCategory(name: string, slug: string) {
  const { supabase, adminClient } = await requireAdmin();
  const client = adminClient ?? supabase;

  const { error } = await client
    .from("article_categories")
    .insert([{ name, slug }]);

  if (error) return { success: false, message: error.message };

  revalidatePath("/admin/blog/categorias");
  revalidatePath("/admin/blog");
  return { success: true };
}

export async function updateArticleCategory(id: string, name: string, slug: string, oldName: string) {
  const { supabase, adminClient } = await requireAdmin();
  const client = adminClient ?? supabase;

  const { error } = await client
    .from("article_categories")
    .update({ name, slug })
    .eq("id", id);

  if (error) return { success: false, message: error.message };

  if (name !== oldName) {
    await client
      .from("articles")
      .update({ category: name })
      .eq("category", oldName);
  }

  revalidatePath("/admin/blog/categorias");
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true };
}

export async function deleteArticleCategory(id: string, name: string) {
  const { supabase, adminClient } = await requireAdmin();
  const client = adminClient ?? supabase;

  const { error } = await client
    .from("article_categories")
    .delete()
    .eq("id", id);

  if (error) return { success: false, message: error.message };

  revalidatePath("/admin/blog/categorias");
  revalidatePath("/admin/blog");
  return { success: true };
}

export async function deleteTag(id: string, name: string) {
  const { supabase, adminClient } = await requireAdmin();
  const client = adminClient ?? supabase;
  
  const { error } = await client
    .from("course_tags")
    .delete()
    .eq("id", id);
    
  if (error) return { success: false, message: error.message };

  // Remove tag from existing courses
  const { data: courses } = await client
    .from("courses")
    .select("id, tags")
    .contains("tags", [name]);
    
  if (courses && courses.length > 0) {
    for (const course of courses) {
      if (course.tags) {
        const newTags = course.tags.filter((t: string) => t !== name);
        await client.from("courses").update({ tags: newTags }).eq("id", course.id);
      }
    }
  }
  
  revalidatePath("/admin/cursos/categorias");
  revalidatePath("/admin/cursos");
  return { success: true };
}
