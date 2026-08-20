import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourseById } from "@/lib/data/courses";
import { CourseSalesForm } from "./CourseSalesForm";

export default async function AdminCursoVendasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const supabase = await createClient();
  const course = await getCourseById(supabase, id);

  if (!course) {
    notFound();
  }

  return <CourseSalesForm course={course} />;
}
