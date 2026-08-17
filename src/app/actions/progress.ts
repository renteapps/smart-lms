"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";

export type ActionResult = { success: boolean; message?: string };

/**
 * Progresso da aula. Um upsert por (aluno, aula): refazer uma aula sobrescreve
 * o registro em vez de acumular linhas.
 */
export async function setLessonCompletion(
  lessonId: string,
  isCompleted: boolean,
  courseId?: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,lesson_id" },
    );

    if (error) return { success: false, message: error.message };

    if (courseId) revalidatePath(`/courses/${courseId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Onde o vídeo parou — chamado com throttle pelo player. */
export async function saveWatchPosition(lessonId: string, second: number): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("lesson_progress").upsert(
      { user_id: user.id, lesson_id: lessonId, last_watched_second: Math.max(0, Math.floor(second)) },
      { onConflict: "user_id,lesson_id" },
    );

    return error ? { success: false, message: error.message } : { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function rateLesson(lessonId: string, rating: number): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("lesson_progress").upsert(
      { user_id: user.id, lesson_id: lessonId, user_rating: Math.min(5, Math.max(0, rating)) },
      { onConflict: "user_id,lesson_id" },
    );

    return error ? { success: false, message: error.message } : { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function enrollInCourse(courseId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("enrollments")
      .upsert({ user_id: user.id, course_id: courseId, status: "active" }, { onConflict: "user_id,course_id" });

    if (error) return { success: false, message: error.message };

    revalidatePath("/cursos");
    revalidatePath(`/courses/${courseId}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
