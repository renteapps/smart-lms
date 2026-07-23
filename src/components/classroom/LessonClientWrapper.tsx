"use client";

import { ArrowLeft, ArrowRight, CheckCircle, Star, Maximize, Minimize } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import VideoPlayer from "./VideoPlayer";
import LessonTabs from "./LessonTabs";
import { Lesson, MOCK_COURSE } from "@/lib/mockData";
import { useRouter } from "next/navigation";
import { useZenMode } from "@/contexts/ZenModeContext";

interface LessonClientWrapperProps {
  lesson: Lesson;
  courseId: string;
}

export default function LessonClientWrapper({ lesson, courseId }: LessonClientWrapperProps) {
  const router = useRouter();
  // Using local state to simulate DB completion
  const [isCompleted, setIsCompleted] = useState(lesson.isCompleted || false);
  const [rating, setRating] = useState(lesson.userRating || 0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const { isZenMode, toggleZenMode } = useZenMode();

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

  const handleMarkComplete = (e: React.MouseEvent<HTMLButtonElement>) => {
    const newStatus = !isCompleted;
    setIsCompleted(newStatus);
    
    // Trigger confetti if marking as completed
    if (newStatus) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      import('canvas-confetti').then((module) => {
        const confetti = module.default;
        // Efeito de "explosão" dupla mais interessante partindo do botão
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { x, y },
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
          startVelocity: 35,
          gravity: 0.8,
          ticks: 200
        });
        
        setTimeout(() => {
          confetti({
            particleCount: 40,
            spread: 80,
            origin: { x, y },
            colors: ['#fff', '#10b981', '#f59e0b'],
            startVelocity: 25,
            gravity: 1,
            ticks: 150
          });
        }, 150);
      });
    }

    // In a real app, make a fetch/POST request to /api/progress
  };

  const handleVideoEnded = () => {
    if (!isCompleted) {
      setIsCompleted(true);
      // Auto advance optionally
      if (nextLessonId) {
        // setTimeout(() => router.push(`/courses/${courseId}/lessons/${nextLessonId}`), 2000);
      }
    }
  };

  const handleRate = (value: number) => {
    setRating(value);
    // In a real app, make a fetch/POST request to /api/rating
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Header com Navegação Próxima/Anterior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text">
            {lesson.title}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={handleMarkComplete}
              className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full transition-colors border ${
                isCompleted 
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                  : "bg-surface-card text-text-soft border-border hover:border-primary hover:text-primary"
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {isCompleted ? "Aula Concluída" : "Marcar como Concluída"}
            </button>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="p-1 focus:outline-none transition-transform hover:scale-110"
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
              className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full transition-colors border bg-surface-card text-text-soft border-border hover:border-primary hover:text-primary"
              title={isZenMode ? "Sair do Modo Foco" : "Modo Foco"}
            >
              {isZenMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              <span className="hidden sm:inline">{isZenMode ? "Sair do Foco" : "Modo Foco"}</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3 self-start md:self-auto">
          {prevLessonId ? (
            <Link
              href={`/courses/${courseId}/lessons/${prevLessonId}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary text-text-soft hover:text-primary transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border opacity-50 cursor-not-allowed text-text-soft text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </div>
          )}
          
          {nextLessonId ? (
            <Link
              href={`/courses/${courseId}/lessons/${nextLessonId}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors text-sm font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="hidden sm:inline">Próxima Aula</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
             <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-card text-text-soft cursor-not-allowed transition-colors text-sm font-medium border border-border">
              <span className="hidden sm:inline">Próxima Aula</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Video Player */}
      <VideoPlayer lesson={lesson} onEnded={handleVideoEnded} />

      {/* Tabs */}
      <LessonTabs lesson={lesson} />
    </div>
  );
}
