"use client";

import { ArrowLeft, ArrowRight, CheckCircle, Star, Maximize, Minimize, Brain } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import VideoPlayer from "./VideoPlayer";
import LessonTabs from "./LessonTabs";
import ProfileTestRunner from "./ProfileTestRunner";
import { Lesson, MOCK_COURSE } from "@/lib/mockData";
import { MOCK_PROFILE_TESTS } from "@/lib/mocks/profileTests";
import { useZenMode } from "@/contexts/ZenModeContext";

interface LessonClientWrapperProps {
  lesson: Lesson;
  courseId: string;
}

export default function LessonClientWrapper({ lesson, courseId }: LessonClientWrapperProps) {
  // Using local state to simulate DB completion
  const [isCompleted, setIsCompleted] = useState(lesson.isCompleted || false);
  const [rating, setRating] = useState(lesson.userRating || 0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const { isZenMode, toggleZenMode } = useZenMode();

  const isProfileTest = lesson.type === 'profile_test';

  // Find profile test if applicable
  const targetProfileTest = isProfileTest
    ? MOCK_PROFILE_TESTS.find((t) => t.id === lesson.profileTestId) || MOCK_PROFILE_TESTS[0]
    : null;

  // Find previous and next lessons for navigation
  let prevLessonId: string | null = null;
  let nextLessonId: string | null = null;

  const allLessons = MOCK_COURSE.modules.flatMap(m => m.lessons);
  const currentIndex = allLessons.findIndex(l => l.id === lesson.id);

  if (currentIndex > 0) {
    prevLessonId = allLessons[currentIndex - 1].id;
  }
  if (currentIndex < allLessons.length - 1) {
    nextLessonId = allLessons[currentIndex + 1].id;
  }

  const handleMarkComplete = (e?: React.MouseEvent<HTMLButtonElement>) => {
    const newStatus = true;
    setIsCompleted(newStatus);
    
    // Trigger confetti if marking as completed
    const rect = e?.currentTarget?.getBoundingClientRect();
    const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5;
    const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.5;

    import('canvas-confetti').then((module) => {
      const confetti = module.default;
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { x, y },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        startVelocity: 35,
        gravity: 0.8,
        ticks: 200
      });
    });
  };

  const handleToggleComplete = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isCompleted) {
      handleMarkComplete(e);
    } else {
      setIsCompleted(false);
    }
  };

  const handleVideoEnded = () => {
    if (!isCompleted) {
      setIsCompleted(true);
    }
  };

  const handleRate = (value: number) => {
    setRating(value);
  };

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-10">
      {/* Header com Navegação Próxima/Anterior */}
      <div className="mb-7 grid gap-5 border-b border-border pb-6 xl:grid-cols-[1fr_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className="eyebrow">Etapa {currentIndex + 1} de {allLessons.length}</p>
            {isProfileTest && (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Brain className="w-3.5 h-3.5" /> Teste de Perfil
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold tracking-[-0.035em] text-ink md:text-3xl">
            {lesson.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
            <button 
              onClick={handleToggleComplete}
              className={`flex min-h-11 items-center gap-2 rounded-[11px] border px-3 text-sm font-bold transition-colors ${
                isCompleted 
                  ? "border-positive/20 bg-positive/10 text-positive" 
                  : "border-border bg-surface text-text-soft hover:border-primary/40 hover:text-primary-active"
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {isCompleted ? "Concluído" : "Marcar como Concluído"}
            </button>

            <div className="flex min-h-11 items-center gap-0.5 rounded-[11px] border border-border bg-surface px-2" aria-label="Avaliação da aula">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="grid h-8 w-8 place-items-center rounded-[8px] hover:bg-canvas-soft"
                  title={`Avaliar com ${star} estrela${star > 1 ? 's' : ''}`}
                >
                  <Star 
                    className={`w-5 h-5 transition-colors ${
                      (hoveredStar || rating) >= star 
                        ? "fill-yellow-400 text-yellow-400" 
                        : "text-text-soft hover:text-yellow-400"
                    }`} 
                  />
                </button>
              ))}
            </div>

            <button
              onClick={toggleZenMode}
              className="flex min-h-11 items-center gap-2 rounded-[11px] border border-border bg-surface px-3 text-sm font-bold text-text-soft hover:border-primary/40 hover:text-primary-active"
              title={isZenMode ? "Sair do Modo Foco" : "Modo Foco"}
            >
              {isZenMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              <span className="hidden sm:inline">{isZenMode ? "Sair do Foco" : "Modo Foco"}</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-start xl:self-auto">
          {prevLessonId ? (
            <Link
              href={`/courses/${courseId}/lessons/${prevLessonId}`}
              className="flex min-h-11 items-center gap-2 rounded-[11px] border border-border bg-surface px-4 text-sm font-bold text-text-soft hover:border-primary/40 hover:text-primary-active"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Link>
          ) : (
            <div className="flex min-h-11 items-center gap-2 rounded-[11px] border border-border px-4 text-sm font-bold text-text-mute opacity-50">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </div>
          )}
          
          {nextLessonId ? (
            <Link
              href={`/courses/${courseId}/lessons/${nextLessonId}`}
              className="flex min-h-11 items-center gap-2 rounded-[11px] bg-primary px-4 text-sm font-bold text-on-primary shadow-sm hover:bg-primary-active"
            >
              <span className="hidden sm:inline">Próxima Etapa</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
             <div className="flex min-h-11 items-center gap-2 rounded-[11px] border border-border bg-surface text-sm font-bold text-text-mute opacity-50">
              <span className="hidden sm:inline">Próxima Etapa</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Profile Test Runner vs Video Player */}
      {isProfileTest && targetProfileTest ? (
        <ProfileTestRunner
          test={targetProfileTest}
          config={lesson.profileTestConfig}
          onComplete={handleMarkComplete}
        />
      ) : (
        <VideoPlayer lesson={lesson} onEnded={handleVideoEnded} />
      )}

      {/* Tabs */}
      <LessonTabs lesson={lesson} />
    </div>
  );
}
