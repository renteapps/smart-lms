"use client";

import { useState } from "react";
import { GripVertical, Plus, Edit2, Trash2, ChevronDown, ChevronUp, PlayCircle, FileText, CheckCircle } from "lucide-react";
import { Course, Module, Lesson } from "@/lib/mockData";
import Link from "next/link";

interface ModuleListProps {
  courseId: string;
  initialCourse: Course;
}

export default function ModuleList({ courseId, initialCourse }: ModuleListProps) {
  const [course, setCourse] = useState(initialCourse);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(
    initialCourse.modules.reduce((acc, m) => ({ ...acc, [m.id]: true }), {})
  );

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const getLessonIcon = (type: string) => {
    if (type === 'video') return <PlayCircle className="w-4 h-4 text-primary" />;
    if (type === 'text') return <FileText className="w-4 h-4 text-blue-500" />;
    return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm shadow-sm hover:shadow-md">
          <Plus className="w-4 h-4" />
          Novo Módulo
        </button>
      </div>

      <div className="space-y-4">
        {course.modules.map((module) => (
          <div key={module.id} className="bg-surface-card border border-border rounded-xl overflow-hidden shadow-sm">
            {/* Header do Módulo */}
            <div className="p-4 bg-surface border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="cursor-grab hover:text-primary transition-colors text-text-soft">
                  <GripVertical className="w-5 h-5" />
                </button>
                <button onClick={() => toggleModule(module.id)} className="flex items-center gap-2">
                  {expandedModules[module.id] ? (
                    <ChevronUp className="w-4 h-4 text-text-soft" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-soft" />
                  )}
                  <div>
                    <h3 className="font-bold text-left">{module.title}</h3>
                    <p className="text-xs text-text-soft text-left">{module.lessons.length} aulas</p>
                  </div>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-text-soft hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-text-soft hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista de Aulas */}
            {expandedModules[module.id] && (
              <div className="p-2">
                {module.lessons.length === 0 ? (
                  <div className="p-4 text-center text-sm text-text-soft">
                    Nenhuma aula neste módulo ainda.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {module.lessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-center justify-between p-3 hover:bg-surface-hover rounded-lg border border-transparent hover:border-border transition-colors group">
                        <div className="flex items-center gap-3">
                          <button className="cursor-grab text-text-soft opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-4 h-4" />
                          </button>
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface border border-border">
                            {getLessonIcon(lesson.type)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{lesson.title}</p>
                            <p className="text-xs text-text-soft">{lesson.type === 'video' ? 'Vídeo' : 'Texto'} • {lesson.durationInMinutes} min</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/admin/cursos/${courseId}/aulas/${lesson.id}`} className="p-1.5 text-text-soft hover:text-primary hover:bg-primary/10 rounded-md transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button className="p-1.5 text-text-soft hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-2 p-2 border-t border-border">
                  <Link href={`/admin/cursos/${courseId}/aulas/nova?module=${module.id}`} className="flex items-center gap-2 w-full p-2 justify-center border-2 border-dashed border-border rounded-lg text-text-soft hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors text-sm font-medium">
                    <Plus className="w-4 h-4" />
                    Adicionar Aula
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
