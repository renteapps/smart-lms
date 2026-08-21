import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GalleryLessonList from "@/components/admin/GalleryLessonList";
import { requireAdmin } from "@/lib/supabase/auth";
import { getCourse } from "@/lib/data/courses";

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
  const course = await getCourse(supabase, resolvedParams.id);

  if (!course) notFound();
  // Curso por módulos não tem essa tela — a rota certa dele é `/modulos`.
  if (course.layout !== "gallery") redirect(`/admin/cursos/${resolvedParams.id}/modulos`);

  const galleryModule = course.modules[0] ?? null;

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
        <h1 className="text-3xl font-display font-bold">Gerenciar Aulas</h1>
        <p className="text-muted mt-2">
          Curso galeria: uma coleção de aulas avulsas, sem módulos. A ordem daqui define a galeria em
          <code className="mx-1 rounded bg-background-secondary px-1.5 py-0.5 text-sm">/courses/{course.slug || course.id}</code>
          e as 8 mais recentes do carrossel da home, quando ativado.
        </p>
      </div>

      {galleryModule ? (
        <GalleryLessonList
          courseId={resolvedParams.id}
          moduleId={galleryModule.id}
          initialLessons={galleryModule.lessons}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-background-secondary p-10 text-center text-sm text-muted">
          Não foi possível localizar a coleção de aulas deste curso. Contate o suporte.
        </div>
      )}
    </div>
  );
}
