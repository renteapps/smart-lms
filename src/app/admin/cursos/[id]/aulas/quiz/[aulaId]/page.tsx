import { notFound } from "next/navigation";
import { Suspense } from "react";
import QuizBuilderForm from "./QuizBuilderForm";
import { requireAdmin } from "@/lib/supabase/auth";
import { getCourse } from "@/lib/data/courses";
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
  let initialLessonTitle = lesson?.title || undefined;

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
      };
    }
  }

  return (
    <Suspense fallback={<QuizBuilderSkeleton />}>
      <QuizBuilderForm
        courseId={id}
        aulaId={aulaId}
        moduleId={module || lesson?.moduleId || null}
        initialData={initialQuizData}
        initialLessonTitle={initialLessonTitle}
      />
    </Suspense>
  );
}

