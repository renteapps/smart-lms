import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { Card, EmptyState, Label, SearchField, Table, buttonVariants } from "@heroui/react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

// Using a server component here so we fetch directly
export default async function AdminCursosList() {
  const supabase = await createClient();
  
  // Fetch courses with lesson counts
  const { data: coursesData, error } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      category,
      is_published,
      updated_at,
      modules(
        lessons(id)
      )
    `)
    .order('updated_at', { ascending: false });

  const courses = (coursesData || []).map(course => {
    let lessonsCount = 0;
    if (course.modules) {
      lessonsCount = course.modules.reduce((acc: number, mod: any) => acc + (mod.lessons?.length || 0), 0);
    }
    
    // Format date (e.g. 28 jul, 14:08)
    const date = course.updated_at ? new Date(course.updated_at) : new Date();
    const updatedStr = new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(date);

    return {
      id: course.id,
      title: course.title,
      category: course.category || "Geral",
      lessons: lessonsCount,
      status: course.is_published ? "Publicado" : "Rascunho",
      updated: updatedStr
    };
  });

  const isEmpty = courses.length === 0;
  const publicadosCount = courses.filter(c => c.status === "Publicado").length;
  const rascunhosCount = courses.length - publicadosCount;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Conteúdo"
        title="Cursos"
        description="Crie, organize e acompanhe todo o catálogo de aprendizagem."
        actions={
          <Link href="/admin/cursos/novo" className={cn(buttonVariants({ variant: "primary" }), "gap-2")}>
            <Plus className="size-4" aria-hidden="true" /> Novo curso
          </Link>
        }
      />

      <Card>
        <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md" aria-label="Buscar curso">
            {/* Minimal static search representation for SSR, would need client component for interactive search */}
            <input 
              type="text" 
              placeholder="Buscar curso..." 
              className="w-full px-3 py-2 rounded-md border border-separator bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              disabled
              title="A busca precisa ser implementada como client component"
            />
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone="positive">{publicadosCount} publicados</StatusBadge>
            <StatusBadge tone="warning">{rascunhosCount} rascunhos</StatusBadge>
          </div>
        </Card.Header>

        <Card.Content className="px-0 pb-0">
          {isEmpty ? (
            <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                <BookOpen className="size-5 text-muted" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">Nenhum curso no catálogo</p>
              <p className="text-sm text-muted">Crie o primeiro curso para começar a montar as trilhas.</p>
              <Link href="/admin/cursos/novo" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-2 gap-2")}>
                <Plus className="size-4" aria-hidden="true" /> Novo curso
              </Link>
            </EmptyState>
          ) : (
            <>
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Catálogo de cursos">
                      <Table.Header>
                        <Table.Column isRowHeader>Curso</Table.Column>
                        <Table.Column>Categoria</Table.Column>
                        <Table.Column>Aulas</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>Atualização</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {courses.map((course) => (
                          <Table.Row key={course.id} id={course.id}>
                            <Table.Cell>
                              <Link
                                href={`/admin/cursos/${course.id}`}
                                className="flex items-center gap-3 font-semibold text-foreground hover:text-accent"
                              >
                                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                                  <BookOpen className="size-4" aria-hidden="true" />
                                </span>
                                {course.title}
                              </Link>
                            </Table.Cell>
                            <Table.Cell>{course.category}</Table.Cell>
                            <Table.Cell>{course.lessons}</Table.Cell>
                            <Table.Cell>
                              <StatusBadge tone={course.status === "Publicado" ? "positive" : "warning"}>
                                {course.status}
                              </StatusBadge>
                            </Table.Cell>
                            <Table.Cell className="text-muted">{course.updated}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              <ul className="divide-y divide-separator md:hidden">
                {courses.map((course) => (
                  <li key={course.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                        <BookOpen className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/cursos/${course.id}`} className="block font-semibold leading-5 text-foreground">
                          {course.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted">
                          {course.category} · {course.lessons} aulas
                        </p>
                      </div>
                      <StatusBadge tone={course.status === "Publicado" ? "positive" : "warning"}>
                        {course.status}
                      </StatusBadge>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-xs text-muted">Atualizado {course.updated.toLowerCase()}</span>
                      <Link href={`/admin/cursos/${course.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                        Gerenciar
                      </Link>
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
