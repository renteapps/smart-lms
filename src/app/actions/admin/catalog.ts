"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import type { Course, Lesson, Module } from "@/types/course";
import type { CourseSalesConfig } from "@/lib/salesUrlHelper";
import type { ActionResult } from "../progress";

type Saved<T> = { success: boolean; message?: string; data?: T };

const generateShortId = () => Math.random().toString(36).substring(2, 10);

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
    | "status"
    | "isPublished"
    | "layout"
    | "isFeatured"
    | "homeCarousel"
    | "instructorNames"
    | "coordinatorName"
    | "enableCertificates"
    | "dripContent"
    | "enableComments"
    | "requireSequentialProgress"
    | "accessExpirationDays"
    | "maxStudents"
    | "salesUrl"
    | "salesPageUrl"
    | "salesConfig"
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
  if (input.coverUrl !== undefined) {
    row.cover_url = input.coverUrl || null;
  }
  set("duration", input.duration);
  set("level", input.level);
  set("instructor_names", input.instructorNames);
  set("coordinator_name", input.coordinatorName);
  set("price", input.price);
  set("tags", input.tags);
  if (input.status !== undefined) {
    row.status = input.status;
    row.is_published = input.status === "Publicado";
  } else if (input.isPublished !== undefined) {
    row.is_published = input.isPublished;
    row.status = input.isPublished ? "Publicado" : "Rascunho";
  }
  set("is_featured", input.isFeatured);
  // `layout` só entra na criação — a migration trava a coluna contra update.
  if (input.layout !== undefined) row.layout = input.layout;
  set("home_carousel", input.homeCarousel);
  set("enable_certificates", input.enableCertificates);
  set("drip_content", input.dripContent);
  set("enable_comments", input.enableComments);
  set("require_sequential_progress", input.requireSequentialProgress);
  set("access_expiration_days", input.accessExpirationDays);
  set("max_students", input.maxStudents);
  if (input.salesUrl !== undefined) {
    row.sales_url = input.salesUrl || null;
  }
  if (input.salesPageUrl !== undefined) {
    row.sales_page_url = input.salesPageUrl || null;
  }
  if (input.salesConfig !== undefined) {
    row.sales_config = input.salesConfig || {};
  }
  return row;
}

