"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Archive, ArchiveRestore, BookOpen, Plus } from "lucide-react";
import { Button, Card, EmptyState, Label, SearchField, Table, buttonVariants } from "@heroui/react";
import { StatusBadge } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";
import type { CourseStatus } from "@/types/course";

export type AdminCourseListItem = {
  id: string;
  title: string;
  category: string;
  coverUrl: string | null;
  lessons: number;
  status: CourseStatus;
  updated: string;
};

export function AdminCursosClient({
  initialCourses,
}: {
  initialCourses: AdminCourseListItem[];
}) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const totalPublicados = useMemo(
    () => initialCourses.filter((c) => c.status === "Publicado").length,
    [initialCourses],
  );
  const totalRascunhos = useMemo(
    () => initialCourses.filter((c) => c.status === "Rascunho").length,
    [initialCourses],
  );
  const totalArquivados = useMemo(
    () => initialCourses.filter((c) => c.status === "Arquivado").length,
    [initialCourses],
  );

  const filteredCourses = useMemo(() => {
    return initialCourses.filter((course) => {
      // Hide archived unless showArchived is true
      if (!showArchived && course.status === "Arquivado") {
        return false;
      }

      if (!query.trim()) return true;

      const q = query.trim().toLowerCase();
      return (
        course.title.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q)
      );
    });
  }, [initialCourses, showArchived, query]);

  const isEmpty = filteredCourses.length === 0;

  const toneForStatus = (status: CourseStatus) => {
    switch (status) {
      case "Publicado":
        return "positive" as const;
      case "Rascunho":
        return "warning" as const;
      case "Arquivado":
        return "neutral" as const;
      default:
        return "neutral" as const;
    }
  };

  return (
    <Card>
      <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <SearchField
            value={query}
            onChange={setQuery}
            onClear={() => setQuery("")}
            className="w-full"
            aria-label="Buscar curso"
          >
            <Label className="sr-only">Buscar curso</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Buscar curso por título ou categoria..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="positive">{totalPublicados} publicados</StatusBadge>
          <StatusBadge tone="warning">{totalRascunhos} rascunhos</StatusBadge>
          {totalArquivados > 0 && (
            <StatusBadge tone="neutral">{totalArquivados} arquivados</StatusBadge>
          )}

          {totalArquivados > 0 && (
            <Button
              variant={showArchived ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowArchived((prev) => !prev)}
              className="gap-1.5 ml-1 text-xs"
            >
              {showArchived ? (
                <>
                  <ArchiveRestore className="size-3.5" aria-hidden="true" />
                  Ocultar arquivados
                </>
              ) : (
                <>
                  <Archive className="size-3.5" aria-hidden="true" />
                  Mostrar arquivados ({totalArquivados})
                </>
              )}
            </Button>
          )}
        </div>
      </Card.Header>

      <Card.Content className="px-0 pb-0">
        {isEmpty ? (
          <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
              <BookOpen className="size-5 text-muted" aria-hidden="true" />
            </span>
            <p className="font-semibold text-foreground">
              {query
                ? `Nenhum curso encontrado para "${query}"`
                : totalArquivados > 0 && !showArchived
                  ? "Nenhum curso ativo no catálogo"
                  : "Nenhum curso no catálogo"}
            </p>
            <p className="text-sm text-muted max-w-sm">
              {query
                ? "Tente outro termo ou limpe a busca."
                : totalArquivados > 0 && !showArchived
                  ? `Existem ${totalArquivados} curso(s) arquivado(s). Clique no botão acima para exibi-los ou crie um novo curso.`
                  : "Crie o primeiro curso para começar a montar as trilhas."}
            </p>
            <div className="mt-3 flex items-center gap-3">
              {totalArquivados > 0 && !showArchived && !query && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowArchived(true)}
                  className="gap-2"
                >
                  <Archive className="size-4" aria-hidden="true" />
                  Ver cursos arquivados
                </Button>
              )}
              <Link
                href="/admin/cursos/novo"
                className={cn(buttonVariants({ variant: "primary", size: "sm" }), "gap-2")}
              >
                <Plus className="size-4" aria-hidden="true" /> Novo curso
              </Link>
            </div>
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
                      {filteredCourses.map((course) => (
                        <Table.Row key={course.id} id={course.id}>
                          <Table.Cell>
                            <Link
                              href={`/admin/cursos/${course.id}`}
                              className="flex items-center gap-3 font-semibold text-foreground hover:text-accent"
                            >
                              {course.coverUrl ? (
                                <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-background-secondary">
                                  <img
                                    src={course.coverUrl}
                                    alt=""
                                    className="size-full object-cover"
                                  />
                                </div>
                              ) : (
                                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                                  <BookOpen className="size-4" aria-hidden="true" />
                                </span>
                              )}
                              <span className="line-clamp-1">{course.title}</span>
                            </Link>
                          </Table.Cell>
                          <Table.Cell>{course.category}</Table.Cell>
                          <Table.Cell>{course.lessons}</Table.Cell>
                          <Table.Cell>
                            <StatusBadge tone={toneForStatus(course.status)}>
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
              {filteredCourses.map((course) => (
                <li key={course.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {course.coverUrl ? (
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-background-secondary">
                        <img
                          src={course.coverUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      </div>
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                        <BookOpen className="size-4" aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/cursos/${course.id}`} className="block font-semibold leading-5 text-foreground">
                        {course.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {course.category} · {course.lessons} aulas
                      </p>
                    </div>
                    <StatusBadge tone={toneForStatus(course.status)}>
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
  );
}
