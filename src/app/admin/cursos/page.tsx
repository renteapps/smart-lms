"use client";

import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { Card, EmptyState, Label, SearchField, Table, buttonVariants } from "@heroui/react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";

const mockCourses = [
  { id: "1", title: "Inteligência Emocional no Trabalho", category: "Comportamental", lessons: 15, status: "Publicado", updated: "Hoje, 09:42" },
  { id: "2", title: "Gestão de Tempo e Foco", category: "Produtividade", lessons: 12, status: "Publicado", updated: "Ontem, 17:20" },
  { id: "3", title: "Liderança por Influência", category: "Liderança", lessons: 20, status: "Rascunho", updated: "28 jul, 14:08" },
  { id: "4", title: "Feedback que Transforma", category: "Comunicação", lessons: 8, status: "Publicado", updated: "26 jul, 11:35" },
  { id: "5", title: "Negociação Ganha-Ganha", category: "Habilidades", lessons: 10, status: "Rascunho", updated: "24 jul, 16:02" },
];

export default function AdminCursosList() {
  const isEmpty = mockCourses.length === 0;

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
          <SearchField className="w-full sm:max-w-md" aria-label="Buscar curso">
            <Label className="sr-only">Buscar curso</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Buscar curso..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <div className="flex items-center gap-2">
            <StatusBadge tone="positive">24 publicados</StatusBadge>
            <StatusBadge tone="warning">3 rascunhos</StatusBadge>
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
                        {mockCourses.map((course) => (
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
                {mockCourses.map((course) => (
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
