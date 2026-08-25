"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Card, Chip, ProgressBar } from "@heroui/react";
import { AlertCircle, ArrowLeft, ClipboardList, RotateCcw, Trophy } from "lucide-react";
import { ArrowRight02Icon } from "@/components/ui/arrow-right-02";
import type { Quiz, QuizResult } from "@/types/quiz";
import { submitQuizResult } from "@/app/actions/progress";
import { isQuestionAnswered } from "@/lib/quiz/grading";
import { cn } from "@/lib/utils";
import QuestionInput, { questionTypeLabel } from "./quiz/QuestionInput";
import QuestionReview from "./quiz/QuestionReview";

interface QuizRunnerProps {
  quiz: Quiz;
  lessonId: string;
  previousResult?: QuizResult | null;
  onComplete: () => void;
}

type Step = "intro" | "review" | "question" | "result";

export default function QuizRunner({ quiz, lessonId, previousResult, onComplete }: QuizRunnerProps) {
  const [step, setStep] = useState<Step>(previousResult ? "review" : "intro");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, startSubmitting] = useTransition();
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingRetake, setConfirmingRetake] = useState(false);

  const totalQuestions = quiz.questions.length;
  const question = quiz.questions[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const currentAnswer = question ? answers[question.id] : null;
  const hasAnsweredCurrent = question ? isQuestionAnswered(question, currentAnswer) : false;

  const handleAnswerChange = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (!isLastQuestion) setCurrentQuestionIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (!isFirstQuestion) setCurrentQuestionIndex((prev) => prev - 1);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    startSubmitting(async () => {
      const res = await submitQuizResult(quiz.id, lessonId, answers);
      if (res.success && res.data) {
        setResult(res.data);
        setStep("result");
        if (res.data.passed) {
          onComplete(); // Mark lesson as completed and trigger confetti
        }
      } else {
        setError(res.message || "Ocorreu um erro ao enviar suas respostas.");
      }
    });
  };

  const handleConfirmRetake = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setResult(null);
    setError(null);
    setConfirmingRetake(false);
    setStep("question");
  };

  const retakeConfirm = (
    <div className="mt-6 w-full max-w-md rounded-2xl border border-warning/30 bg-warning-soft p-5 text-center">
      <p className="text-sm font-medium text-foreground">
        Suas respostas atuais serão substituídas ao refazer o quiz. Deseja continuar?
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setConfirmingRetake(false)}>
          Cancelar
        </Button>
        <Button variant="primary" size="sm" onClick={handleConfirmRetake} className="gap-2">
          <RotateCcw className="size-4" aria-hidden="true" />
          Confirmar e refazer
        </Button>
      </div>
    </div>
  );

  // ---- Tela de introdução ----
  if (step === "intro") {
    return (
      <Card className="mx-auto max-w-2xl overflow-hidden p-0">
        <Card.Content className="flex flex-col items-center px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="grid size-20 place-items-center rounded-3xl bg-accent-soft text-accent shadow-elev-2">
            <ClipboardList className="size-10" aria-hidden="true" />
          </div>
          <span className="eyebrow mt-6 text-accent">Quiz Avaliativo</span>
          <h2 className="display-3 mt-2 text-foreground">{quiz.title}</h2>
          {quiz.description && <p className="lede mx-auto mt-3 max-w-md">{quiz.description}</p>}

          <div className="mt-8 flex w-full max-w-xs items-center justify-between rounded-2xl border border-hairline bg-surface px-6 py-4 shadow-elev-1">
            <span className="text-sm font-medium text-muted">Perguntas</span>
            <span className="text-2xl font-bold font-display text-foreground">{totalQuestions}</span>
          </div>
          <Chip color="accent" variant="soft" size="sm" className="mt-4">
            Nota mínima: {quiz.passingScore}%
          </Chip>

          <Button
            variant="primary"
            size="lg"
            onClick={() => setStep("question")}
            isDisabled={totalQuestions === 0}
            className="mt-8 gap-2 w-full sm:w-auto px-8"
          >
            Iniciar Quiz
            <ArrowRight02Icon size={16} aria-hidden="true" />
          </Button>
        </Card.Content>
      </Card>
    );
  }

  // ---- Tela de "já respondido" ----
  if (step === "review" && previousResult) {
    return (
      <Card className="mx-auto max-w-2xl overflow-hidden p-0">
        <Card.Content className="flex flex-col items-center px-6 py-10 text-center sm:px-10 sm:py-12">
          {previousResult.passed ? (
            <div className="grid size-20 place-items-center rounded-3xl bg-success-soft text-success shadow-elev-2">
              <Trophy className="size-10" aria-hidden="true" />
            </div>
          ) : (
            <div className="grid size-20 place-items-center rounded-3xl bg-warning-soft text-warning shadow-elev-2">
              <AlertCircle className="size-10" aria-hidden="true" />
            </div>
          )}

          <Chip
            color={previousResult.passed ? "success" : "warning"}
            variant="soft"
            size="sm"
            className="mt-6 font-semibold"
          >
            {previousResult.passed ? "Você já foi aprovado neste quiz" : "Você já respondeu este quiz"}
          </Chip>

          <h2 className="display-3 mt-4 text-foreground">{quiz.title}</h2>

          <div className="mt-6 flex w-full max-w-xs items-center justify-between rounded-2xl border border-hairline bg-surface px-6 py-4 shadow-elev-1">
            <span className="text-sm font-medium text-muted">Sua última nota</span>
            <span
              className={cn(
                "text-2xl font-bold font-display",
                previousResult.passed ? "text-success" : "text-warning"
              )}
            >
              {previousResult.score}%
            </span>
          </div>

          <div className="mt-8 w-full space-y-3 text-left">
            {quiz.questions.map((q, i) => (
              <QuestionReview key={q.id} question={q} index={i} answer={previousResult.answers?.[q.id]} />
            ))}
          </div>

          {confirmingRetake ? (
            retakeConfirm
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setConfirmingRetake(true)}
              className="mt-8 gap-2"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Refazer Quiz
            </Button>
          )}
        </Card.Content>
      </Card>
    );
  }

  // ---- Tela de resultado (pós-envio) ----
  if (step === "result" && result) {
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
              confirmingRetake ? (
                retakeConfirm
              ) : (
                <Button variant="primary" size="lg" onClick={() => setConfirmingRetake(true)} className="w-full gap-2 sm:w-auto">
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Tentar novamente
                </Button>
              )
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

  // ---- Fluxo de perguntas ----
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
                  <span className="text-xs font-medium text-muted">{questionTypeLabel(question)}</span>
                </div>
                {question.type !== "fill_blank" && (
                  <h3 className="display-4 text-foreground font-semibold leading-snug">{question.text}</h3>
                )}
              </div>

              <QuestionInput
                question={question}
                value={currentAnswer}
                onChange={(value) => handleAnswerChange(question.id, value)}
              />
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
            <ArrowRight02Icon size={16} aria-hidden="true" />
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
            <ArrowRight02Icon size={16} aria-hidden="true" />
          </Button>
        )}
      </Card.Footer>
    </Card>
  );
}
