import { notFound } from "next/navigation";
import { Suspense } from "react";
import QuizBuilderForm from "./QuizBuilderForm";
import type { AiLessonOption } from "@/components/admin/quiz/CreateQuestionModal";
import { requireAdmin } from "@/lib/supabase/auth";
import { getCourse } from "@/lib/data/courses";
import { getOpenRouterServerConfig, getOpenRouterUnavailableReason } from "@/lib/openrouterService";
import { lessonSourceKinds } from "@/lib/quiz/aiQuestions";
import type { Quiz } from "@/types/quiz";

// Simple skeleton for loading
function QuizBuilderSkeleton() {
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />
    </div>
  );
}

export default async function QuizAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; aulaId: string }>;
  searchParams: Promise<{ module?: string }>;
}) {
  const { id, aulaId } = await params;
  const { module } = await searchParams;

  const { supabase } = await requireAdmin();
  const course = await getCourse(supabase, id);

  if (!course) {
    notFound();
  }

  const isNew = aulaId === "nova";
  const lesson = !isNew
    ? course.modules.flatMap((m) => m.lessons).find((l) => l.id === aulaId) || null
    : null;

  if (!isNew && !lesson) {
    notFound();
  }

  let initialQuizData: Quiz | undefined = undefined;
  const initialLessonTitle = lesson?.title || undefined;

  if (lesson?.quizId) {
    const { data: quiz } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", lesson.quizId)
      .maybeSingle();

    if (quiz) {
      initialQuizData = {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questions: Array.isArray(quiz.questions) ? quiz.questions : [],
        passingScore: quiz.passing_score ?? 70,
        feedbackMode: quiz.feedback_mode === "immediate" ? "immediate" : "end",
        shuffleQuestions: quiz.shuffle_questions ?? true,
      };
    }
  }

  /*
   * O material da geração por IA sai do curso que já foi carregado acima —
   * `COURSE_TREE_SELECT` traz transcrição, conteúdo e descrição de toda aula.
   * Só os metadados descem para o cliente: o texto é relido no servidor pela
   * própria action, a partir dos ids escolhidos.
   */
  const aiLessons: AiLessonOption[] = course.modules.flatMap((mod) =>
    mod.lessons
      .filter((item) => item.type !== "quiz" && item.id !== aulaId)
      .map((item) => ({
        id: item.id,
        moduleId: mod.id,
        moduleTitle: mod.title,
        title: item.title,
        sources: lessonSourceKinds({
          id: item.id,
          title: item.title,
          transcription: item.transcription,
          shortDescription: item.shortDescription,
          content: item.content,
          blocks: item.blocks,
        }),
      }))
      .filter((item) => item.sources.length > 0),
  );

  const openRouterConfig = await getOpenRouterServerConfig();

  return (
    <Suspense fallback={<QuizBuilderSkeleton />}>
      <QuizBuilderForm
        courseId={id}
        aulaId={aulaId}
        moduleId={module || lesson?.moduleId || null}
        initialData={initialQuizData}
        initialLessonTitle={initialLessonTitle}
        courseTitle={course.title}
        aiLessons={aiLessons}
        aiDefaultModel={openRouterConfig.defaultModel}
        aiEnabled={getOpenRouterUnavailableReason(openRouterConfig) === null}
      />
    </Suspense>
  );
}

