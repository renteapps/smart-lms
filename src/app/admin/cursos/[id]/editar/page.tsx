import { createClient } from "@/lib/supabase/server";
import { getCourseById } from "@/lib/data/courses";
import { notFound } from "next/navigation";
import { CourseEditForm } from "./CourseEditForm";
import { getCategories, getTags } from "@/app/actions/admin/categories";

export default async function AdminCursoEditarPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  const supabase = await createClient();
  const course = await getCourseById(supabase, id);

  if (!course) {
    notFound();
  }
  
  const categories = await getCategories();
  const tags = await getTags();

  return <CourseEditForm course={course} categories={categories} tagsOptions={tags} />;
}
