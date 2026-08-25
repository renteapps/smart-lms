"use client";

import Link from "next/link";
import { useState, useMemo, useTransition, useEffect } from "react";
import { Archive, ArchiveRestore, BookOpen, Plus, Star, GripVertical } from "lucide-react";
import { Button, Card, EmptyState, Label, SearchField, buttonVariants } from "@heroui/react";
import { StatusBadge } from "@/components/ui/editorial";
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
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
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

function SortableCourseRow({
  course,
  index,
  toneForStatus,
  handleToggleFeatured,
  isDragDisabled
}: {
  course: AdminCourseListItem;
  index: number;
  toneForStatus: (status: CourseStatus) => "positive" | "warning" | "neutral";
  handleToggleFeatured: (id: string, current: boolean) => void;
  isDragDisabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: course.id, disabled: isDragDisabled });

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
        "flex flex-col sm:flex-row sm:items-center gap-4 p-4 border-b border-hairline bg-background last:border-0",
        isDragging && "shadow-lg bg-background-secondary rounded-lg border border-hairline opacity-90 scale-[1.01]"
      )}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div 
          {...attributes} 
          {...listeners} 
          className={cn(
            "p-1 -ml-1 text-muted hover:text-foreground cursor-grab active:cursor-grabbing",
            isDragDisabled && "opacity-50 cursor-not-allowed hidden" // hide drag handle if filtering/archived
          )}
        >
          {!isDragDisabled && <GripVertical className="size-5" />}
        </div>
        
        {course.coverUrl ? (
          <div className="relative size-10 sm:size-12 shrink-0 overflow-hidden rounded-lg bg-background-secondary">
            <img
              src={course.coverUrl}
              alt=""
              className="size-full object-cover"
            />
          </div>
        ) : (
          <span className="grid size-10 sm:size-12 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
            <BookOpen className="size-4 sm:size-5" aria-hidden="true" />
          </span>
        )}
        
        <div className="min-w-0 flex-1">
          <Link href={`/admin/cursos/${course.id}`} className="block font-semibold leading-5 text-foreground hover:text-accent truncate">
            {course.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{course.category}</span>
            <span>·</span>
            <span>{course.lessons} aulas</span>
            <span>·</span>
            <RatingSummary
              averageRating={course.averageRating}
              ratingsCount={course.ratingsCount}
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 justify-between sm:justify-end sm:min-w-[340px]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleFeatured(course.id, course.isFeatured)}
            className="h-9 w-9 p-0"
            aria-label={course.isFeatured ? "Remover destaque" : "Adicionar destaque"}
          >
            <Star
              className={cn("size-4 sm:size-5", course.isFeatured ? "fill-warning text-warning" : "text-muted")}
            />
          </Button>
          <div className="w-24 text-right">
            <StatusBadge tone={toneForStatus(course.status)}>
              {course.status}
            </StatusBadge>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted hidden md:inline-block w-32 text-right">
            Atualizado {course.updated.toLowerCase()}
          </span>
          <Link href={`/admin/cursos/${course.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Gerenciar
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AdminCursosClient({
  initialCourses,
}: {
  initialCourses: AdminCourseListItem[];
}) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
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
    })
  );

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  const totalPublicados = useMemo(
    () => courses.filter((c) => c.status === "Publicado").length,
    [courses],
  );
  const totalRascunhos = useMemo(
    () => courses.filter((c) => c.status === "Rascunho").length,
    [courses],
  );
  const totalArquivados = useMemo(
    () => courses.filter((c) => c.status === "Arquivado").length,
    [courses],
  );

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      if (!showArchived && course.status === "Arquivado") return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        course.title.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q)
      );
    });
  }, [courses, showArchived, query]);

  const isEmpty = filteredCourses.length === 0;

  const toneForStatus = (status: CourseStatus) => {
    switch (status) {
      case "Publicado": return "positive";
      case "Rascunho": return "warning";
      case "Arquivado": return "neutral";
      default: return "neutral";
    }
  };

  const handleToggleFeatured = (courseId: string, currentFeatured: boolean) => {
    const newValue = !currentFeatured;
    setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, isFeatured: newValue } : c));
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
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update order indices based on new visual order
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          orderIndex: index
        }));

        // Send bulk update to server
        startTransition(async () => {
          const updates = updatedItems.map(item => ({ id: item.id, orderIndex: item.orderIndex }));
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

  const isDragDisabled = !!query.trim() || showArchived;

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
          <div className="flex flex-col">
            <div className="hidden sm:flex items-center px-4 py-3 bg-background-secondary border-b border-hairline text-xs font-semibold text-muted">
              <div className="w-10"></div> {/* Handle space */}
              <div className="flex-1">Curso</div>
              <div className="w-16 text-center">Destaque</div>
              <div className="w-24 text-right pr-4">Status</div>
              <div className="w-32 text-right pr-4">Atualização</div>
              <div className="w-24"></div> {/* Action space */}
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredCourses.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col">
                  {filteredCourses.map((course, index) => (
                    <SortableCourseRow
                      key={course.id}
                      course={course}
                      index={index}
                      toneForStatus={toneForStatus}
                      handleToggleFeatured={handleToggleFeatured}
                      isDragDisabled={isDragDisabled}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
