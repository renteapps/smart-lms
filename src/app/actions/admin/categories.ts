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
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("course_categories")
    .select("*")
    .order("name");
  
  if (error) throw new Error(error.message);
  return data as CategoryRow[];
}

export async function getTags() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("course_tags")
    .select("*")
    .order("name");
  
  if (error) throw new Error(error.message);
  return data as TagRow[];
}

export async function createCategory(name: string, slug: string) {
  const { supabase } = await requireAdmin();
  
  const { error } = await supabase
    .from("course_categories")
    .insert([{ name, slug }]);
    
  if (error) return { success: false, message: error.message };
  
  revalidatePath("/admin/cursos/categorias");
  revalidatePath("/admin/cursos");
  return { success: true };
}

export async function updateCategory(id: string, name: string, slug: string, oldName: string) {
  const { supabase } = await requireAdmin();
  
  const { error } = await supabase
    .from("course_categories")
    .update({ name, slug })
    .eq("id", id);
    
  if (error) return { success: false, message: error.message };

  // Update existing courses that use this category
  if (name !== oldName) {
    await supabase
      .from("courses")
      .update({ category: name })
      .eq("category", oldName);
  }
  
  revalidatePath("/admin/cursos/categorias");
  revalidatePath("/admin/cursos");
  return { success: true };
}

export async function deleteCategory(id: string, name: string) {
  const { supabase } = await requireAdmin();
  
  const { error } = await supabase
    .from("course_categories")
    .delete()
    .eq("id", id);
    
  if (error) return { success: false, message: error.message };
  
  revalidatePath("/admin/cursos/categorias");
  revalidatePath("/admin/cursos");
  return { success: true };
}

export async function createTag(name: string, slug: string) {
  const { supabase } = await requireAdmin();
  
  const { error } = await supabase
    .from("course_tags")
    .insert([{ name, slug }]);
    
  if (error) return { success: false, message: error.message };
  
  revalidatePath("/admin/cursos/categorias");
  revalidatePath("/admin/cursos");
  return { success: true };
}

export async function updateTag(id: string, name: string, slug: string, oldName: string) {
  const { supabase } = await requireAdmin();
  
  const { error } = await supabase
    .from("course_tags")
    .update({ name, slug })
    .eq("id", id);
    
  if (error) return { success: false, message: error.message };

  // Update existing courses that use this tag
  if (name !== oldName) {
    const { data: courses } = await supabase
      .from("courses")
      .select("id, tags")
      .contains("tags", [oldName]);
      
    if (courses && courses.length > 0) {
      for (const course of courses) {
        if (course.tags) {
          const newTags = course.tags.map((t: string) => t === oldName ? name : t);
          await supabase.from("courses").update({ tags: newTags }).eq("id", course.id);
        }
      }
    }
  }
  
  revalidatePath("/admin/cursos/categorias");
  revalidatePath("/admin/cursos");
  return { success: true };
}

export async function deleteTag(id: string, name: string) {
  const { supabase } = await requireAdmin();
  
  const { error } = await supabase
    .from("course_tags")
    .delete()
    .eq("id", id);
    
  if (error) return { success: false, message: error.message };

  // Remove tag from existing courses
  const { data: courses } = await supabase
    .from("courses")
    .select("id, tags")
    .contains("tags", [name]);
    
  if (courses && courses.length > 0) {
    for (const course of courses) {
      if (course.tags) {
        const newTags = course.tags.filter((t: string) => t !== name);
        await supabase.from("courses").update({ tags: newTags }).eq("id", course.id);
      }
    }
  }
  
  revalidatePath("/admin/cursos/categorias");
  revalidatePath("/admin/cursos");
  return { success: true };
}