export async function saveCourse(input: CourseInput & { id?: string }): Promise<Saved<{ id: string }>> {
  try {
    const { adminClient } = await requireAdmin();
    const row = courseToRow(input);
    if (!input.id && !row.slug) {
      row.slug = generateShortId();
    }

    const query = input.id
      ? adminClient.from("courses").update(row).eq("id", input.id).select("id").single()
      : adminClient.from("courses").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/cursos");
    revalidatePath(`/admin/cursos/${data.id}`);
    revalidatePath(`/admin/cursos/${data.id}/vendas`);
    revalidatePath(`/admin/cursos/${data.id}/editar`);
    revalidatePath(`/admin/cursos/${data.id}/configuracoes`);
    revalidatePath("/cursos");
    revalidatePath("/courses");
    revalidatePath(`/courses/${data.id}`);
    revalidatePath("/");
    revalidatePath("/minha-trilha");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function saveCourseSales(
  courseId: string,
  data: {
    salesUrl: string;
    salesPageUrl?: string;
    salesConfig?: CourseSalesConfig | Record<string, unknown>;
  }
): Promise<Saved<{ id: string }>> {
  return saveCourse({
    id: courseId,
    salesUrl: data.salesUrl,
    salesPageUrl: data.salesPageUrl,
    salesConfig: data.salesConfig,
  });
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient.from("courses").delete().eq("id", id);
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
    const { adminClient } = await requireAdmin();

    const row: Record<string, unknown> = { course_id: courseId };
    if (input.title !== undefined) row.title = input.title;
    if (input.slug !== undefined) row.slug = input.slug;
    if (input.description !== undefined) row.description = input.description;
    if (input.coverUrl !== undefined) row.cover_url = input.coverUrl;
    if (input.order !== undefined) row.order_index = input.order;

    if (!input.id) {
      if (!row.slug) row.slug = generateShortId();
      if (row.order_index === undefined) {
        const { data: maxModule } = await adminClient
          .from("modules")
          .select("order_index")
          .eq("course_id", courseId)
          .order("order_index", { ascending: false })
          .limit(1)
          .maybeSingle();
        row.order_index = (maxModule?.order_index || 0) + 1;
      }
    }

    const query = input.id
      ? adminClient.from("modules").update(row).eq("id", input.id).select("id").single()
      : adminClient.from("modules").insert(row).select("id").single();

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
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient.from("modules").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidatePath(`/admin/cursos/${courseId}/modulos`);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Reordenação por arrasto: grava a ordem inteira de uma vez via RPC Postgres. */
export async function reorderModules(courseId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();

    const { error } = await adminClient.rpc("reorder_modules", {
      p_course_id: courseId,
      p_ordered_ids: orderedIds,
    });

    if (error) return { success: false, message: error.message };

    revalidatePath(`/admin/cursos/${courseId}/modulos`);
    revalidatePath(`/admin/cursos/${courseId}`);
    revalidatePath("/courses/[slug]", "page");
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
    const { adminClient } = await requireAdmin();

    const row: Record<string, unknown> = {};
    if (moduleId) row.module_id = moduleId;
    const set = (key: string, value: unknown) => {
      if (value !== undefined) row[key] = value;
    };

    set("title", input.title);
    set("type", input.type);
    set("video_url", input.videoUrl);
    set("pandavideo_id", input.pandavideoId);
    set("transcription", input.transcription);
    set("content", input.content);
    set("blocks", input.blocks);
    set("duration_in_minutes", input.durationInMinutes);
    set("order_index", input.order);
    set("is_published", input.isPublished);
    set("slug", input.slug);
    if (input.coverUrl !== undefined) row.cover_url = input.coverUrl || null;
    set("short_description", input.shortDescription);
    if (input.quizId !== undefined) row.quiz_id = input.quizId || null;
    if (input.profileTestId !== undefined) row.profile_test_ref = input.profileTestId || null;
    set("profile_test_config", input.profileTestConfig);
    set("topics", input.topics);
    set("solves", input.solves);
    set("level", input.level);
    set("objective", input.objective);
    set("audience", input.audience);
    set("prerequisites", input.prerequisites);
    set("is_eligible_for_trail", input.isEligibleForTrail);

    if (!input.id) {
      if (!row.slug) row.slug = generateShortId();
      if (row.order_index === undefined) {
        const { data: maxLesson } = await adminClient
          .from("lessons")
          .select("order_index")
          .eq("module_id", moduleId)
          .order("order_index", { ascending: false })
          .limit(1)
          .maybeSingle();
        row.order_index = (maxLesson?.order_index || 0) + 1;
      }
    }

    const query = input.id
      ? adminClient.from("lessons").update(row).eq("id", input.id).select("id").single()
      : adminClient.from("lessons").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    // Anexos são substituídos por completo: o editor manda a lista final.
    if (input.attachments) {
      await adminClient.from("attachments").delete().eq("lesson_id", data.id);
      if (input.attachments.length > 0) {
        await adminClient.from("attachments").insert(
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
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient.from("lessons").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/cursos");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function reorderLessons(
  courseId: string,
  moduleId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();

    const { error } = await adminClient.rpc("reorder_lessons", {
      p_module_id: moduleId,
      p_ordered_ids: orderedIds,
    });

    if (error) return { success: false, message: error.message };

    revalidatePath(`/admin/cursos/${courseId}/modulos`);
    revalidatePath(`/admin/cursos/${courseId}`);
    revalidatePath("/courses/[slug]", "page");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function saveQuiz(
  input: { id?: string; title: string; description?: string; questions: unknown[]; passingScore: number }
): Promise<Saved<{ id: string }>> {
  try {
    const { adminClient } = await requireAdmin();

    const row: Record<string, unknown> = {
      title: input.title,
      description: input.description,
      questions: input.questions,
      passing_score: input.passingScore,
      updated_at: new Date().toISOString()
    };

    if (!input.id) {
      row.created_at = new Date().toISOString();
    }

    const query = input.id
      ? adminClient.from("quizzes").update(row).eq("id", input.id).select("id").single()
      : adminClient.from("quizzes").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/cursos/[id]/modulos", "page");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
