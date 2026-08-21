"use client";

import { useState, useTransition, type DragEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit2, GripVertical, HelpCircle, Image as ImageIcon, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Button, Toast } from "@heroui/react";
import type { Lesson } from "@/types/course";
import { deleteLesson, reorderLessons } from "@/app/actions/admin/catalog";

type LessonDropTarget = {
  lessonId: string;
  placement: "before" | "after";
};

type DragState = {
  lessonId: string;
  originalLessons: Lesson[];
};

function moveLesson(
  lessons: Lesson[],
  lessonId: string,
  targetId: string,
  placement: LessonDropTarget["placement"],
) {
  const sourceIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (sourceIndex < 0 || lessonId === targetId) return lessons;

  const reordered = [...lessons];
  const [movedLesson] = reordered.splice(sourceIndex, 1);
  const targetIndex = reordered.findIndex((lesson) => lesson.id === targetId);
  if (targetIndex < 0) return lessons;

  reordered.splice(targetIndex + (placement === "after" ? 1 : 0), 0, movedLesson);
  return reordered.map((lesson, index) => ({ ...lesson, order: index + 1 }));
}

function orderChanged(previous: Lesson[], next: Lesson[]) {
  return previous.some((lesson, index) => lesson.id !== next[index]?.id);
}

/**
 * Gestão de aulas do curso galeria: uma coleção plana, sem módulos.
 *
 * É o equivalente do `ModuleList` para o outro tipo de curso — mesma mecânica
 * de arrastar para reordenar, mesmas ações de editar/excluir — mas sem a
 * camada de módulo, que aqui não existe para o admin enxergar (o módulo único
 * que guarda essas aulas no banco é infraestrutura, não conteúdo).
 */
