import Link from "next/link";
import { buttonVariants } from "@heroui/styles";
import { EmptyState } from "@heroui/react/empty-state";
import CourseOverviewClient from "@/components/classroom/CourseOverviewClient";
import { getSessionUser } from "@/lib/supabase/auth";
import { getCourseOutline } from "@/lib/data/courses";

/**
 * Capa do curso. Todo o cálculo (progresso, próxima aula) acontece no servidor;
 * a camada interativa vive em `CourseOverviewClient`.
 */
export default async function CourseOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();

  const course = await getCourseOutline(supabase, id, user?.id);

  if (!course || course.status === "Arquivado") {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-24">
        <EmptyState>
          <p className="eyebrow">Erro 404</p>
          <h1 className="display-3 mt-3 text-foreground">Curso não encontrado</h1>
          <p className="lede mx-auto mt-3">
            Este curso pode ter sido despublicado ou o endereço está incorreto.
          </p>
          <Link href="/cursos" className={buttonVariants({ variant: "primary", className: "mt-8" })}>
            Ver todos os cursos
          </Link>
        </EmptyState>
      </div>
    );
  }

  const allLessons = course.modules.flatMap((mod) => mod.lessons);
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((lesson) => lesson.isCompleted).length;
  const progressPercentage = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Primeira aula não concluída; se terminou tudo, volta para a primeira.
  const nextLesson = allLessons.find((lesson) => !lesson.isCompleted) ?? allLessons[0] ?? null;

  return (
    <CourseOverviewClient
      course={course}
      totalLessons={totalLessons}
      completedLessons={completedLessons}
      progressPercentage={progressPercentage}
      nextLesson={nextLesson}
    />
  );
}
