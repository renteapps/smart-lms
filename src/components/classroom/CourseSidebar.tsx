"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, CheckCircle, PlayCircle, FileText, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useParams } from "next/navigation";
import { MOCK_COURSE, Lesson } from "@/lib/mockData";
import { useZenMode } from "@/contexts/ZenModeContext";

export default function CourseSidebar() {
  const params = useParams();
  const courseId = params.id as string;
  const currentLessonId = params.lessonId as string;
  
  // Usando mock data para exemplo, normalmente faria fetch do curso
  const course = MOCK_COURSE;
  const { isZenMode } = useZenMode();

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(
    course.modules.reduce((acc, module) => ({ ...acc, [module.id]: true }), {})
  );

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const getLessonIcon = (type: string, isCompleted?: boolean) => {
    if (isCompleted) return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (type === 'video') return <PlayCircle className="w-4 h-4 text-text-soft" />;
    if (type === 'text') return <FileText className="w-4 h-4 text-text-soft" />;
    return <PlayCircle className="w-4 h-4 text-text-soft" />;
  };

  // Calcular progresso real
  const totalLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
  const completedLessons = course.modules.reduce((acc, mod) => {
    return acc + mod.lessons.filter(l => l.isCompleted).length;
  }, 0);
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  if (isZenMode) return null;

  return (
    <aside className="w-80 bg-surface border-r border-border h-screen overflow-y-auto flex-shrink-0 flex flex-col">
      <div className="p-4 border-b border-border flex items-center gap-2 text-text-soft hover:text-text transition-colors">
        <Link href={currentLessonId ? `/courses/${courseId}` : "/"} className="flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          {currentLessonId ? "Voltar ao curso" : "Voltar ao Início"}
        </Link>
      </div>

      <div className="p-6 border-b border-border">
        <h2 className="font-bold text-lg">{course.title}</h2>
        <div className="mt-4 w-full bg-surface-card border border-border rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
        </div>
        <p className="text-xs text-text-soft mt-2 font-medium">{progressPercentage}% concluído</p>
      </div>

      <div className="py-2 flex-1">
        {course.modules.map((module) => (
          <div key={module.id} className="border-b border-border last:border-b-0">
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors text-left"
            >
              <div>
                <span className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Módulo {module.order}</span>
                <h3 className="font-medium text-sm mt-1">{module.title}</h3>
              </div>
              {expandedModules[module.id] ? (
                <ChevronUp className="w-4 h-4 text-text-soft" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-soft" />
              )}
            </button>

            {expandedModules[module.id] && (
              <div className="bg-surface-card">
                {module.lessons.map((lesson: Lesson) => {
                  const isActive = lesson.id === currentLessonId;
                  return (
                    <Link
                      key={lesson.id}
                      href={`/courses/${courseId}/lessons/${lesson.id}`}
                      className={`flex items-start gap-3 p-3 pl-4 border-l-2 transition-colors ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:bg-surface-hover"
                      }`}
                    >
                      <div className="mt-1">
                        {getLessonIcon(lesson.type, lesson.isCompleted)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isActive ? "font-bold text-primary" : "font-medium text-text"}`}>
                          {lesson.title}
                        </p>
                        <p className="text-xs text-text-soft mt-1 flex items-center gap-1">
                          <PlayCircle className="w-3 h-3" />
                          {lesson.durationInMinutes} min
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
