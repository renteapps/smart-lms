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
    .from("courses")
    .select(`
      id,
      title,
      category,
      cover_url,
      status,
      is_published,
      updated_at,
      modules(
        lessons(id)
      )
    `)
    .order('updated_at', { ascending: false });

  const courses: AdminCourseListItem[] = (coursesData || []).map((course) => {
    let lessonsCount = 0;
    if (course.modules) {
      lessonsCount = course.modules.reduce(
        (acc: number, mod: { lessons?: Array<{ id: string }> }) => acc + (mod.lessons?.length || 0),
        0,
      );
    }
    
    // Format date (e.g. 28 jul, 14:08)
    const date = course.updated_at ? new Date(course.updated_at) : new Date();
    const updatedStr = new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(date);

    const status: CourseStatus = (course.status as CourseStatus) || (course.is_published ? "Publicado" : "Rascunho");

    return {
      id: course.id,
      title: course.title,
      category: course.category || "Geral",
      coverUrl: course.cover_url || null,
      lessons: lessonsCount,
      status,
      updated: updatedStr
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
