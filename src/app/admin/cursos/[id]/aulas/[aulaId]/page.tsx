import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";
import { getCourse } from "@/lib/data/courses";
import AulaAdminForm from "./AulaAdminForm";
import { getPersonalizedLessonAdminData } from "@/lib/personalizedLessons";

export default async function AulaAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; aulaId: string }>;
  searchParams: Promise<{ module?: string }>;
}) {
  const { id, aulaId } = await params;
  const { module } = await searchParams;

  const { adminClient } = await requireAdmin();
  const course = await getCourse(adminClient, id);

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

  const personalizedData = lesson?.type === "personalized_ai"
    ? await getPersonalizedLessonAdminData(adminClient, lesson.id)
    : null;

  return (
    <AulaAdminForm
      courseId={id}
      aulaId={aulaId}
      moduleId={module || lesson?.moduleId || null}
      modules={course.modules}
      initialLesson={lesson}
      courseLayout={course.layout}
      personalizedData={personalizedData}
    />
  );
}
