import { AlertCircle } from "lucide-react";
import { Card } from "@heroui/react/card";
import { AdminEmptyState, PageHeader } from "@/components/ui/editorial";
import { notFound, redirect } from "next/navigation";
import GalleryLessonList from "@/components/admin/GalleryLessonList";
import { requireAdmin } from "@/lib/supabase/auth";
import { getCourse } from "@/lib/data/courses";
import { getLessonRatingSummaries } from "@/lib/data/courseRatings";

/**
 * Gestão de aulas do curso galeria — a versão sem módulos de `/modulos`.
 *
 * O curso galeria sempre tem exatamente um módulo (criado pela migration
 * `gallery_courses` no momento em que o curso nasce); é só a caixa que guarda
 * as aulas no banco, então esta tela nem mostra a lista de módulos: ela pega o
 * único que existe e trabalha direto com as aulas dentro dele.
 */
export default async function AulasGaleriaAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { supabase } = await requireAdmin();
  const [course, lessonRatings] = await Promise.all([
    getCourse(supabase, resolvedParams.id),
    getLessonRatingSummaries(supabase, resolvedParams.id),
  ]);

  if (!course) notFound();
  // Curso por módulos não tem essa tela — a rota certa dele é `/modulos`.
  if (course.layout !== "gallery") redirect(`/admin/cursos/${resolvedParams.id}/modulos`);

  const galleryModule = course.modules[0] ?? null;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <PageHeader
        back={{ href: `/admin/cursos/${resolvedParams.id}`, label: "Voltar para o curso" }}
        eyebrow="Cursos"
        title="Gerenciar aulas"
        description={
          <>
            Curso galeria: uma coleção de aulas avulsas, sem módulos. A ordem daqui define a galeria em{" "}
            <strong className="text-foreground">{course.title}</strong> e as 8 primeiras aparecem em destaque no
            carrossel do topo, quando ativado.
          </>
        }
        className="mb-8"
      />

      {galleryModule ? (
        <GalleryLessonList
          courseId={resolvedParams.id}
          moduleId={galleryModule.id}
          initialLessons={galleryModule.lessons}
          lessonRatings={lessonRatings}
        />
      ) : (
        <Card>
          <AdminEmptyState
            icon={AlertCircle}
            title="Coleção de aulas não encontrada"
            description="Não foi possível localizar a coleção de aulas deste curso. Contate o suporte."
          />
        </Card>
      )}
    </div>
  );
}
