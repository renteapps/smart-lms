"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Card, Chip, ProgressBar } from "@heroui/react";
import { CheckCircle2, Circle, AlertCircle, ArrowRight, ArrowLeft, Trophy, CheckSquare, Square, RotateCcw } from "lucide-react";
import type { Quiz, QuizQuestion } from "@/types/quiz";
import { submitQuizResult } from "@/app/actions/progress";
import { cn } from "@/lib/utils";

interface QuizRunnerProps {
  quiz: Quiz;
  lessonId: string;
  onComplete: () => void;
}

export default function QuizRunner({ quiz, lessonId, onComplete }: QuizRunnerProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, startSubmitting] = useTransition();
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalQuestions = quiz.questions.length;
  const question = quiz.questions[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const currentAnswer = question ? answers[question.id] : null;
  const hasAnsweredCurrent = question
    ? question.type === "multiple_select"
      ? Array.isArray(currentAnswer) && currentAnswer.length > 0
      : question.type === "open_ended"
      ? typeof currentAnswer === "string" && currentAnswer.trim().length > 0
      : Boolean(currentAnswer)
    : false;

  const handleSelectOption = (questionId: string, optionId: string, isMultiple: boolean) => {
    setAnswers((prev) => {
      if (isMultiple) {
        const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
        if (current.includes(optionId)) {
          return { ...prev, [questionId]: current.filter((id: string) => id !== optionId) };
        } else {
          return { ...prev, [questionId]: [...current, optionId] };
        }
      } else {
        return { ...prev, [questionId]: optionId };
      }
    });
  };

  const handleOpenEndedChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    startSubmitting(async () => {
      const res = await submitQuizResult(quiz.id, lessonId, answers);
      if (res.success && res.data) {
        setResult(res.data);
        if (res.data.passed) {
          onComplete(); // Mark lesson as completed and trigger confetti
        }
      } else {
        setError(res.message || "Ocorreu um erro ao enviar suas respostas.");
      }
    });
  };

  if (result) {
    return (
      <Card className="mx-auto max-w-2xl overflow-hidden p-0">
        <Card.Content className="flex flex-col items-center px-6 py-12 text-center sm:px-12 sm:py-16">
          {result.passed ? (
            <div className="grid size-20 place-items-center rounded-3xl bg-success-soft text-success shadow-elev-2">
              <Trophy className="size-10" aria-hidden="true" />
            </div>
          ) : (
            <div className="grid size-20 place-items-center rounded-3xl bg-warning-soft text-warning shadow-elev-2">
              <AlertCircle className="size-10" aria-hidden="true" />
            </div>
          )}

          <Chip
            color={result.passed ? "success" : "warning"}
            variant="soft"
            size="sm"
            className="mt-6 font-semibold"
          >
            {result.passed ? "Aprovado no Quiz" : "Nota abaixo da média"}
          </Chip>

          <h2 className="display-3 mt-4 text-foreground">
            {result.passed ? "Parabéns! Você passou no teste." : "Não foi dessa vez."}
          </h2>

          <p className="lede mx-auto mt-3 max-w-md">
            {result.passed
              ? "Sua resposta foi avaliada com sucesso e a etapa foi marcada como concluída."
              : `Você precisa de pelo menos ${quiz.passingScore}% de acertos para concluir esta etapa.`}
          </p>

          <div className="mt-8 flex w-full max-w-xs items-center justify-between rounded-2xl border border-hairline bg-surface px-6 py-4 shadow-elev-1">
            <span className="text-sm font-medium text-muted">Sua pontuação</span>
            <span className={cn("text-2xl font-bold font-display", result.passed ? "text-success" : "text-warning")}>
              {result.score}%
            </span>
          </div>

          <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            {!result.passed ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setResult(null);
                  setAnswers({});
                  setCurrentQuestionIndex(0);
                }}
                className="w-full gap-2 sm:w-auto"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Tentar novamente
              </Button>
            ) : (
              <Chip color="success" variant="soft" size="lg" className="px-4 py-2 text-sm font-medium">
                Etapa concluída automaticamente ✓
              </Chip>
            )}
          </div>
        </Card.Content>
      </Card>
    );
  }

  const progressPercent = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 100;

  return (
    <Card className="mx-auto max-w-3xl overflow-hidden p-0 shadow-elev-2">
      {/* Quiz Top Header */}
      <Card.Header className="flex-col items-stretch gap-4 border-b border-separator bg-background-secondary px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="eyebrow text-accent">Quiz Avaliativo</span>
            <h2 className="display-4 text-foreground mt-0.5">{quiz.title}</h2>
          </div>
          <Chip color="accent" variant="soft" size="sm">
            Nota mínima: {quiz.passingScore}%
          </Chip>
        </div>

        {quiz.description && (
          <p className="text-sm text-muted">{quiz.description}</p>
        )}

        {/* Progress Bar */}
        <ProgressBar
          value={progressPercent}
          color="accent"
          size="sm"
          aria-label={`Pergunta ${currentQuestionIndex + 1} de ${totalQuestions}`}
          className="mt-1"
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted" data-numeric>
              Pergunta {currentQuestionIndex + 1} de {totalQuestions}
            </span>
            <span className="text-accent" data-numeric>
              {Math.round(progressPercent)}%
            </span>
          </div>
          <ProgressBar.Track className="mt-1.5 h-2 rounded-full bg-border/60">
            <ProgressBar.Fill className="rounded-full transition-all duration-300 ease-out" />
          </ProgressBar.Track>
        </ProgressBar>
      </Card.Header>

      {/* Quiz Body */}
      <Card.Content className="px-6 py-8 sm:px-8 sm:py-10">
        <AnimatePresence mode="wait">
          {question && (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                    {currentQuestionIndex + 1}
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {question.type === "multiple_select"
                      ? "Múltipla escolha (selecione todas as corretas)"
                      : question.type === "open_ended"
                      ? "Resposta dissertativa"
                      : "Escolha única"}
                  </span>
                </div>
                <h3 className="display-4 text-foreground font-semibold leading-snug">
                  {question.text}
                </h3>
              </div>

              {question.type === "open_ended" ? (
                <div className="mt-4">
                  <textarea
                    required
                    rows={5}
                    value={answers[question.id] || ""}
                    onChange={(e) => handleOpenEndedChange(question.id, e.target.value)}
                    placeholder="Digite sua resposta aqui com detalhes..."
                    className="w-full rounded-xl border border-hairline bg-surface p-4 text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-y shadow-xs"
                  />
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {question.options?.map((opt, optIndex) => {
                    const isMultiple = question.type === "multiple_select";
                    const isSelected = isMultiple
                      ? (answers[question.id] || []).includes(opt.id)
                      : answers[question.id] === opt.id;
                    const letter = String.fromCharCode(65 + optIndex);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(question.id, opt.id, isMultiple)}
                        className={cn(
                          "group flex w-full items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer shadow-xs",
                          isSelected
                            ? "border-accent bg-accent-soft/80 ring-2 ring-accent/25 shadow-sm"
                            : "border-hairline bg-surface hover:border-accent/40 hover:bg-surface-hover"
                        )}
                      >
                        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                          <span
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-xl text-sm font-bold transition-colors",
                              isSelected
                                ? "bg-accent text-white shadow-xs"
                                : "border border-hairline bg-background text-muted group-hover:text-foreground group-hover:border-accent/40"
                            )}
                          >
                            {letter}
                          </span>
                          <span
                            className={cn(
                              "text-base sm:text-lg leading-relaxed transition-colors",
                              isSelected
                                ? "font-semibold text-foreground"
                                : "font-normal text-foreground"
                            )}
                          >
                            {opt.text}
                          </span>
                        </div>

                        <div className="shrink-0 pl-2">
                          {isMultiple ? (
                            isSelected ? (
                              <CheckSquare className="size-5 text-accent" aria-hidden="true" />
                            ) : (
                              <Square className="size-5 text-muted/60 group-hover:text-muted" aria-hidden="true" />
                            )
                          ) : isSelected ? (
                            <CheckCircle2 className="size-5 text-accent" aria-hidden="true" />
                          ) : (
                            <Circle className="size-5 text-muted/60 group-hover:text-muted" aria-hidden="true" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-danger-soft p-4 text-sm font-medium text-danger">
            <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </Card.Content>

      {/* Navigation Footer */}
      <Card.Footer className="flex flex-wrap items-center justify-between gap-3 border-t border-separator bg-background-secondary/60 px-6 py-4 sm:px-8">
        <Button
          type="button"
          variant="outline"
          isDisabled={isFirstQuestion}
          onClick={handlePrev}
          className="gap-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Anterior
        </Button>

        {isLastQuestion ? (
          <Button
            type="button"
            onClick={() => handleSubmit()}
            isDisabled={isSubmitting || !hasAnsweredCurrent}
            variant="primary"
            className="gap-2 px-6"
          >
            {isSubmitting ? "Finalizando..." : "Finalizar Quiz"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleNext}
            isDisabled={!hasAnsweredCurrent}
            variant="primary"
            className="gap-2 px-6"
          >
            Próxima
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </Card.Footer>
    </Card>
  );
}
