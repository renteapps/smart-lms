"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Brain, Check, History, Maximize, Minimize, Star } from "lucide-react";
import { Button, Chip, Separator, Tooltip, buttonVariants } from "@heroui/react";
import VideoPlayer from "./VideoPlayer";
import LessonTabs from "./LessonTabs";
import ProfileTestRunner from "./ProfileTestRunner";
import QuizRunner from "./QuizRunner";
import type { CourseOutline, Lesson } from "@/types/course";
import type { ProfileTest } from "@/types/profileTest";
import type { Quiz } from "@/types/quiz";
import type { StudentNote } from "@/lib/data/notes";
import type { Comment } from "@/lib/data/comments";
import type { User } from "@supabase/supabase-js";
import { useZenMode } from "@/contexts/ZenModeContext";
import { rateLesson, saveWatchPosition, setLessonCompletion } from "@/app/actions/progress";
import { setTrailItemCompletion } from "@/app/actions/trail";
import { formatPandaVideoDuration } from "@/lib/pandavideo";
import { cn } from "@/lib/utils";

/**
 * Fora do componente: `sendBeacon` precisa sobreviver ao descarregamento da
 * página, então não pode depender de nenhum estado do React em voo — só do
 * que já foi lido antes de chamar.
 */
function beaconWatchPosition(lessonId: string, second: number) {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;
  const blob = new Blob([JSON.stringify({ lessonId, second })], { type: "application/json" });
  navigator.sendBeacon("/api/lesson-progress", blob);
}

interface LessonClientWrapperProps {
  lesson: Lesson;
  course: CourseOutline;
  courseId: string;
  profileTests: ProfileTest[];
  initialNote: StudentNote | null;
  quiz?: Quiz | null;
  initialComments?: Comment[];
  currentUser?: User | null;
}

/**
 * Sala de aula.
 *
 * É onde a pessoa passa mais tempo, então o cromo recua: um único bloco de
 * cabeçalho, a mídia em destaque e o conteúdo abaixo. As ações da aula
 * (concluir, avaliar, foco) ficam numa linha só, à esquerda; a navegação entre
 * etapas fica à direita, onde a mão procura o "próximo".
 */
