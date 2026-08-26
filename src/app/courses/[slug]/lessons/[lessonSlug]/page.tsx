import Link from "next/link";
import { buttonVariants } from "@heroui/styles";
import { EmptyState } from "@heroui/react/empty-state";
import LessonClientWrapper from "@/components/classroom/LessonClientWrapper";
import { getSessionUser } from "@/lib/supabase/auth";
import { getLessonWithCourse } from "@/lib/data/courses";
import { getLessonNote } from "@/lib/data/notes";
import { getProfileTests } from "@/lib/data/profileTests";
import { getLessonComments } from "@/lib/data/comments";
import type { QuizDraft, QuizFeedbackMode } from "@/types/quiz";

export default async function AulaPage({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>;
}) {
  const { slug, lessonSlug } = await params;
  const { supabase, user } = await getSessionUser();

  const result = await getLessonWithCourse(supabase, slug, lessonSlug, user?.id);

  if (!result || result.course.status === "Arquivado") {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-24">
        <EmptyState>
          <p className="eyebrow">Erro 404</p>
          <h1 className="display-3 mt-3 text-foreground">Aula não encontrada</h1>
          <p className="lede mx-auto mt-3">
            Esta etapa pode ter sido removida do curso ou o endereço está incorreto.
          </p>
          <Link href={`/courses/${slug}`} className={buttonVariants({ variant: "primary", className: "mt-8" })}>
            Voltar ao curso
          </Link>
        </EmptyState>
      </div>
    );
  }

  const { course, lesson } = result;

  // Só a aula de diagnóstico precisa do catálogo de testes.
  const profileTests =
    lesson.type === "profile_test" ? await getProfileTests(supabase, true) : [];
    
  let quiz = null;
  let previousQuizResult = null;
  let quizDraft: QuizDraft | null = null;
  if (lesson.type === "quiz" && lesson.quizId) {
    const { data } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", lesson.quizId)
      .single();
    if (data) {
      quiz = {
        id: data.id,
        title: data.title,
        description: data.description,
        questions: data.questions,
        passingScore: data.passing_score,
        feedbackMode: (data.feedback_mode === "immediate" ? "immediate" : "end") as QuizFeedbackMode,
        shuffleQuestions: data.shuffle_questions ?? true
      };
    }

    if (quiz && user) {
      const [{ data: resultRow }, { data: draftRow }] = await Promise.all([
        supabase
          .from("quiz_results")
          .select("*")
          .eq("quiz_id", quiz.id)
          .eq("lesson_id", lesson.id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("quiz_drafts")
          .select("*")
          .eq("quiz_id", quiz.id)
          .eq("lesson_id", lesson.id)
          .eq("user_id", user.id)
          .maybeSingle()
      ]);
      if (resultRow) {
        previousQuizResult = {
          id: resultRow.id,
          quizId: resultRow.quiz_id,
          userId: resultRow.user_id,
          lessonId: resultRow.lesson_id,
          score: resultRow.score,
          answers: resultRow.answers,
          passed: resultRow.passed,
          createdAt: resultRow.created_at
        };
      }
      if (draftRow) {
        quizDraft = {
          answers: draftRow.answers ?? {},
          currentQuestionIndex: draftRow.current_question_index ?? 0,
          shuffleSeed: draftRow.shuffle_seed ?? 0
        };
      }
    }
  }

  const [note, comments] = await Promise.all([
    user ? getLessonNote(supabase, user.id, lesson.id) : null,
    getLessonComments(supabase, lesson.id),
  ]);

  return (
    <LessonClientWrapper
      lesson={lesson}
      course={course}
      courseId={course.slug || course.id}
      profileTests={profileTests}
      initialNote={note}
      quiz={quiz}
      previousQuizResult={previousQuizResult}
      quizDraft={quizDraft}
      initialComments={comments}
      currentUser={user}
    />
  );
}
