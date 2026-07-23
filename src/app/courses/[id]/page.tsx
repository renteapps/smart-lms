import { MOCK_COURSE } from "@/lib/mockData";
import Link from "next/link";
import CourseOverviewClient from "@/components/classroom/CourseOverviewClient";

export default async function CourseOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  // No mundo real, buscaríamos o curso pelo resolvedParams.id
  const course = MOCK_COURSE;

  // Cálculos de progresso
  const totalLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
  const completedLessons = course.modules.reduce((acc, mod) => {
    return acc + mod.lessons.filter(l => l.isCompleted).length;
  }, 0);
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  
  // Pegar a primeira aula não concluída, ou a primeira do curso se for novo
  let nextLesson = null;
  for (const module of course.modules) {
    const uncompletedLesson = module.lessons.find((l) => !l.isCompleted);
    if (uncompletedLesson) {
      nextLesson = uncompletedLesson;
      break;
    }
  }
  // Se terminou tudo, sugere a primeira (ou apenas o link pro início)
  if (!nextLesson && course.modules.length > 0 && course.modules[0].lessons.length > 0) {
    nextLesson = course.modules[0].lessons[0];
  }

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
