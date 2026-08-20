import { Suspense } from "react";
import QuizBuilderForm from "./QuizBuilderForm";
import { createClient } from "@/lib/supabase/server";
import { getCourse } from "@/lib/data/courses";

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
  params: { id: string; aulaId: string };
  searchParams: { module?: string };
}) {
  const supabase = await createClient();
  const course = await getCourse(supabase, params.id);
  
  let initialQuizData = undefined;
  let initialLessonTitle = undefined;
  
  if (params.aulaId !== "nova" && course) {
    const lesson = course.modules
      .flatMap(m => m.lessons)
      .find(l => l.id === params.aulaId);
      
    if (lesson && lesson.quizId) {
      initialLessonTitle = lesson.title;
      const { data: quiz } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", lesson.quizId)
        .single();
        
      if (quiz) {
        initialQuizData = {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          questions: quiz.questions,
          passingScore: quiz.passing_score
        };
      }
    }
  }

  return (
    <Suspense fallback={<QuizBuilderSkeleton />}>
      <QuizBuilderForm 
        courseId={params.id} 
        aulaId={params.aulaId} 
        moduleId={searchParams.module || null}
        initialData={initialQuizData}
        initialLessonTitle={initialLessonTitle}
      />
    </Suspense>
  );
}
