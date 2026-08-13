import Link from "next/link";
import { buttonVariants } from "@heroui/styles";
import { EmptyState } from "@heroui/react/empty-state";
import { MOCK_COURSE } from "@/lib/mockData";
import LessonClientWrapper from "@/components/classroom/LessonClientWrapper";

export default async function AulaPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const resolvedParams = await params;

  // Encontrar aula atual
  let currentLesson = null;
  for (const courseModule of MOCK_COURSE.modules) {
    const lesson = courseModule.lessons.find((l) => l.id === resolvedParams.lessonId);
    if (lesson) {
      currentLesson = lesson;
      break;
    }
  }

  if (!currentLesson) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-24">
        <EmptyState>
          <p className="eyebrow">Erro 404</p>
          <h1 className="display-3 mt-3 text-foreground">Aula não encontrada</h1>
          <p className="lede mx-auto mt-3">
            Esta etapa pode ter sido removida do curso ou o endereço está incorreto.
          </p>
          <Link
            href={`/courses/${resolvedParams.id}`}
            className={buttonVariants({ variant: "primary", className: "mt-8" })}
          >
            Voltar ao curso
          </Link>
        </EmptyState>
      </div>
    );
  }

  return <LessonClientWrapper lesson={currentLesson} courseId={resolvedParams.id} />;
}
