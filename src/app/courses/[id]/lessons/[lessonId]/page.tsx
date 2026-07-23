import { MOCK_COURSE } from "@/lib/mockData";
import LessonClientWrapper from "@/components/classroom/LessonClientWrapper";

export default async function AulaPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const resolvedParams = await params;
  
  // Encontrar aula atual
  let currentLesson = null;
  for (const module of MOCK_COURSE.modules) {
    const lesson = module.lessons.find((l) => l.id === resolvedParams.lessonId);
    if (lesson) {
      currentLesson = lesson;
      break;
    }
  }

  if (!currentLesson) {
    return (
      <div className="flex items-center justify-center h-full">
        <h1 className="text-2xl font-bold text-text-soft">Aula não encontrada.</h1>
      </div>
    );
  }

  return <LessonClientWrapper lesson={currentLesson} courseId={resolvedParams.id} />;
}
