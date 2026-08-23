import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { AdminCursosClient, type AdminCourseListItem } from "./AdminCursosClient";
import type { CourseStatus } from "@/types/course";

export default async function AdminCursosList() {
  const supabase = await createClient();

  // Fetch courses with lesson counts and status
  const { data: coursesData } = await supabase
    .from("v_course_metrics")
    .select(`
      id,
      title,
      category,
      cover_url,
      status,
      is_published,
      updated_at,
      lesson_count,
      order_index,
      is_featured
    `)
    .order('order_index', { ascending: true })
    .order('updated_at', { ascending: false });

  const courses: AdminCourseListItem[] = (coursesData || []).map((course) => {
    // Format date (e.g. 28 jul, 14:08)
    const date = course.updated_at ? new Date(course.updated_at) : new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', { 
      day: 'numeric', 
      month: 'short', 
      hour: 'numeric', 
      minute: 'numeric' 
    }).format(date);

    return {
      id: course.id,
      title: course.title,
      category: course.category || "Geral",
      coverUrl: course.cover_url || null,
      lessons: course.lesson_count || 0,
      status: (course.status as CourseStatus) || (course.is_published ? "Publicado" : "Rascunho"),
      updated: formattedDate,
      orderIndex: course.order_index || 0,
      isFeatured: course.is_featured || false,
    };
  });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Conteúdo"
        title="Cursos"
        description="Crie, organize e acompanhe todo o catálogo de aprendizagem."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/cursos/categorias" className={buttonVariants({ variant: "secondary" })}>
              Gerenciar Categorias
            </Link>
            <Link href="/admin/cursos/novo" className={cn(buttonVariants({ variant: "primary" }), "gap-2")}>
              <Plus className="size-4" aria-hidden="true" /> Novo curso
            </Link>
          </div>
        }
      />

      <AdminCursosClient initialCourses={courses} />
    </div>
  );
}
