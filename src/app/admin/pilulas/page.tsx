import { requireAdmin } from "@/lib/supabase/auth";
import { getPilulas } from "@/lib/data/pilulas";
import { listCoursesShallow } from "@/lib/data/courses";
import { getPublishedQuestionnaire } from "@/lib/data/trail";
import { AdminPilulasClient } from "./AdminPilulasClient";

export default async function AdminPilulasPage() {
  const { adminClient } = await requireAdmin();

  const [initialPilulas, courses, questionnaire] = await Promise.all([
    getPilulas(adminClient),
    listCoursesShallow(adminClient, true),
    getPublishedQuestionnaire(adminClient),
  ]);

  const shallowCourses = courses.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
  }));

  const availableTags = Array.from(
    new Set(
      (questionnaire?.questions || []).flatMap((q) =>
        q.options.flatMap((opt) => opt.tags || [])
      )
    )
  ).sort();

  return (
    <AdminPilulasClient
      initialPilulas={initialPilulas}
      courses={shallowCourses}
      availableTags={availableTags}
    />
  );
}