export default function LessonClientWrapper({
  lesson,
  course,
  courseId,
  profileTests,
  initialNote,
  quiz,
  initialComments = [],
  currentUser = null,
}: LessonClientWrapperProps) {
  /*
   * O estado local é otimista: a marcação aparece na hora e a Server Action
   * grava em seguida. O valor que chega do servidor é a origem da verdade a
   * cada navegação, então não há espaço para os dois divergirem por muito tempo.
   */
  const [isCompleted, setIsCompleted] = useState(lesson.isCompleted || false);
  const [rating, setRating] = useState(lesson.userRating || 0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [, startTransition] = useTransition();
  const { isZenMode, toggleZenMode } = useZenMode();

  /*
   * "Continuar assistindo" na home lê `last_watched_second`. Sem throttle,
   * `timeupdate` dispara várias vezes por segundo — só gravamos quando o
   * vídeo avançou pelo menos 10s desde o último envio. `latestSecondRef`
   * guarda a posição mais recente mesmo entre um envio e outro, pra podermos
   * forçar a gravação assim que o aluno pausa (evento do PandaVideo/`<video>`),
   * sem esperar os próximos 10s de avanço.
   */
  const lastSavedSecondRef = useRef(0);
  const latestSecondRef = useRef(0);

  const persistWatchPosition = (seconds: number) => {
    lastSavedSecondRef.current = seconds;
    startTransition(async () => {
      await saveWatchPosition(lesson.id, seconds);
    });
  };

  const handleTimeUpdate = (seconds: number) => {
    latestSecondRef.current = seconds;
    if (seconds < 1 || Math.abs(seconds - lastSavedSecondRef.current) < 10) return;
    persistWatchPosition(seconds);
  };

  const handleVideoPaused = () => {
    const seconds = latestSecondRef.current;
    if (seconds < 1 || seconds === lastSavedSecondRef.current) return;
    persistWatchPosition(seconds);
  };

  /*
   * "Continuar de onde parei": a aula pula pra cá assim que o player aceitar
   * comando de seek. Aula já concluída não retoma — reabrir pra rever começa
   * do início — e menos de 5s de vídeo não vale o salto.
   */
  const resumeAt = !isCompleted && (lesson.lastWatchedSecond ?? 0) > 5 ? lesson.lastWatchedSecond! : 0;

  /*
   * A cada aula (troca de `lesson.id`, sem remontar o componente — a
   * navegação entre etapas troca só a prop), os refs de posição partem do que
   * o servidor já sabe, não de zero.
   */
  useEffect(() => {
    lastSavedSecondRef.current = lesson.lastWatchedSecond ?? 0;
    latestSecondRef.current = lesson.lastWatchedSecond ?? 0;
  }, [lesson.id, lesson.lastWatchedSecond]);

  /*
   * "Saiu do vídeo": aba escondida, navegador fechado ou troca de aula dentro
   * do app. Nenhum desses dá tempo para uma Server Action normal — por isso
   * `sendBeacon`, que o navegador entrega mesmo com a página descarregando.
   * O cleanup (troca de `lesson.id` ou desmontagem) cobre a navegação interna;
   * `pagehide`/`visibilitychange` cobrem fechar a aba ou trocar de app.
   */
  useEffect(() => {
    const flush = () => {
      const seconds = latestSecondRef.current;
      if (seconds < 1 || seconds === lastSavedSecondRef.current) return;
      beaconWatchPosition(lesson.id, seconds);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [lesson.id]);

  const isProfileTest = lesson.type === 'profile_test';

  const targetProfileTest = isProfileTest
    ? profileTests.find((test) => test.id === lesson.profileTestId) ?? profileTests[0] ?? null
    : null;

  // Find previous and next lessons for navigation
  let prevLessonId: string | null = null;
  let nextLessonId: string | null = null;

  const allLessons = course.modules.flatMap((mod) => mod.lessons);
  const currentIndex = allLessons.findIndex(l => l.id === lesson.id);

  if (currentIndex > 0) {
    const prev = allLessons[currentIndex - 1];
    prevLessonId = prev.slug || prev.id;
  }
  if (currentIndex < allLessons.length - 1) {
    const next = allLessons[currentIndex + 1];
    nextLessonId = next.slug || next.id;
  }

  const persistCompletion = (completed: boolean) => {
    startTransition(async () => {
      await setLessonCompletion(lesson.id, completed, courseId);
      // A aula também pode estar agendada na trilha; manter os dois em sincronia.
      await setTrailItemCompletion(lesson.id, completed);
    });
  };

  const handleMarkComplete = (e?: React.MouseEvent<Element>) => {
    setIsCompleted(true);
    persistCompletion(true);

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
      persistCompletion(false);
    }
  };

  const handleVideoEnded = () => {
    if (!isCompleted) {
      setIsCompleted(true);
      persistCompletion(true);
    }
  };

  const handleRate = (value: number) => {
    setRating(value);
    startTransition(async () => {
      await rateLesson(lesson.id, value);
    });
  };

  return (
    <div className="mx-auto w-full max-w-[76rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12">
      <header className="mb-7 sm:mb-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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

        <h1 className="display-2 mt-3 break-words text-foreground">{lesson.title}</h1>

        {/*
          Abaixo de `lg` as ações e a navegação viram duas linhas empilhadas: no
          celular não há largura para "concluir + avaliar + navegar" na mesma
          faixa sem quebrar em pedaços desalinhados.
        */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-6 lg:gap-y-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {lesson.type !== 'quiz' && !isProfileTest && (
              <>
                <Button
                  variant={isCompleted ? "secondary" : "primary"}
                  onClick={handleToggleComplete}
                  aria-pressed={isCompleted}
                  className="w-full gap-2 sm:w-auto"
                >
                  <Check className={cn("size-4", isCompleted && "text-success")} aria-hidden="true" />
                  {isCompleted ? "Concluído" : "Marcar como concluído"}
                </Button>

                <div
                  role="group"
                  aria-label="Avaliação da aula"
                  className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-hairline bg-surface px-1.5 sm:flex-none sm:justify-start"
                  onMouseLeave={() => setHoveredStar(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      isIconOnly
                      variant="ghost"
                      onClick={() => handleRate(star)}
                      onMouseEnter={() => setHoveredStar(star)}
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
              </>
            )}

            {/*
              O modo foco só esconde o índice do curso — que abaixo de `lg` já é
              um Drawer fechado. No celular ele não teria o que esconder, então
              some junto com a coluna que ele controla.
            */}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Button
                  variant="ghost"
                  onClick={toggleZenMode}
                  aria-pressed={isZenMode}
                  className="hidden gap-2 lg:inline-flex"
                >
                  {isZenMode ? (
                    <Minimize className="size-4" aria-hidden="true" />
                  ) : (
                    <Maximize className="size-4" aria-hidden="true" />
                  )}
                  <span>{isZenMode ? "Sair do foco" : "Modo foco"}</span>
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>
                {isZenMode ? "Sair do modo foco" : "Esconder a navegação e focar na aula"}
              </Tooltip.Content>
            </Tooltip.Root>
          </div>

          <div className="flex items-center gap-2 max-lg:w-full">
            {prevLessonId ? (
              <Link
                href={`/courses/${courseId}/lessons/${prevLessonId}`}
                className={buttonVariants({ variant: "outline", className: "gap-2 max-lg:flex-1" })}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Anterior
              </Link>
            ) : (
              <Button variant="outline" isDisabled className="gap-2 max-lg:flex-1">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Anterior
              </Button>
            )}

            {nextLessonId ? (
              <Link
                href={`/courses/${courseId}/lessons/${nextLessonId}`}
                className={buttonVariants({
                  variant: "primary",
                  className: "icon-spring gap-2 max-lg:flex-1",
                })}
              >
                <span>
                  Próxima<span className="hidden sm:inline">&nbsp;etapa</span>
                </span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <Button variant="primary" isDisabled className="gap-2 max-lg:flex-1">
                <span>
                  Próxima<span className="hidden sm:inline">&nbsp;etapa</span>
                </span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        <Separator className="mt-7 sm:mt-8" />
      </header>

      {/* Main Content: Profile Test Runner vs Video Player vs Quiz Runner */}
      {isProfileTest && targetProfileTest ? (
        <ProfileTestRunner
          test={targetProfileTest}
          config={lesson.profileTestConfig}
          onComplete={handleMarkComplete}
        />
      ) : lesson.type === 'quiz' && quiz ? (
        <QuizRunner 
          quiz={quiz} 
          lessonId={lesson.id} 
          onComplete={handleMarkComplete} 
        />
      ) : (
        <>
          {resumeAt > 0 && (
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted" data-numeric>
              <History className="size-3.5" aria-hidden="true" />
              Retomando de {formatPandaVideoDuration(resumeAt)}
            </p>
          )}
          <VideoPlayer
            lesson={lesson}
            onEnded={handleVideoEnded}
            onTimeUpdate={handleTimeUpdate}
            onPause={handleVideoPaused}
            startAt={resumeAt}
          />
        </>
      )}

      {/* Tabs */}
      {lesson.type !== 'quiz' && (
        <LessonTabs
          lesson={lesson}
          initialNote={initialNote}
          initialComments={initialComments}
          currentUser={currentUser}
          enableComments={course.enableComments}
        />
      )}
    </div>
  );
}
