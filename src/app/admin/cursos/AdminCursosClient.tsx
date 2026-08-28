"use client";

import Link from "next/link";
import { useState, useMemo, useTransition } from "react";
import {
  Archive,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  GripVertical,
  Pencil,
  PlayCircle,
  Plus,
  Star,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Label,
  SearchField,
  Table,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  buttonVariants,
} from "@heroui/react";
import { StatCard, StatusBadge } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";
import type { CourseStatus } from "@/types/course";
import { updateCoursesOrderBulk, toggleCourseFeatured } from "./actions";
import { toast } from "sonner";
import { RatingSummary } from "@/components/admin/RatingSummary";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type AdminCourseListItem = {
  id: string;
  title: string;
  category: string;
  coverUrl: string | null;
  lessons: number;
  status: CourseStatus;
  updated: string;
  orderIndex: number;
  isFeatured: boolean;
  averageRating: number | null;
  ratingsCount: number;
};

type StatusFilter = "ativos" | CourseStatus;
type Mode = "catalog" | "reorder";

type StatusTone = "positive" | "warning" | "neutral";

const toneForStatus = (status: CourseStatus): StatusTone => {
  switch (status) {
    case "Publicado":
      return "positive";
    case "Rascunho":
      return "warning";
    case "Arquivado":
      return "neutral";
    default:
      return "neutral";
  }
};

function CourseCover({ coverUrl, className }: { coverUrl: string | null; className?: string }) {
  if (coverUrl) {
    return (
      <div className={cn("relative shrink-0 overflow-hidden rounded-lg bg-background-secondary", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt="" className="size-full object-cover" />
      </div>
    );
  }
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground",
        className,
      )}
    >
      <BookOpen className="size-4" aria-hidden="true" />
    </span>
  );
}

function FeaturedToggle({
  course,
  onToggle,
}: {
  course: AdminCourseListItem;
  onToggle: (id: string, current: boolean) => void;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger>
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          onClick={() => onToggle(course.id, course.isFeatured)}
          aria-label={course.isFeatured ? `Remover destaque de ${course.title}` : `Destacar ${course.title}`}
        >
          <Star
            className={cn("size-4", course.isFeatured ? "fill-warning text-warning" : "text-muted")}
            aria-hidden="true"
          />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>{course.isFeatured ? "Remover destaque" : "Destacar na home"}</Tooltip.Content>
    </Tooltip.Root>
  );
}

