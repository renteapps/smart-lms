"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import type { Course, Lesson, Module } from "@/types/course";
import type { ActionResult } from "../progress";

type Saved<T> = { success: boolean; message?: string; data?: T };

// ---------------------------------------------------------------------------
// Cursos
// ---------------------------------------------------------------------------

export type CourseInput = Partial<
  Pick<
    Course,
    | "title"
    | "slug"
    | "category"
    | "description"
    | "shortDescription"
    | "coverUrl"
    | "duration"
    | "level"
    | "price"
    | "tags"
    | "isPublished"
    | "isFeatured"
  >
>;

function courseToRow(input: CourseInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) row[key] = value;
  };

  set("title", input.title);
  set("slug", input.slug);
  set("category", input.category);
  set("description", input.description);
  set("short_description", input.shortDescription);
  set("cover_url", input.coverUrl);
  set("duration", input.duration);
  set("level", input.level);
  set("price", input.price);
  set("tags", input.tags);
  set("is_published", input.isPublished);
  set("is_featured", input.isFeatured);
  return row;
}

export async function saveCourse(input: CourseInput & { id?: string }): Promise<Saved<{ id: string }>> {
  try {
    const { supabase } = await requireAdmin();
    const row = courseToRow(input);

    const query = input.id
      ? supabase.from("courses").update(row).eq("id", input.id).select("id").single()
      : supabase.from("courses").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/cursos");
    revalidatePath("/cursos");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/cursos");
    revalidatePath("/cursos");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Módulos
// ---------------------------------------------------------------------------

export async function saveModule(
  courseId: string,
  input: Partial<Module> & { id?: string },
): Promise<Saved<{ id: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const row: Record<string, unknown> = { course_id: courseId };
    if (input.title !== undefined) row.title = input.title;
    if (input.description !== undefined) row.description = input.description;
    if (input.coverUrl !== undefined) row.cover_url = input.coverUrl;
    if (input.order !== undefined) row.order_index = input.order;

    const query = input.id
      ? supabase.from("modules").update(row).eq("id", input.id).select("id").single()
      : supabase.from("modules").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    revalidatePath(`/admin/cursos/${courseId}/modulos`);
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deleteModule(id: string, courseId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("modules").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidatePath(`/admin/cursos/${courseId}/modulos`);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Reordenação por arrasto: grava a ordem inteira de uma vez. */
export async function reorderModules(courseId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("modules").upsert(
      orderedIds.map((id, index) => ({ id, course_id: courseId, order_index: index + 1 })),
      { onConflict: "id" },
    );

    if (error) return { success: false, message: error.message };

    revalidatePath(`/admin/cursos/${courseId}/modulos`);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Aulas
// ---------------------------------------------------------------------------

export async function saveLesson(
  moduleId: string,
  input: Partial<Lesson> & { id?: string },
): Promise<Saved<{ id: string }>> {
  try {
    const { supabase } = await requireAdmin();

    const row: Record<string, unknown> = { module_id: moduleId };
    const set = (key: string, value: unknown) => {
      if (value !== undefined) row[key] = value;
    };

    set("title", input.title);
    set("type", input.type);
    set("video_url", input.videoUrl);
    set("content", input.content);
    set("blocks", input.blocks);
    set("duration_in_minutes", input.durationInMinutes);
    set("order_index", input.order);
    set("is_published", input.isPublished);
    set("slug", input.slug);
    set("meta_title", input.metaTitle);
    set("meta_description", input.metaDescription);
    set("profile_test_ref", input.profileTestId ?? null);
    set("profile_test_config", input.profileTestConfig);
    set("topics", input.topics);
    set("solves", input.solves);
    set("level", input.level);
    set("objective", input.objective);
    set("audience", input.audience);
    set("prerequisites", input.prerequisites);
    set("is_eligible_for_trail", input.isEligibleForTrail);

    const query = input.id
      ? supabase.from("lessons").update(row).eq("id", input.id).select("id").single()
      : supabase.from("lessons").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    // Anexos são substituídos por completo: o editor manda a lista final.
    if (input.attachments) {
      await supabase.from("attachments").delete().eq("lesson_id", data.id);
      if (input.attachments.length > 0) {
        await supabase.from("attachments").insert(
          input.attachments.map((item) => ({ lesson_id: data.id, name: item.name, url: item.url })),
        );
      }
    }

    revalidatePath("/admin/cursos");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deleteLesson(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/cursos");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function reorderLessons(moduleId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("lessons").upsert(
      orderedIds.map((id, index) => ({ id, module_id: moduleId, order_index: index + 1 })),
      { onConflict: "id" },
    );

    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/cursos");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
