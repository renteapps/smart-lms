import Link from "next/link";
import { buttonVariants } from "@heroui/styles";
import { EmptyState } from "@heroui/react/empty-state";
import LessonClientWrapper from "@/components/classroom/LessonClientWrapper";
import { getSessionUser } from "@/lib/supabase/auth";
import { getLessonWithCourse } from "@/lib/data/courses";
import { getLessonNote } from "@/lib/data/notes";
import { getProfileTests } from "@/lib/data/profileTests";
import { getLessonComments } from "@/lib/data/comments";

export default async function AulaPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const { supabase, user } = await getSessionUser();

  const result = await getLessonWithCourse(supabase, id, lessonId, user?.id);

  if (!result || result.course.status === "Arquivado") {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-24">
        <EmptyState>
          <p className="eyebrow">Erro 404</p>
          <h1 className="display-3 mt-3 text-foreground">Aula não encontrada</h1>
          <p className="lede mx-auto mt-3">
            Esta etapa pode ter sido removida do curso ou o endereço está incorreto.
          </p>
          <Link href={`/courses/${id}`} className={buttonVariants({ variant: "primary", className: "mt-8" })}>
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
        passingScore: data.passing_score
      };
    }
  }

  const note = user ? await getLessonNote(supabase, user.id, lesson.id) : null;

  return (
    <LessonClientWrapper
      lesson={lesson}
      course={course}
      courseId={course.id}
      profileTests={profileTests}
      initialNote={note}
      quiz={quiz}
    />
  );
}
