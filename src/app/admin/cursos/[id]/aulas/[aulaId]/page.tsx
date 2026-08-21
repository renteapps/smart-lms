import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";
import { getCourse } from "@/lib/data/courses";
import AulaAdminForm from "./AulaAdminForm";

export default async function AulaAdminPage({
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

  return (
    <AulaAdminForm
      courseId={id}
      aulaId={aulaId}
      moduleId={module || lesson?.moduleId || null}
      modules={course.modules}
      initialLesson={lesson}
      courseLayout={course.layout}
    />
  );
}
