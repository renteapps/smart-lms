import type { Metadata } from "next";
import CoursesCatalogClient from "@/components/courses/CoursesCatalogClient";
import { getSessionUser } from "@/lib/supabase/auth";
import { getCatalogCourses } from "@/lib/data/courses";
import { getLearningTrail, getPublishedQuestionnaire } from "@/lib/data/trail";

export const metadata: Metadata = {
  title: "Cursos | Smart LMS",
  description: "Catálogo de cursos, ordenado pela sua afinidade.",
};

export default async function CoursesPage() {
  const { supabase, user } = await getSessionUser();

  const [courses, trail, questionnaire] = await Promise.all([
    getCatalogCourses(supabase, user?.id),
    user ? getLearningTrail(supabase, user.id) : Promise.resolve(null),
    getPublishedQuestionnaire(supabase),
  ]);

  return <CoursesCatalogClient courses={courses} trail={trail} questionnaire={questionnaire} />;
}
