import { PageHeader } from "@/components/ui/editorial";
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
      <PageHeader
        back={{ href: `/admin/cursos/${resolvedParams.id}`, label: "Voltar para o curso" }}
        eyebrow="Cursos"
        title="Gerenciar módulos e aulas"
        description="Organize o conteúdo do curso arrastando módulos e aulas. Adicione novos conteúdos conforme necessário."
        className="mb-8"
      />

      <ModuleList
        courseId={resolvedParams.id}
        initialCourse={course}
        lessonRatings={lessonRatings}
      />
    </div>
  );
}
