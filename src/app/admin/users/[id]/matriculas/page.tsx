import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, MoreHorizontal, Plus } from "lucide-react";
import { Button, Card, EmptyState, Table } from "@heroui/react";
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
      enrolled_at,
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
      enrolledAt: new Date(enrollment.enrolled_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' }),
    };
  });

  const concludedCount = matriculas.filter(m => m.status === "Concluído").length;
  const activeCount = matriculas.filter(m => m.status === "Em andamento").length;

  const isEmpty = matriculas.length === 0;

  return (
    <div className="space-y-7 pb-16">
      <div>
        <Link
          href={`/admin/users/${id}`}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para o Perfil
        </Link>
        <PageHeader
          eyebrow="Aprendizagem"
          title="Matrículas"
          description="Acompanhe os cursos em que o usuário está inscrito e seu progresso."
          actions={
            <Button variant="primary" className="gap-2">
              <Plus className="size-4" aria-hidden="true" /> Nova matrícula
            </Button>
          }
        />
      </div>

      <Card>
        <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Card.Title>Cursos do aluno</Card.Title>
          <div className="flex items-center gap-2">
            {concludedCount > 0 && (
              <StatusBadge tone="positive">
                {concludedCount} concluído{concludedCount > 1 ? "s" : ""}
              </StatusBadge>
            )}
            {activeCount > 0 && <StatusBadge tone="primary">{activeCount} em andamento</StatusBadge>}
          </div>
        </Card.Header>

        <Card.Content className="px-0 pb-0">
          {isEmpty ? (
            <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                <BookOpen className="size-5 text-muted" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">Nenhuma matrícula encontrada</p>
              <p className="text-sm text-muted">Inscreva o aluno em um curso para começar a acompanhar o progresso.</p>
            </EmptyState>
          ) : (
            <>
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Matrículas do aluno">
                      <Table.Header>
                        <Table.Column isRowHeader>Curso</Table.Column>
                        <Table.Column>Categoria</Table.Column>
                        <Table.Column>Progresso</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>Inscrição</Table.Column>
                        <Table.Column><span className="sr-only">Ações</span></Table.Column>
                      </Table.Header>
                      <Table.Body items={matriculas}>
                        {(mat) => (
                          <Table.Row id={mat.id}>
                            <Table.Cell>
                              <Link
                                href={`/admin/cursos/${mat.id}`}
                                className="flex items-center gap-3 font-semibold text-foreground hover:text-accent"
                              >
                                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                                  <BookOpen className="size-4" aria-hidden="true" />
                                </span>
                                {mat.courseName}
                              </Link>
                            </Table.Cell>
                            <Table.Cell>{mat.category}</Table.Cell>
                            <Table.Cell className="font-semibold text-foreground">{mat.progress}</Table.Cell>
                            <Table.Cell>
                              <StatusBadge tone={mat.statusTone}>{mat.status}</StatusBadge>
                            </Table.Cell>
                            <Table.Cell className="text-muted">{mat.enrolledAt}</Table.Cell>
                            <Table.Cell>
                              <Button
                                isIconOnly
                                variant="ghost"
                                size="sm"
                                aria-label={`Ações da matrícula ${mat.courseName}`}
                              >
                                <MoreHorizontal className="size-4" aria-hidden="true" />
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              <ul className="divide-y divide-separator md:hidden">
                {matriculas.map((mat) => (
                  <li key={mat.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                        <BookOpen className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/cursos/${mat.id}`} className="block font-semibold leading-5 text-foreground">
                          {mat.courseName}
                        </Link>
                        <p className="mt-1 text-xs text-muted">{mat.category}</p>
                      </div>
                      <StatusBadge tone={mat.statusTone}>{mat.status}</StatusBadge>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
                      <span>Inscrito em {mat.enrolledAt.toLowerCase()}</span>
                      <span className="font-semibold text-foreground">{mat.progress} completo</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