function SortableCourseRow({
  course,
  onToggleFeatured,
}: {
  course: AdminCourseListItem;
  onToggleFeatured: (id: string, current: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: course.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-3 bg-surface px-4 py-3 sm:flex-row sm:items-center",
        isDragging && "rounded-lg border border-hairline-strong shadow-elev-3",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none rounded-md p-1 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground active:cursor-grabbing"
          aria-label={`Reordenar ${course.title}`}
        >
          <GripVertical className="size-5" aria-hidden="true" />
        </button>

        <CourseCover coverUrl={course.coverUrl} className="size-10" />

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-5 text-foreground">{course.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span>{course.category}</span>
            <span aria-hidden="true">·</span>
            <span>{course.lessons} aulas</span>
            <span aria-hidden="true">·</span>
            <RatingSummary averageRating={course.averageRating} ratingsCount={course.ratingsCount} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <FeaturedToggle course={course} onToggle={onToggleFeatured} />
        <StatusBadge tone={toneForStatus(course.status)}>{course.status}</StatusBadge>
        <span className="hidden text-xs text-muted lg:inline">Atualizado {course.updated.toLowerCase()}</span>
        <Link
          href={`/admin/cursos/${course.id}`}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "gap-1.5")}
        >
          Gerenciar
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function AdminCursosClient({ initialCourses }: { initialCourses: AdminCourseListItem[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ativos");
  const [mode, setMode] = useState<Mode>("catalog");
  const [courses, setCourses] = useState(initialCourses);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Re-sync local (optimistic) state when the server sends a fresh list after
  // revalidation — the render-phase "adjust state on prop change" pattern.
  const [syncedFrom, setSyncedFrom] = useState(initialCourses);
  if (syncedFrom !== initialCourses) {
    setSyncedFrom(initialCourses);
    setCourses(initialCourses);
  }

  const totalCursos = courses.length;
  const totalPublicados = useMemo(() => courses.filter((c) => c.status === "Publicado").length, [courses]);
  const totalRascunhos = useMemo(() => courses.filter((c) => c.status === "Rascunho").length, [courses]);
  const totalArquivados = useMemo(() => courses.filter((c) => c.status === "Arquivado").length, [courses]);
  const totalAtivos = totalPublicados + totalRascunhos;

  const statusFilters = useMemo<{ id: StatusFilter; label: string; count: number }[]>(() => {
    const base: { id: StatusFilter; label: string; count: number }[] = [
      { id: "ativos", label: "Ativos", count: totalAtivos },
      { id: "Publicado", label: "Publicados", count: totalPublicados },
      { id: "Rascunho", label: "Rascunhos", count: totalRascunhos },
    ];
    if (totalArquivados > 0) {
      base.push({ id: "Arquivado", label: "Arquivados", count: totalArquivados });
    }
    return base;
  }, [totalAtivos, totalPublicados, totalRascunhos, totalArquivados]);

  // Derive the effective filter so a stale "Arquivado" selection (last archived course
  // just left) transparently falls back to "ativos" without an extra render pass.
  const activeStatusFilter: StatusFilter =
    statusFilter === "Arquivado" && totalArquivados === 0 ? "ativos" : statusFilter;

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesStatus =
        activeStatusFilter === "ativos"
          ? course.status !== "Arquivado"
          : course.status === activeStatusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return course.title.toLowerCase().includes(q) || course.category.toLowerCase().includes(q);
    });
  }, [courses, activeStatusFilter, query]);

  // Manual ordering always operates on the non-archived catalog, in stored order.
  const reorderCourses = useMemo(() => courses.filter((c) => c.status !== "Arquivado"), [courses]);

  const isFiltering = query.trim() !== "" || activeStatusFilter !== "ativos";
  const isEmpty = filteredCourses.length === 0;

  const handleToggleFeatured = (courseId: string, currentFeatured: boolean) => {
    const newValue = !currentFeatured;
    setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, isFeatured: newValue } : c)));
    startTransition(async () => {
      const result = await toggleCourseFeatured(courseId, newValue);
      if (!result.success) {
        toast.error("Erro ao atualizar destaque do curso");
        setCourses(initialCourses);
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCourses((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Update order indices based on new visual order
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          orderIndex: index,
        }));

        // Send bulk update to server
        startTransition(async () => {
          const updates = updatedItems.map((item) => ({ id: item.id, orderIndex: item.orderIndex }));
          const result = await updateCoursesOrderBulk(updates);
          if (!result.success) {
            toast.error("Falha ao salvar a nova ordem");
            setCourses(initialCourses);
          }
        });

        return updatedItems;
      });
    }
  };

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de cursos" value={totalCursos.toString()} helper="No catálogo" icon={BookOpen} tone="primary" />
        <StatCard
          label="Publicados"
          value={totalPublicados.toString()}
          helper="Visíveis para os alunos"
          icon={CheckCircle2}
          tone="sage"
        />
        <StatCard
          label="Rascunhos"
          value={totalRascunhos.toString()}
          helper="Em preparação"
          icon={Pencil}
          tone="terracotta"
        />
        <StatCard
          label="Arquivados"
          value={totalArquivados.toString()}
          helper="Fora do catálogo"
          icon={Archive}
          tone="neutral"
        />
      </div>

      <Card>
        <Card.Header className="flex flex-col gap-4 border-b border-separator pb-5 md:flex-row md:items-end md:justify-between">
          {mode === "catalog" ? (
            <>
              <SearchField
                value={query}
                onChange={setQuery}
                onClear={() => setQuery("")}
                className="w-full md:w-80"
                aria-label="Buscar curso"
              >
                <Label className="sr-only">Buscar curso</Label>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Buscar por título ou categoria…" />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>

              <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
                <ToggleButtonGroup
                  aria-label="Filtrar por status"
                  selectionMode="single"
                  disallowEmptySelection
                  selectedKeys={new Set([activeStatusFilter])}
                  onSelectionChange={(keys) => {
                    const [first] = Array.from(keys);
                    if (first) setStatusFilter(first as StatusFilter);
                  }}
                  size="sm"
                >
                  {statusFilters.map((filter) => (
                    <ToggleButton key={filter.id} id={filter.id}>
                      {filter.label} ({filter.count})
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setMode("reorder")}
                    >
                      <GripVertical className="size-4" aria-hidden="true" />
                      Reordenar
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>Organizar a ordem dos cursos no catálogo</Tooltip.Content>
                </Tooltip.Root>
              </div>
            </>
          ) : (
            <>
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                  <GripVertical className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-bold leading-tight text-foreground">Ordenação manual</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Arraste para definir a ordem no catálogo. Busca e filtros ficam pausados.
                  </p>
                </div>
              </div>
              <Button variant="primary" size="sm" className="gap-1.5" onClick={() => setMode("catalog")}>
                <Check className="size-4" aria-hidden="true" />
                Concluir
              </Button>
            </>
          )}
        </Card.Header>

        <Card.Content className="p-0">
          {mode === "reorder" ? (
            reorderCourses.length === 0 ? (
              <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                  <BookOpen className="size-5 text-muted" aria-hidden="true" />
                </span>
                <p className="font-semibold text-foreground">Nenhum curso ativo para ordenar</p>
                <p className="max-w-sm text-sm text-muted">
                  Publique um curso ou tire-o do arquivo para reorganizar o catálogo.
                </p>
              </EmptyState>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={reorderCourses.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    aria-busy={isPending}
                    className={cn(
                      "divide-y divide-separator transition-opacity",
                      isPending && "pointer-events-none opacity-60",
                    )}
                  >
                    {reorderCourses.map((course) => (
                      <SortableCourseRow key={course.id} course={course} onToggleFeatured={handleToggleFeatured} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )
          ) : isEmpty ? (
            <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                <BookOpen className="size-5 text-muted" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">
                {isFiltering
                  ? "Nenhum curso encontrado"
                  : totalArquivados > 0
                    ? "Nenhum curso ativo no catálogo"
                    : "Nenhum curso no catálogo"}
              </p>
              <p className="max-w-sm text-sm text-muted">
                {isFiltering
                  ? "Ajuste a busca ou os filtros para ver mais resultados."
                  : totalArquivados > 0
                    ? `Existem ${totalArquivados} curso(s) arquivado(s). Ative o filtro “Arquivados” ou crie um novo curso.`
                    : "Crie o primeiro curso para começar a montar as trilhas."}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                {isFiltering ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setStatusFilter("ativos");
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : (
                  totalArquivados > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => setStatusFilter("Arquivado")}
                    >
                      <Archive className="size-4" aria-hidden="true" />
                      Ver arquivados
                    </Button>
                  )
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
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Cursos do catálogo">
                      <Table.Header>
                        <Table.Column isRowHeader>Curso</Table.Column>
                        <Table.Column>Aulas</Table.Column>
                        <Table.Column>Avaliação</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>Atualização</Table.Column>
                        <Table.Column className="text-right">Ações</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {filteredCourses.map((course) => (
                          <Table.Row key={course.id} id={course.id}>
                            <Table.Cell>
                              <Link
                                href={`/admin/cursos/${course.id}`}
                                className="flex items-center gap-3 font-semibold text-foreground hover:text-accent"
                              >
                                <CourseCover coverUrl={course.coverUrl} className="size-10" />
                                <div className="min-w-0">
                                  <span className="line-clamp-1">{course.title}</span>
                                  <div className="mt-1">
                                    <Chip color="default" variant="soft" size="sm">
                                      {course.category}
                                    </Chip>
                                  </div>
                                </div>
                              </Link>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                                <PlayCircle className="size-3.5" aria-hidden="true" />
                                {course.lessons}
                              </span>
                            </Table.Cell>
                            <Table.Cell>
                              <RatingSummary
                                averageRating={course.averageRating}
                                ratingsCount={course.ratingsCount}
                              />
                            </Table.Cell>
                            <Table.Cell>
                              <StatusBadge tone={toneForStatus(course.status)}>{course.status}</StatusBadge>
                            </Table.Cell>
                            <Table.Cell className="text-xs text-muted">
                              {course.updated.toLowerCase()}
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex items-center justify-end gap-1">
                                <FeaturedToggle course={course} onToggle={handleToggleFeatured} />
                                <Tooltip.Root>
                                  <Tooltip.Trigger>
                                    <Link
                                      href={`/admin/cursos/${course.id}`}
                                      className={cn(
                                        buttonVariants({ variant: "secondary", size: "sm" }),
                                        "gap-1.5",
                                      )}
                                      aria-label={`Gerenciar ${course.title}`}
                                    >
                                      Gerenciar
                                      <ArrowRight className="size-3.5" aria-hidden="true" />
                                    </Link>
                                  </Tooltip.Trigger>
                                  <Tooltip.Content>Abrir e editar o curso</Tooltip.Content>
                                </Tooltip.Root>
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-separator md:hidden">
                {filteredCourses.map((course) => (
                  <li key={course.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <CourseCover coverUrl={course.coverUrl} className="size-10" />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/cursos/${course.id}`}
                          className="block font-semibold leading-5 text-foreground"
                        >
                          <span className="line-clamp-2">{course.title}</span>
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Chip color="default" variant="soft" size="sm">
                            {course.category}
                          </Chip>
                          <StatusBadge tone={toneForStatus(course.status)}>{course.status}</StatusBadge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <PlayCircle className="size-3.5" aria-hidden="true" />
                        {course.lessons} aulas
                      </span>
                      <span aria-hidden="true">·</span>
                      <RatingSummary averageRating={course.averageRating} ratingsCount={course.ratingsCount} />
                      <span aria-hidden="true">·</span>
                      <span>Atualizado {course.updated.toLowerCase()}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Link
                        href={`/admin/cursos/${course.id}`}
                        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "flex-1 gap-1.5")}
                      >
                        Gerenciar
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                      <FeaturedToggle course={course} onToggle={handleToggleFeatured} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card.Content>
      </Card>
    </>
  );
}
