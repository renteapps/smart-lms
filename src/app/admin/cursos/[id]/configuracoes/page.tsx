import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourseById } from "@/lib/data/courses";
import { CourseSettingsForm } from "./CourseSettingsForm";

export default async function AdminCursoConfiguracoesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const supabase = await createClient();
  const course = await getCourseById(supabase, id);

  if (!course) {
    notFound();
  }

  return <CourseSettingsForm course={course} />;
}
