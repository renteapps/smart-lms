"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Brain, Check, Maximize, Minimize, Star } from "lucide-react";
import { Button, Chip, Separator, Tooltip, buttonVariants } from "@heroui/react";
import VideoPlayer from "./VideoPlayer";
import LessonTabs from "./LessonTabs";
import ProfileTestRunner from "./ProfileTestRunner";
import { Lesson, MOCK_COURSE } from "@/lib/mockData";
import { MOCK_PROFILE_TESTS } from "@/lib/mocks/profileTests";
import { useZenMode } from "@/contexts/ZenModeContext";
import { readLearningTrail, setTrailItemCompletion } from "@/lib/trailStorage";
import { cn } from "@/lib/utils";

interface LessonClientWrapperProps {
  lesson: Lesson;
  courseId: string;
}

/**
 * Sala de aula.
 *
 * É onde a pessoa passa mais tempo, então o cromo recua: um único bloco de
 * cabeçalho, a mídia em destaque e o conteúdo abaixo. As ações da aula
 * (concluir, avaliar, foco) ficam numa linha só, à esquerda; a navegação entre
 * etapas fica à direita, onde a mão procura o "próximo".
 */
export default function LessonClientWrapper({ lesson, courseId }: LessonClientWrapperProps) {
  // Using local state to simulate DB completion
  const [isCompleted, setIsCompleted] = useState(lesson.isCompleted || false);
  const [rating, setRating] = useState(lesson.userRating || 0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const { isZenMode, toggleZenMode } = useZenMode();

  const isProfileTest = lesson.type === 'profile_test';

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const trailItem = readLearningTrail().data?.items.find((item) => item.id === lesson.id);
      if (trailItem) setIsCompleted(trailItem.status === 'completed');
    });
    return () => cancelAnimationFrame(frame);
  }, [lesson.id]);

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

  const handleMarkComplete = (e?: React.MouseEvent<Element>) => {
    const newStatus = true;
    setIsCompleted(newStatus);
    setTrailItemCompletion(lesson.id, true);

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

  const handleToggleComplete = (e: React.MouseEvent<Element>) => {
    if (!isCompleted) {
      handleMarkComplete(e);
    } else {
      setIsCompleted(false);
      setTrailItemCompletion(lesson.id, false);
    }
  };

  const handleVideoEnded = () => {
    if (!isCompleted) {
      setIsCompleted(true);
      setTrailItemCompletion(lesson.id, true);
    }
  };

  const handleRate = (value: number) => {
    setRating(value);
  };

  return (
    <div className="mx-auto w-full max-w-[76rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow" data-numeric>
            Etapa {currentIndex + 1} de {allLessons.length}
          </p>
          {isProfileTest && (
            <Chip color="accent" variant="soft" size="sm">
              <Brain className="size-3.5" aria-hidden="true" />
              Teste de perfil
            </Chip>
          )}
          {isCompleted && (
            <Chip color="success" variant="soft" size="sm">
              <Check className="size-3.5" aria-hidden="true" />
              Concluída
            </Chip>
          )}
        </div>

        <h1 className="display-2 mt-3 text-foreground">{lesson.title}</h1>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant={isCompleted ? "secondary" : "primary"}
              onClick={handleToggleComplete}
              aria-pressed={isCompleted}
              className="gap-2"
            >
              <Check className={cn("size-4", isCompleted && "text-success")} aria-hidden="true" />
              {isCompleted ? "Concluído" : "Marcar como concluído"}
            </Button>

            <div
              role="group"
              aria-label="Avaliação da aula"
              className="flex min-h-11 items-center gap-0.5 rounded-xl border border-hairline bg-surface px-1.5"
              onMouseLeave={() => setHoveredStar(0)}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRate(star)}
                  onHoverStart={() => setHoveredStar(star)}
                  aria-label={`Avaliar com ${star} estrela${star > 1 ? 's' : ''}`}
                  aria-pressed={rating === star}
                  className="rounded-lg"
                >
                  <Star
                    className={cn(
                      "size-4.5 transition-colors duration-[var(--duration-sm)]",
                      (hoveredStar || rating) >= star ? "fill-warning text-warning" : "text-muted",
                    )}
                    aria-hidden="true"
                  />
                </Button>
              ))}
            </div>

            <Tooltip.Root>
              <Tooltip.Trigger>
                <Button
                  variant="ghost"
                  onClick={toggleZenMode}
                  aria-pressed={isZenMode}
                  className="gap-2"
                >
                  {isZenMode ? (
                    <Minimize className="size-4" aria-hidden="true" />
                  ) : (
                    <Maximize className="size-4" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">{isZenMode ? "Sair do foco" : "Modo foco"}</span>
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>
                {isZenMode ? "Sair do modo foco" : "Esconder a navegação e focar na aula"}
              </Tooltip.Content>
            </Tooltip.Root>
          </div>

          <div className="flex items-center gap-2">
            {prevLessonId ? (
              <Link
                href={`/courses/${courseId}/lessons/${prevLessonId}`}
                className={buttonVariants({ variant: "outline", className: "gap-2" })}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Anterior</span>
              </Link>
            ) : (
              <Button variant="outline" isDisabled className="gap-2">
                <ArrowLeft className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
            )}

            {nextLessonId ? (
              <Link
                href={`/courses/${courseId}/lessons/${nextLessonId}`}
                className={buttonVariants({ variant: "primary", className: "icon-spring gap-2" })}
              >
                <span className="hidden sm:inline">Próxima etapa</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <Button variant="primary" isDisabled className="gap-2">
                <span className="hidden sm:inline">Próxima etapa</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        <Separator className="mt-8" />
      </header>

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
