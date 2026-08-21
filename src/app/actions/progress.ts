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
    revalidatePath("/cursos");
    revalidatePath("/certificados");
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

    let correctCount = 0;
    const totalQuestions = quiz.questions.length;

    quiz.questions.forEach((q: any) => {
      const studentAnswer = answers[q.id];
      if (q.type === 'open_ended') {
        if (studentAnswer && (studentAnswer as string).trim().length > 0) {
          correctCount++;
        }
        return;
      }

      if (q.type === 'multiple_select') {
        const correctOptions = q.options.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.id);
        const studentAnswersArr = Array.isArray(studentAnswer) ? studentAnswer : [];
        const isExactMatch = 
          correctOptions.length === studentAnswersArr.length &&
          correctOptions.every((val: string) => studentAnswersArr.includes(val));
        
        if (isExactMatch) correctCount++;
        return;
      }

      const correctOption = q.options.find((opt: any) => opt.isCorrect);
      if (correctOption && studentAnswer === correctOption.id) {
        correctCount++;
      }
    });

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;
    const passed = score >= quiz.passing_score;

    const { error } = await supabase.from("quiz_results").insert({
      quiz_id: quizId,
      user_id: user.id,
      lesson_id: lessonId,
      score,
      answers,
      passed
    });

    if (error) {
      return { success: false, message: error.message };
    }

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
