import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, MoreHorizontal, Plus } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { createClient } from "@/lib/supabase/server";
import { getProgressByCourse } from "@/lib/data/courses";

export default async function AdminUserMatriculasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select(`
      status,
      created_at,
      course_id,
      course:courses (
        id,
        title,
        category
      )
    `)
    .eq("user_id", id);

  if (error) {
    console.error(error);
    notFound();
  }

  const progressByCourse = await getProgressByCourse(supabase, id);

  const matriculas = (enrollments ?? []).map((enrollment) => {
    // Tratando array no relation
    const c = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
    const progress = progressByCourse.get(c?.id || "") ?? 0;
    
    // Status
    let displayStatus = "Não iniciado";
    let statusTone: "positive" | "primary" | "neutral" = "neutral";
    if (progress === 100 || enrollment.status === "completed") {
      displayStatus = "Concluído";
      statusTone = "positive";
    } else if (progress > 0 || enrollment.status === "active") {
      displayStatus = "Em andamento";
      statusTone = "primary";
    }

    return {
      id: c?.id || enrollment.course_id,
      courseName: c?.title || "Curso Removido",
      category: c?.category || "N/A",
      progress: `${progress}%`,
      status: displayStatus,
      statusTone,
      enrolledAt: new Date(enrollment.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' }),
    };
  });

  const concludedCount = matriculas.filter(m => m.status === "Concluído").length;
  const activeCount = matriculas.filter(m => m.status === "Em andamento").length;

  return (
    <div className="space-y-7 pb-16">
      <div>
        <Link href={`/admin/users/${id}`} className="inline-flex items-center gap-2 text-text-soft hover:text-primary transition-colors text-sm font-medium mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Perfil
        </Link>
        <PageHeader 
          eyebrow="Aprendizagem" 
          title="Matrículas" 
          description="Acompanhe os cursos em que o usuário está inscrito e seu progresso."
          actions={<button className="inline-flex min-h-11 items-center gap-2 rounded-[11px] bg-primary px-4 text-sm font-bold text-on-primary shadow-sm hover:bg-primary-active"><Plus className="h-4 w-4" /> Nova matrícula</button>}
        />
      </div>

      <section className="editorial-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <h2 className="font-bold text-ink text-lg">Cursos do Aluno</h2>
          <div className="flex items-center gap-2 text-xs font-semibold text-text-mute">
            {concludedCount > 0 && <StatusBadge tone="positive">{concludedCount} concluído{concludedCount > 1 ? 's' : ''}</StatusBadge>}
            {activeCount > 0 && <StatusBadge tone="primary">{activeCount} em andamento</StatusBadge>}
          </div>
        </div>

        <div className="hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-canvas-soft/75 text-[11px] font-bold uppercase tracking-[0.09em] text-text-mute">
                <th className="px-5 py-3.5">Curso</th>
                <th className="px-5 py-3.5">Categoria</th>
                <th className="px-5 py-3.5">Progresso</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Data de Inscrição</th>
                <th className="w-16 px-5 py-3.5"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {matriculas.map((mat) => (
                <tr key={mat.id} className="border-t border-border/70 hover:bg-primary-pale/20">
                  <td className="px-5 py-4">
                    <Link href={`/admin/cursos/${mat.id}`} className="flex items-center gap-3 font-bold text-ink hover:text-primary-active">
                      <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-primary-pale text-primary">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      {mat.courseName}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-sm text-text-soft">{mat.category}</td>
                  <td className="px-5 py-4 text-sm font-bold text-ink">{mat.progress}</td>
                  <td className="px-5 py-4">
                    <StatusBadge tone={mat.statusTone}>
                      {mat.status}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-4 text-xs font-medium text-text-mute">{mat.enrolledAt}</td>
                  <td className="px-5 py-4">
                    <button aria-label={`Ações da matrícula ${mat.courseName}`} className="grid h-10 w-10 place-items-center rounded-[10px] text-text-mute hover:bg-surface-hover hover:text-ink">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {matriculas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-text-mute">
                    Nenhuma matrícula encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {matriculas.map((mat) => (
            <article key={mat.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-primary-pale text-primary">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/cursos/${mat.id}`} className="font-bold leading-5 text-ink hover:text-primary-active block">
                    {mat.courseName}
                  </Link>
                  <p className="mt-1 text-xs text-text-mute">{mat.category}</p>
                </div>
                <StatusBadge tone={mat.statusTone}>
                  {mat.status}
                </StatusBadge>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs font-medium text-text-mute">
                <span>Inscrito em {mat.enrolledAt.toLowerCase()}</span>
                <span className="font-bold text-ink">{mat.progress} completo</span>
              </div>
            </article>
          ))}
          {matriculas.length === 0 && (
            <div className="p-8 text-center text-sm text-text-mute">
              Nenhuma matrícula encontrada.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
