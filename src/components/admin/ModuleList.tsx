"use client";

import { useRef, useState, useTransition, type DragEvent, type KeyboardEvent } from "react";
import { GripVertical, Plus, Edit2, Trash2, ChevronDown, ChevronUp, PlayCircle, FileText, CheckCircle, Brain, SkipForward, RotateCcw, Image as ImageIcon, HelpCircle, LoaderCircle } from "lucide-react";
import { Course, Module, Lesson } from "@/types/course";
import Link from "next/link";
import { Button, Toast } from "@heroui/react";
import AddProfileTestModal from "./AddProfileTestModal";
import AddEditModuleModal from "./AddEditModuleModal";
import { saveModule, deleteModule, saveLesson, deleteLesson, reorderLessons, reorderModules } from "@/app/actions/admin/catalog";
import { useRouter } from "next/navigation";

interface ModuleListProps {
  courseId: string;
  initialCourse: Course;
}

type LessonDropTarget = {
  lessonId: string;
  placement: "before" | "after";
};

type LessonDragState = {
  moduleId: string;
  lessonId: string;
  originalLessons: Lesson[];
};

type ModuleDragState = {
  moduleId: string;
  originalModules: Module[];
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

function lessonOrderChanged(previous: Lesson[], next: Lesson[]) {
  return previous.some((lesson, index) => lesson.id !== next[index]?.id);
}

function moveModule(
  modules: Module[],
  moduleId: string,
  targetId: string,
  placement: LessonDropTarget["placement"],
) {
  const sourceIndex = modules.findIndex((module) => module.id === moduleId);
  if (sourceIndex < 0 || moduleId === targetId) return modules;

  const reordered = [...modules];
  const [movedModule] = reordered.splice(sourceIndex, 1);
  const targetIndex = reordered.findIndex((module) => module.id === targetId);
  if (targetIndex < 0) return modules;

  reordered.splice(targetIndex + (placement === "after" ? 1 : 0), 0, movedModule);
  return reordered.map((module, index) => ({ ...module, order: index + 1 }));
}

function moduleOrderChanged(previous: Module[], next: Module[]) {
  return previous.some((module, index) => module.id !== next[index]?.id);
}

export default function ModuleList({ courseId, initialCourse }: ModuleListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [course, setCourse] = useState(initialCourse);
  const lessonDragRef = useRef<LessonDragState | null>(null);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [lessonDropTarget, setLessonDropTarget] = useState<LessonDropTarget | null>(null);
  const moduleDragRef = useRef<ModuleDragState | null>(null);
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [moduleDropTarget, setModuleDropTarget] = useState<LessonDropTarget | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(
    initialCourse.modules.reduce((acc, m) => ({ ...acc, [m.id]: true }), {})
  );

  // Profile Test Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Module Add/Edit Modal State
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const replaceModuleLessons = (moduleId: string, lessons: Lesson[]) => {
    setCourse((previousCourse) => ({
      ...previousCourse,
      modules: previousCourse.modules.map((module) =>
        module.id === moduleId ? { ...module, lessons } : module
      ),
    }));
  };

  const persistLessonOrder = (moduleId: string, nextLessons: Lesson[], previousLessons: Lesson[]) => {
    replaceModuleLessons(moduleId, nextLessons);

    startTransition(async () => {
      const result = await reorderLessons(courseId, moduleId, nextLessons.map((lesson) => lesson.id));

      if (!result.success) {
        replaceModuleLessons(moduleId, previousLessons);
        Toast.toast.danger("Não foi possível salvar a ordem das aulas.", {
          description: result.message || "A ordem anterior foi restaurada.",
        });
        return;
      }

      Toast.toast.success("Ordem das aulas atualizada.");
    });
  };

  const clearLessonDrag = () => {
    lessonDragRef.current = null;
    setDraggedLessonId(null);
    setLessonDropTarget(null);
  };

  const handleLessonDragStart = (
    event: DragEvent<HTMLButtonElement>,
    moduleId: string,
    lessonId: string,
    lessons: Lesson[],
  ) => {
    if (isPending) {
      event.preventDefault();
      return;
    }

    lessonDragRef.current = { moduleId, lessonId, originalLessons: lessons };
    setDraggedLessonId(lessonId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", lessonId);
  };

  const handleLessonDragOver = (
    event: DragEvent<HTMLDivElement>,
    moduleId: string,
    targetLessonId: string,
  ) => {
    const dragState = lessonDragRef.current;
    if (!dragState || dragState.moduleId !== moduleId || dragState.lessonId === targetLessonId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
    setLessonDropTarget({ lessonId: targetLessonId, placement });
  };

  const handleLessonDrop = (event: DragEvent<HTMLDivElement>, moduleId: string) => {
    event.preventDefault();
    const dragState = lessonDragRef.current;
    const target = lessonDropTarget;

    if (!dragState || dragState.moduleId !== moduleId || !target) {
      clearLessonDrag();
      return;
    }

    const nextLessons = moveLesson(
      dragState.originalLessons,
      dragState.lessonId,
      target.lessonId,
      target.placement,
    );
    clearLessonDrag();

    if (lessonOrderChanged(dragState.originalLessons, nextLessons)) {
      persistLessonOrder(moduleId, nextLessons, dragState.originalLessons);
    }
  };

  const handleLessonReorderKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    moduleId: string,
    lessonId: string,
    lessons: Lesson[],
  ) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    if (isPending) return;

    const currentIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
    const targetIndex = currentIndex + (event.key === "ArrowUp" ? -1 : 1);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= lessons.length) return;

    const target = lessons[targetIndex];
    const nextLessons = moveLesson(
      lessons,
      lessonId,
      target.id,
      event.key === "ArrowUp" ? "before" : "after",
    );
    persistLessonOrder(moduleId, nextLessons, lessons);
  };

  const persistModuleOrder = (nextModules: Module[], previousModules: Module[]) => {
    setCourse((previousCourse) => ({ ...previousCourse, modules: nextModules }));

    startTransition(async () => {
      const result = await reorderModules(courseId, nextModules.map((module) => module.id));

      if (!result.success) {
        setCourse((previousCourse) => ({ ...previousCourse, modules: previousModules }));
        Toast.toast.danger("Não foi possível salvar a ordem dos módulos.", {
          description: result.message || "A ordem anterior foi restaurada.",
        });
        return;
      }

      Toast.toast.success("Ordem dos módulos atualizada.");
    });
  };

  const clearModuleDrag = () => {
    moduleDragRef.current = null;
    setDraggedModuleId(null);
    setModuleDropTarget(null);
  };

  const handleModuleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    moduleId: string,
    modules: Module[],
  ) => {
    if (isPending) {
      event.preventDefault();
      return;
    }

    moduleDragRef.current = { moduleId, originalModules: modules };
    setDraggedModuleId(moduleId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", moduleId);
  };

  const handleModuleDragOver = (
    event: DragEvent<HTMLDivElement>,
    targetModuleId: string,
  ) => {
    const dragState = moduleDragRef.current;
    if (!dragState || dragState.moduleId === targetModuleId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
    setModuleDropTarget({ lessonId: targetModuleId, placement });
  };

  const handleModuleDrop = (event: DragEvent<HTMLDivElement>) => {
    const dragState = moduleDragRef.current;
    const target = moduleDropTarget;
    if (!dragState || !target) return;

    event.preventDefault();
    const nextModules = moveModule(
      dragState.originalModules,
      dragState.moduleId,
      target.lessonId,
      target.placement,
    );
    clearModuleDrag();

    if (moduleOrderChanged(dragState.originalModules, nextModules)) {
      persistModuleOrder(nextModules, dragState.originalModules);
    }
  };

  const handleModuleReorderKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    moduleId: string,
    modules: Module[],
  ) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    if (isPending) return;

    const currentIndex = modules.findIndex((module) => module.id === moduleId);
    const targetIndex = currentIndex + (event.key === "ArrowUp" ? -1 : 1);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= modules.length) return;

    const target = modules[targetIndex];
    const nextModules = moveModule(
      modules,
      moduleId,
      target.id,
      event.key === "ArrowUp" ? "before" : "after",
    );
    persistModuleOrder(nextModules, modules);
  };

  // --- Module Handlers ---
  const handleOpenAddModule = () => {
    setEditingModule(null);
    setIsModuleModalOpen(true);
  };

  const handleOpenEditModule = (module: Module) => {
    setEditingModule(module);
    setIsModuleModalOpen(true);
  };

  const handleSaveModule = async (data: { title: string; description: string; coverUrl: string }) => {
    const res = await saveModule(courseId, {
      id: editingModule?.id,
      title: data.title,
      description: data.description,
      coverUrl: data.coverUrl,
      order: editingModule ? editingModule.order : course.modules.length + 1
    });

    if (res.success) {
      router.refresh();
      setCourse((prevCourse) => {
        if (editingModule) {
          return {
            ...prevCourse,
            modules: prevCourse.modules.map((m) => 
              m.id === editingModule.id ? { ...m, ...data } : m
            )
          };
        } else {
          const newModule: Module = {
            id: res.data?.id || `m-${Date.now()}`,
            title: data.title,
            description: data.description,
            coverUrl: data.coverUrl,
            order: prevCourse.modules.length + 1,
            lessons: []
          };
          setExpandedModules((prev) => ({ ...prev, [newModule.id]: true }));
          return { ...prevCourse, modules: [...prevCourse.modules, newModule] };
        }
      });
    } else {
      alert("Erro ao salvar módulo: " + res.message);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (confirm("Tem certeza que deseja excluir este módulo e todos os seus conteúdos?")) {
      const res = await deleteModule(moduleId, courseId);
      if (res.success) {
        router.refresh();
        setCourse((prev) => ({
          ...prev,
          modules: prev.modules.filter((m) => m.id !== moduleId)
        }));
      } else {
        alert("Erro ao excluir módulo: " + res.message);
      }
    }
  };

  // --- Profile Test Lesson Handlers ---
  const handleOpenAddTestModal = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setEditingLesson(null);
    setIsTestModalOpen(true);
  };

  const handleOpenEditTestModal = (moduleId: string, lesson: Lesson) => {
    setActiveModuleId(moduleId);
    setEditingLesson(lesson);
    setIsTestModalOpen(true);
  };

  const handleSaveProfileTest = async (data: {
    title: string;
    profileTestId: string;
    allowSkipIfCompleted: boolean;
    requireRetake: boolean;
    durationInMinutes: number;
  }) => {
    if (!activeModuleId) return;

    const lessonData: Partial<Lesson> = {
      title: data.title,
      type: "profile_test",
      content: "Avaliação de perfil comportamental vinculada a este curso.",
      durationInMinutes: data.durationInMinutes,
      profileTestId: data.profileTestId,
      profileTestConfig: {
        allowSkipIfCompleted: data.allowSkipIfCompleted,
        requireRetake: data.requireRetake
      },
      order: editingLesson ? editingLesson.order : (course.modules.find(m => m.id === activeModuleId)?.lessons.length || 0) + 1,
      isPublished: true,
      blocks: [],
      attachments: []
    };

    const res = await saveLesson(activeModuleId, {
      id: editingLesson?.id,
      ...lessonData
    });

    if (res.success) {
      router.refresh();
      setCourse((prevCourse) => {
        return {
          ...prevCourse,
          modules: prevCourse.modules.map((mod) => {
            if (mod.id !== activeModuleId) return mod;
            if (editingLesson) {
              return {
                ...mod,
                lessons: mod.lessons.map((l) => l.id === editingLesson.id ? { ...l, ...lessonData } as Lesson : l)
              };
            } else {
              return {
                ...mod,
                lessons: [...mod.lessons, { id: res.data?.id || `l-${Date.now()}`, ...lessonData } as Lesson]
              };
            }
          })
        };
      });
    } else {
      alert("Erro ao salvar teste de perfil: " + res.message);
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (confirm("Tem certeza que deseja remover este item do módulo?")) {
      const res = await deleteLesson(lessonId);
      if (res.success) {
        router.refresh();
        setCourse((prev) => ({
          ...prev,
          modules: prev.modules.map((m) => {
            if (m.id !== moduleId) return m;
            return {
              ...m,
              lessons: m.lessons.filter((l) => l.id !== lessonId)
            };
          })
        }));
      } else {
        alert("Erro ao excluir item: " + res.message);
      }
    }
  };

  const getLessonIcon = (type: string) => {
    if (type === 'quiz') return <HelpCircle className="size-4 text-warning" aria-hidden="true" />;
    if (type === 'profile_test') return <Brain className="size-4 text-accent" aria-hidden="true" />;
    if (type === 'video') return <PlayCircle className="size-4 text-accent" aria-hidden="true" />;
    if (type === 'text') return <FileText className="size-4 text-muted" aria-hidden="true" />;
    return <CheckCircle className="size-4 text-success" aria-hidden="true" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-muted">
            {course.modules.length} {course.modules.length === 1 ? "módulo cadastrado" : "módulos cadastrados"}
          </p>
          <p className="mt-1 text-xs text-muted">
            Arraste módulos e aulas pelos puxadores para mudar a ordem.
          </p>
        </div>
        <Button variant="primary" size="sm" className="gap-2" onClick={handleOpenAddModule}>
          <Plus className="size-4" aria-hidden="true" />
          Novo Módulo
        </Button>
      </div>

      <div className="space-y-4">
        {course.modules.map((module, moduleIndex) => (
          <div
            key={module.id}
            onDragOver={(event) => handleModuleDragOver(event, module.id)}
            onDrop={handleModuleDrop}
            className={`overflow-hidden rounded-2xl border border-border bg-surface shadow-elev-2 transition-all hover:shadow-elev-3 ${
              draggedModuleId === module.id ? "opacity-45" : ""
            } ${moduleDropTarget?.lessonId === module.id && moduleDropTarget.placement === "before" ? "border-t-2 border-t-accent" : ""} ${
              moduleDropTarget?.lessonId === module.id && moduleDropTarget.placement === "after" ? "border-b-2 border-b-accent" : ""
            }`}
          >
            {/* Header do Módulo */}
            <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
              <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                <button
                  type="button"
                  draggable={!isPending}
                  disabled={isPending}
                  aria-label={`Reordenar ${module.title}. Posição ${moduleIndex + 1} de ${course.modules.length}`}
                  title="Arraste para reordenar ou use as setas para cima e para baixo"
                  onDragStart={(event) => handleModuleDragStart(event, module.id, course.modules)}
                  onDragEnd={clearModuleDrag}
                  onKeyDown={(event) => handleModuleReorderKeyDown(event, module.id, course.modules)}
                  className="mt-1 shrink-0 cursor-grab touch-none rounded-md p-1 text-muted transition-all hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing disabled:cursor-wait disabled:opacity-30"
                >
                  <GripVertical className="size-5" aria-hidden="true" />
                </button>

                {/* Module 16:9 Cover Thumbnail */}
                {module.coverUrl ? (
                  <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-background-secondary shadow-elev-1 sm:w-36">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={module.coverUrl} alt={module.title} className="h-full w-full object-cover" />
                    <div className="absolute left-1 top-1 rounded-sm bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                      16:9
                    </div>
                  </div>
                ) : (
                  <div className="relative flex aspect-video w-28 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-background-secondary text-muted sm:w-36">
                    <ImageIcon className="size-5 opacity-40" aria-hidden="true" />
                    <span className="text-[10px] font-medium">Sem capa</span>
                  </div>
                )}

                <button type="button" onClick={() => toggleModule(module.id)} className="group min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-soft-foreground">
                      Módulo {module.order}
                    </span>
                    {expandedModules[module.id] ? (
                      <ChevronUp className="size-4 text-muted transition-colors group-hover:text-foreground" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="size-4 text-muted transition-colors group-hover:text-foreground" aria-hidden="true" />
                    )}
                  </div>

                  <h3 className="mt-1 truncate text-base font-extrabold text-foreground transition-colors group-hover:text-accent sm:text-lg">
                    {module.title}
                  </h3>

                  {module.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                      {module.description}
                    </p>
                  )}

                  <p className="mt-2 text-xs font-semibold text-muted">
                    {module.lessons.length} {module.lessons.length === 1 ? "conteúdo" : "conteúdos / aulas"}
                  </p>
                </button>
              </div>

              {/* Module Header Action Buttons */}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  aria-label="Editar dados do módulo"
                  onClick={() => handleOpenEditModule(module)}
                >
                  <Edit2 className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  aria-label="Excluir módulo"
                  className="text-danger hover:bg-danger-soft hover:text-danger-soft-foreground"
                  onClick={() => handleDeleteModule(module.id)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* Lista de Aulas e Testes */}
            {expandedModules[module.id] && (
              <div className="p-3 sm:p-4">
                {module.lessons.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-background-secondary p-6 text-center text-sm text-muted">
                    Nenhum conteúdo neste módulo ainda. Adicione uma aula ou um teste de perfil abaixo.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {module.lessons.map((lesson, lessonIndex) => {
                      const isProfileTest = lesson.type === 'profile_test';
                      const isDragged = draggedLessonId === lesson.id;
                      const isDropBefore = lessonDropTarget?.lessonId === lesson.id && lessonDropTarget.placement === "before";
                      const isDropAfter = lessonDropTarget?.lessonId === lesson.id && lessonDropTarget.placement === "after";
                      return (
                        <div
                          key={lesson.id}
                          onDragOver={(event) => handleLessonDragOver(event, module.id, lesson.id)}
                          onDrop={(event) => handleLessonDrop(event, module.id)}
                          className={`group flex items-center justify-between rounded-xl border p-3.5 transition-all hover:bg-surface-hover ${
                            isProfileTest ? 'border-accent/25 bg-accent-soft/40' : 'border-border/60 hover:border-border'
                          } ${isDragged ? 'opacity-45' : ''} ${isDropBefore ? 'border-t-2 border-t-accent' : ''} ${isDropAfter ? 'border-b-2 border-b-accent' : ''}`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <button
                              type="button"
                              draggable={!isPending}
                              disabled={isPending}
                              aria-label={`Reordenar ${lesson.title}. Posição ${lessonIndex + 1} de ${module.lessons.length}`}
                              title="Arraste para reordenar ou use as setas para cima e para baixo"
                              onDragStart={(event) => handleLessonDragStart(event, module.id, lesson.id, module.lessons)}
                              onDragEnd={clearLessonDrag}
                              onKeyDown={(event) => handleLessonReorderKeyDown(event, module.id, lesson.id, module.lessons)}
                              className="shrink-0 cursor-grab touch-none rounded-md p-1 text-muted opacity-60 transition-all hover:bg-accent-soft hover:text-accent hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing disabled:cursor-wait disabled:opacity-30 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <GripVertical className="size-4" aria-hidden="true" />
                            </button>
                            <div className={`flex size-9 items-center justify-center rounded-xl border ${
                              isProfileTest ? 'border-accent/30 bg-accent-soft' : 'border-border bg-surface'
                            }`}>
                              {getLessonIcon(lesson.type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-foreground">{lesson.title}</p>
                                {isProfileTest && (
                                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-extrabold uppercase text-accent-soft-foreground">
                                    Teste de Perfil
                                  </span>
                                )}
                              </div>

                              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                                <span>{isProfileTest ? 'Diagnóstico' : lesson.type === 'video' ? 'Vídeo' : 'Texto'} • {lesson.durationInMinutes} min</span>

                                {isProfileTest && lesson.profileTestConfig && (
                                  <>
                                    <span>•</span>
                                    {lesson.profileTestConfig.allowSkipIfCompleted && (
                                      <span className="inline-flex items-center gap-1 font-semibold text-accent">
                                        <SkipForward className="size-3" aria-hidden="true" /> Pode pular se feito
                                      </span>
                                    )}
                                    {lesson.profileTestConfig.requireRetake && (
                                      <span className="inline-flex items-center gap-1 font-semibold text-warning">
                                        <RotateCcw className="size-3" aria-hidden="true" /> Refazer obrigatório
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                            {isProfileTest ? (
                              <Button
                                isIconOnly
                                variant="ghost"
                                size="sm"
                                aria-label="Editar configurações do teste"
                                className="text-accent hover:bg-accent-soft"
                                onClick={() => handleOpenEditTestModal(module.id, lesson)}
                              >
                                <Edit2 className="size-4" aria-hidden="true" />
                              </Button>
                            ) : (
                              <Link
                                href={lesson.type === 'quiz' ? `/admin/cursos/${courseId}/aulas/quiz/${lesson.id}?module=${module.id}` : `/admin/cursos/${courseId}/aulas/${lesson.id}?module=${module.id}`}
                                aria-label="Editar aula"
                                className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                              >
                                <Edit2 className="size-4" aria-hidden="true" />
                              </Link>
                            )}

                            <Button
                              isIconOnly
                              variant="ghost"
                              size="sm"
                              aria-label="Remover item"
                              className="text-danger hover:bg-danger-soft hover:text-danger-soft-foreground"
                              onClick={() => handleDeleteLesson(module.id, lesson.id)}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botões de Adicionar Conteúdo ao Módulo */}
                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row">
                  <Link
                    href={`/admin/cursos/${courseId}/aulas/nova?module=${module.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-2.5 text-sm font-bold text-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Nova Aula
                  </Link>
                  <Link
                    href={`/admin/cursos/${courseId}/aulas/quiz/nova?module=${module.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-2.5 text-sm font-bold text-muted transition-colors hover:border-warning hover:bg-warning-soft hover:text-warning"
                  >
                    <HelpCircle className="size-4" aria-hidden="true" />
                    Novo Quiz
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleOpenAddTestModal(module.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent/30 p-2.5 text-sm font-bold text-accent transition-colors hover:border-accent hover:bg-accent-soft"
                  >
                    <Brain className="size-4" aria-hidden="true" />
                    Teste de Perfil
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {isPending ? "Salvando a nova ordem do conteúdo." : ""}
      </p>
      {isPending && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted shadow-elev-3">
          <LoaderCircle className="size-4 animate-spin text-accent" aria-hidden="true" />
          Salvando ordem...
        </div>
      )}

      {/* Modal de Criação / Edição de Módulo */}
      <AddEditModuleModal
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        onSave={handleSaveModule}
        initialModule={editingModule}
      />

      {/* Modal de Teste de Perfil */}
      <AddProfileTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onSave={handleSaveProfileTest}
        initialData={
          editingLesson
            ? {
                title: editingLesson.title,
                profileTestId: editingLesson.profileTestId,
                allowSkipIfCompleted: editingLesson.profileTestConfig?.allowSkipIfCompleted,
                requireRetake: editingLesson.profileTestConfig?.requireRetake,
                durationInMinutes: editingLesson.durationInMinutes
              }
            : null
        }
      />
    </div>
  );
}
