"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import { computeQuizScore } from "@/lib/quiz/grading";
import type { QuizQuestion } from "@/types/quiz";

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

    if (courseId) revalidatePath("/courses/[slug]", "page");
    revalidatePath("/courses/[slug]/lessons/[lessonSlug]", "page");
    revalidatePath("/cursos");
    revalidatePath("/certificados");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Onde o vídeo parou — chamado com throttle pelo player (a cada ~10s de
 * avanço, não a cada `timeupdate`). Só grava `last_watched_second`: o upsert
 * não inclui `is_completed`, então uma aula já concluída que o aluno reabre
 * para rever não perde a marcação.
 */
export async function saveWatchPosition(lessonId: string, second: number): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        last_watched_second: Math.max(0, Math.floor(second)),
      },
      { onConflict: "user_id,lesson_id" },
    );

    if (error) return { success: false, message: error.message };

    return { success: true };
  } catch (error) {
    console.error("Falha ao salvar progresso de vídeo", error);
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

    if (error) return { success: false, message: error.message };

    revalidatePath("/courses/[slug]/lessons/[lessonSlug]", "page");
    return { success: true };
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
    revalidatePath("/courses/[slug]", "page");
    revalidatePath("/courses/[slug]/lessons/[lessonSlug]", "page");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function submitQuizResult(
  quizId: string,
  lessonId: string,
  answers: Record<string, unknown>
): Promise<{ success: boolean; data?: { score: number; passed: boolean }; message?: string }> {
  try {
    const { supabase, user } = await requireUser();

    // Fetch quiz to calculate score
    const { data: quiz } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single();

    if (!quiz) {
      return { success: false, message: "Quiz não encontrado." };
    }

    const { score, passed } = computeQuizScore(
      quiz.questions as QuizQuestion[],
      answers,
      quiz.passing_score
    );

    const { error } = await supabase.from("quiz_results").upsert(
      {
        quiz_id: quizId,
        user_id: user.id,
        lesson_id: lessonId,
        score,
        answers,
        passed
      },
      { onConflict: "quiz_id,lesson_id,user_id" }
    );

    if (error) {
      return { success: false, message: error.message };
    }

    // O rascunho salvo automaticamente não serve mais para nada depois do envio.
    await supabase
      .from("quiz_drafts")
      .delete()
      .eq("quiz_id", quizId)
      .eq("lesson_id", lessonId)
      .eq("user_id", user.id);

    if (passed) {
      await supabase.from("lesson_progress").upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          is_completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" }
      );
      revalidatePath("/cursos");
      revalidatePath("/certificados");
      revalidatePath("/");
    }

    return { success: true, data: { score, passed } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Salva o progresso do quiz em andamento (debounced pelo QuizRunner), pra
 * retomar de onde parou se o aluno sair no meio. Um upsert por
 * (quiz, aula, aluno) — igual ao padrão de lesson_progress/quiz_results.
 * Silencioso de propósito: falha aqui não deve interromper o aluno respondendo.
 */
export async function saveQuizDraft(
  quizId: string,
  lessonId: string,
  answers: Record<string, unknown>,
  currentQuestionIndex: number,
  shuffleSeed: number
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("quiz_drafts").upsert(
      {
        quiz_id: quizId,
        lesson_id: lessonId,
        user_id: user.id,
        answers,
        current_question_index: Math.max(0, currentQuestionIndex),
        shuffle_seed: shuffleSeed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "quiz_id,lesson_id,user_id" }
    );

    if (error) return { success: false, message: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Descarta o rascunho salvo — chamado ao confirmar "Refazer Quiz" pra começar do zero. */
export async function clearQuizDraft(quizId: string, lessonId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("quiz_drafts")
      .delete()
      .eq("quiz_id", quizId)
      .eq("lesson_id", lessonId)
      .eq("user_id", user.id);

    if (error) return { success: false, message: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
