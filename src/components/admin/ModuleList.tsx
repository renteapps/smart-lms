"use client";

import { useState } from "react";
import { GripVertical, Plus, Edit2, Trash2, ChevronDown, ChevronUp, PlayCircle, FileText, CheckCircle, Brain, SkipForward, RotateCcw, Image as ImageIcon } from "lucide-react";
import { Course, Module, Lesson } from "@/types/course";
import Link from "next/link";
import AddProfileTestModal from "./AddProfileTestModal";
import AddEditModuleModal from "./AddEditModuleModal";

interface ModuleListProps {
  courseId: string;
  initialCourse: Course;
}

export default function ModuleList({ courseId, initialCourse }: ModuleListProps) {
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

  const handleSaveModule = (data: { title: string; description: string; coverUrl: string }) => {
    setCourse((prevCourse) => {
      if (editingModule) {
        // Edit existing module
        const updatedModules = prevCourse.modules.map((m) => {
          if (m.id !== editingModule.id) return m;
          return {
            ...m,
            title: data.title,
            description: data.description,
            coverUrl: data.coverUrl
          };
        });
        return { ...prevCourse, modules: updatedModules };
      } else {
        // Add new module
        const newModule: Module = {
          id: `m-${Date.now()}`,
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
  };

  const handleDeleteModule = (moduleId: string) => {
    if (confirm("Tem certeza que deseja excluir este módulo e todos os seus conteúdos?")) {
      setCourse((prev) => ({
        ...prev,
        modules: prev.modules.filter((m) => m.id !== moduleId)
      }));
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

  const handleSaveProfileTest = (data: {
    title: string;
    profileTestId: string;
    allowSkipIfCompleted: boolean;
    requireRetake: boolean;
    durationInMinutes: number;
  }) => {
    if (!activeModuleId) return;

    setCourse((prevCourse) => {
      const updatedModules = prevCourse.modules.map((mod) => {
        if (mod.id !== activeModuleId) return mod;

        if (editingLesson) {
          // Edit existing lesson
          const updatedLessons = mod.lessons.map((l) => {
            if (l.id !== editingLesson.id) return l;
            return {
              ...l,
              title: data.title,
              durationInMinutes: data.durationInMinutes,
              profileTestId: data.profileTestId,
              profileTestConfig: {
                allowSkipIfCompleted: data.allowSkipIfCompleted,
                requireRetake: data.requireRetake
              }
            };
          });
          return { ...mod, lessons: updatedLessons };
        } else {
          // Add new profile test lesson
          const newLesson: Lesson = {
            id: `l-test-${Date.now()}`,
            title: data.title,
            type: 'profile_test',
            content: 'Avaliação de perfil comportamental vinculada a este curso.',
            attachments: [],
            durationInMinutes: data.durationInMinutes,
            isCompleted: false,
            profileTestId: data.profileTestId,
            profileTestConfig: {
              allowSkipIfCompleted: data.allowSkipIfCompleted,
              requireRetake: data.requireRetake
            }
          };
          return { ...mod, lessons: [...mod.lessons, newLesson] };
        }
      });

      return { ...prevCourse, modules: updatedModules };
    });
  };

  const handleDeleteLesson = (moduleId: string, lessonId: string) => {
    if (confirm("Tem certeza que deseja remover este item do módulo?")) {
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
    }
  };

  const getLessonIcon = (type: string) => {
    if (type === 'profile_test') return <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    if (type === 'video') return <PlayCircle className="w-4 h-4 text-primary" />;
    if (type === 'text') return <FileText className="w-4 h-4 text-blue-500" />;
    return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-text-soft">
          {course.modules.length} {course.modules.length === 1 ? "módulo cadastrado" : "módulos cadastrados"}
        </p>
        <button
          onClick={handleOpenAddModule}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          Novo Módulo
        </button>
      </div>

      <div className="space-y-4">
        {course.modules.map((module) => (
          <div key={module.id} className="bg-surface-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Header do Módulo */}
            <div className="p-4 sm:p-5 bg-surface border-b border-border flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                <button className="mt-1 cursor-grab hover:text-primary transition-colors text-text-soft shrink-0">
                  <GripVertical className="w-5 h-5" />
                </button>
                
                {/* Module 16:9 Cover Thumbnail */}
                {module.coverUrl ? (
                  <div className="relative aspect-video w-28 sm:w-36 rounded-lg overflow-hidden border border-border shrink-0 bg-canvas-soft shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={module.coverUrl} alt={module.title} className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white px-1.5 py-0.5 rounded">
                      16:9
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-video w-28 sm:w-36 rounded-lg border border-border bg-canvas-soft flex flex-col items-center justify-center text-text-soft shrink-0">
                    <ImageIcon className="w-5 h-5 opacity-40" />
                    <span className="text-[10px] font-medium">Sem capa</span>
                  </div>
                )}

                <button onClick={() => toggleModule(module.id)} className="text-left min-w-0 flex-1 group">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Módulo {module.order}
                    </span>
                    {expandedModules[module.id] ? (
                      <ChevronUp className="w-4 h-4 text-text-soft group-hover:text-ink transition-colors" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-soft group-hover:text-ink transition-colors" />
                    )}
                  </div>

                  <h3 className="font-extrabold text-base sm:text-lg text-ink mt-1 group-hover:text-primary transition-colors truncate">
                    {module.title}
                  </h3>

                  {module.description && (
                    <p className="text-xs text-text-soft mt-1 line-clamp-2 leading-relaxed">
                      {module.description}
                    </p>
                  )}

                  <p className="text-xs font-semibold text-text-soft mt-2">
                    {module.lessons.length} {module.lessons.length === 1 ? "conteúdo" : "conteúdos / aulas"}
                  </p>
                </button>
              </div>

              {/* Module Header Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleOpenEditModule(module)}
                  className="p-2 text-text-soft hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="Editar dados do Módulo"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteModule(module.id)}
                  className="p-2 text-text-soft hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Excluir Módulo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista de Aulas e Testes */}
            {expandedModules[module.id] && (
              <div className="p-3 sm:p-4">
                {module.lessons.length === 0 ? (
                  <div className="p-6 text-center text-sm text-text-soft border border-dashed border-border rounded-xl bg-canvas-soft">
                    Nenhum conteúdo neste módulo ainda. Adicione uma aula ou um teste de perfil abaixo.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {module.lessons.map((lesson) => {
                      const isProfileTest = lesson.type === 'profile_test';
                      return (
                        <div
                          key={lesson.id}
                          className={`flex items-center justify-between p-3.5 hover:bg-surface-hover rounded-xl border transition-all group ${
                            isProfileTest ? 'bg-purple-500/5 border-purple-500/20' : 'border-border/60 hover:border-border'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <button className="cursor-grab text-text-soft opacity-0 group-hover:opacity-100 transition-opacity">
                              <GripVertical className="w-4 h-4" />
                            </button>
                            <div className={`flex items-center justify-center w-9 h-9 rounded-xl border ${
                              isProfileTest ? 'bg-purple-500/10 border-purple-500/30' : 'bg-surface border-border'
                            }`}>
                              {getLessonIcon(lesson.type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-ink">{lesson.title}</p>
                                {isProfileTest && (
                                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                    Teste de Perfil
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-text-soft mt-0.5">
                                <span>{isProfileTest ? 'Diagnóstico' : lesson.type === 'video' ? 'Vídeo' : 'Texto'} • {lesson.durationInMinutes} min</span>
                                
                                {isProfileTest && lesson.profileTestConfig && (
                                  <>
                                    <span>•</span>
                                    {lesson.profileTestConfig.allowSkipIfCompleted && (
                                      <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                                        <SkipForward className="w-3 h-3" /> Pode pular se feito
                                      </span>
                                    )}
                                    {lesson.profileTestConfig.requireRetake && (
                                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                                        <RotateCcw className="w-3 h-3" /> Refazer obrigatório
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isProfileTest ? (
                              <button
                                onClick={() => handleOpenEditTestModal(module.id, lesson)}
                                className="p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-500/10 rounded-md transition-colors"
                                title="Editar Configurações do Teste"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <Link
                                href={`/admin/cursos/${courseId}/aulas/${lesson.id}`}
                                className="p-1.5 text-text-soft hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Link>
                            )}

                            <button
                              onClick={() => handleDeleteLesson(module.id, lesson.id)}
                              className="p-1.5 text-text-soft hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Botões de Adicionar Conteúdo ao Módulo */}
                <div className="mt-4 pt-3 border-t border-border flex flex-col sm:flex-row gap-2">
                  <Link
                    href={`/admin/cursos/${courseId}/aulas/nova?module=${module.id}`}
                    className="flex-1 flex items-center gap-2 p-2.5 justify-center border-2 border-dashed border-border rounded-xl text-text-soft hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors text-sm font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Aula
                  </Link>
                  <button
                    onClick={() => handleOpenAddTestModal(module.id)}
                    className="flex-1 flex items-center gap-2 p-2.5 justify-center border-2 border-dashed border-purple-500/30 rounded-xl text-purple-600 dark:text-purple-400 hover:border-purple-500 hover:bg-purple-500/5 transition-colors text-sm font-bold"
                  >
                    <Brain className="w-4 h-4" />
                    Adicionar Teste de Perfil
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
