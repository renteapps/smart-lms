import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ModuleList from "@/components/admin/ModuleList";
import { requireAdmin } from "@/lib/supabase/auth";
import { getCourse } from "@/lib/data/courses";
import { getLessonRatingSummaries } from "@/lib/data/courseRatings";

export default async function ModulosAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { supabase } = await requireAdmin();
  const [course, lessonRatings] = await Promise.all([
    getCourse(supabase, resolvedParams.id),
    getLessonRatingSummaries(supabase, resolvedParams.id),
  ]);

  if (!course) notFound();
  
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <Link 
          href={`/admin/cursos/${resolvedParams.id}`} 
          className="inline-flex items-center gap-2 text-muted hover:text-accent transition-colors text-sm font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Curso
        </Link>
        <h1 className="text-3xl font-display font-bold">Gerenciar Módulos e Aulas</h1>
        <p className="text-muted mt-2">
          Organize o conteúdo do curso arrastando módulos e aulas. Adicione novos conteúdos conforme necessário.
        </p>
      </div>

      <ModuleList
        courseId={resolvedParams.id}
        initialCourse={course}
        lessonRatings={lessonRatings}
      />
    </div>
  );
}
