"use client";

import { useState, useTransition } from "react";
import { GripVertical, Plus, Edit2, Trash2, ChevronDown, ChevronUp, PlayCircle, FileText, CheckCircle, Brain, SkipForward, RotateCcw, Image as ImageIcon, HelpCircle } from "lucide-react";
import { Course, Module, Lesson } from "@/types/course";
import Link from "next/link";
import { Button } from "@heroui/react";
import AddProfileTestModal from "./AddProfileTestModal";
import AddEditModuleModal from "./AddEditModuleModal";
import { saveModule, deleteModule, saveLesson, deleteLesson } from "@/app/actions/admin/catalog";
import { useRouter } from "next/navigation";

interface ModuleListProps {
  courseId: string;
  initialCourse: Course;
}

export default function ModuleList({ courseId, initialCourse }: ModuleListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [course, setCourse] = useState(initialCourse);
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
        <p className="text-sm font-semibold text-muted">
          {course.modules.length} {course.modules.length === 1 ? "módulo cadastrado" : "módulos cadastrados"}
        </p>
        <Button variant="primary" size="sm" className="gap-2" onClick={handleOpenAddModule}>
          <Plus className="size-4" aria-hidden="true" />
          Novo Módulo
        </Button>
      </div>

      <div className="space-y-4">
        {course.modules.map((module) => (
          <div key={module.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-elev-2 transition-shadow hover:shadow-elev-3">
            {/* Header do Módulo */}
            <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
              <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                <button
                  type="button"
                  aria-label="Reordenar módulo"
                  className="mt-1 shrink-0 cursor-grab text-muted transition-colors hover:text-accent"
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
                    {module.lessons.map((lesson) => {
                      const isProfileTest = lesson.type === 'profile_test';
                      return (
                        <div
                          key={lesson.id}
                          className={`group flex items-center justify-between rounded-xl border p-3.5 transition-all hover:bg-surface-hover ${
                            isProfileTest ? 'border-accent/25 bg-accent-soft/40' : 'border-border/60 hover:border-border'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              aria-label="Reordenar item"
                              className="cursor-grab text-muted opacity-0 transition-opacity group-hover:opacity-100"
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
                                href={lesson.type === 'quiz' ? `/admin/cursos/${courseId}/aulas/quiz/${lesson.id}` : `/admin/cursos/${courseId}/aulas/${lesson.id}`}
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