export default function GalleryLessonList({
  courseId,
  moduleId,
  initialLessons,
}: {
  courseId: string;
  moduleId: string;
  initialLessons: Lesson[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lessons, setLessons] = useState(
    [...initialLessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  );

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<LessonDropTarget | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const persistOrder = (next: Lesson[], previous: Lesson[]) => {
    setLessons(next);
    startTransition(async () => {
      const result = await reorderLessons(courseId, moduleId, next.map((lesson) => lesson.id));
      if (!result.success) {
        setLessons(previous);
        Toast.toast.danger("Não foi possível salvar a ordem das aulas.", {
          description: result.message || "A ordem anterior foi restaurada.",
        });
        return;
      }
      Toast.toast.success("Ordem das aulas atualizada.");
    });
  };

  const clearDrag = () => {
    setDragState(null);
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, lessonId: string) => {
    if (isPending) {
      event.preventDefault();
      return;
    }
    setDragState({ lessonId, originalLessons: lessons });
    setDraggedId(lessonId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", lessonId);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, targetLessonId: string) => {
    if (!dragState || dragState.lessonId === targetLessonId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
    setDropTarget({ lessonId: targetLessonId, placement });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!dragState || !dropTarget) {
      clearDrag();
      return;
    }
    const next = moveLesson(dragState.originalLessons, dragState.lessonId, dropTarget.lessonId, dropTarget.placement);
    clearDrag();
    if (orderChanged(dragState.originalLessons, next)) {
      persistOrder(next, dragState.originalLessons);
    }
  };

  const handleReorderKeyDown = (event: KeyboardEvent<HTMLButtonElement>, lessonId: string) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    if (isPending) return;

    const currentIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
    const targetIndex = currentIndex + (event.key === "ArrowUp" ? -1 : 1);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= lessons.length) return;

    const target = lessons[targetIndex];
    const next = moveLesson(lessons, lessonId, target.id, event.key === "ArrowUp" ? "before" : "after");
    persistOrder(next, lessons);
  };

  const handleDelete = async (lessonId: string) => {
    if (!confirm("Tem certeza que deseja remover esta aula?")) return;
    const result = await deleteLesson(lessonId);
    if (result.success) {
      setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
      router.refresh();
    } else {
      Toast.toast.danger("Não foi possível remover a aula.", { description: result.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-muted">
            {lessons.length} {lessons.length === 1 ? "aula cadastrada" : "aulas cadastradas"}
          </p>
          <p className="mt-1 text-xs text-muted">
            Arraste pelo puxador para mudar a ordem — é ela que define a galeria e o carrossel da home.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/cursos/${courseId}/aulas/quiz/nova?module=${moduleId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition-colors hover:border-warning hover:text-warning"
          >
            <HelpCircle className="size-4" aria-hidden="true" />
            Novo Quiz
          </Link>
          <Link
            href={`/admin/cursos/${courseId}/aulas/nova?module=${moduleId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground transition-colors hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden="true" />
            Nova Aula
          </Link>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background-secondary p-10 text-center text-sm text-muted">
          Nenhuma aula cadastrada ainda. Adicione a primeira acima.
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson, index) => {
            const isDragged = draggedId === lesson.id;
            const isDropBefore = dropTarget?.lessonId === lesson.id && dropTarget.placement === "before";
            const isDropAfter = dropTarget?.lessonId === lesson.id && dropTarget.placement === "after";
            return (
              <div
                key={lesson.id}
                onDragOver={(event) => handleDragOver(event, lesson.id)}
                onDrop={handleDrop}
                className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition-all hover:bg-surface-hover ${
                  isDragged ? "opacity-45" : "border-border/60 hover:border-border"
                } ${isDropBefore ? "border-t-2 border-t-accent" : ""} ${isDropAfter ? "border-b-2 border-b-accent" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    draggable={!isPending}
                    disabled={isPending}
                    aria-label={`Reordenar ${lesson.title}. Posição ${index + 1} de ${lessons.length}`}
                    title="Arraste para reordenar ou use as setas para cima e para baixo"
                    onDragStart={(event) => handleDragStart(event, lesson.id)}
                    onDragEnd={clearDrag}
                    onKeyDown={(event) => handleReorderKeyDown(event, lesson.id)}
                    className="shrink-0 cursor-grab touch-none rounded-md p-1 text-muted opacity-60 transition-all hover:bg-accent-soft hover:text-accent hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing disabled:cursor-wait disabled:opacity-30 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <GripVertical className="size-4" aria-hidden="true" />
                  </button>

                  {/* Thumb vertical 2:3 — a mesma que aparece na galeria e no carrossel da home */}
                  {lesson.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={lesson.coverUrl}
                      alt={lesson.title}
                      className="aspect-2/3 w-11 shrink-0 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex aspect-2/3 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-background-secondary text-muted">
                      <ImageIcon className="size-3.5 opacity-40" aria-hidden="true" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{lesson.title}</p>
                      {index < 8 && (
                        <span className="shrink-0 rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider">
                          Carrossel
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {lesson.type === "quiz" ? "Quiz" : lesson.type === "text" ? "Texto" : "Vídeo"} · {lesson.durationInMinutes} min
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Link
                    href={
                      lesson.type === "quiz"
                        ? `/admin/cursos/${courseId}/aulas/quiz/${lesson.id}?module=${moduleId}`
                        : `/admin/cursos/${courseId}/aulas/${lesson.id}?module=${moduleId}`
                    }
                    aria-label="Editar aula"
                    className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                  >
                    <Edit2 className="size-4" aria-hidden="true" />
                  </Link>
                  <Button
                    isIconOnly
                    variant="ghost"
                    size="sm"
                    aria-label="Remover aula"
                    className="text-danger hover:bg-danger-soft hover:text-danger-soft-foreground"
                    onClick={() => handleDelete(lesson.id)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isPending && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted shadow-elev-3">
          <LoaderCircle className="size-4 animate-spin text-accent" aria-hidden="true" />
          Salvando ordem...
        </div>
      )}
    </div>
  );
}
