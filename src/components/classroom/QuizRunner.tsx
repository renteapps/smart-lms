"use client";

import { useState, useTransition } from "react";
import { Button } from "@heroui/react";
import { CheckCircle2, Circle, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";
import type { Quiz, QuizQuestion } from "@/types/quiz";
import { submitQuizResult } from "@/app/actions/progress";

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

  const question = quiz.questions[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  const handleSelectOption = (questionId: string, optionId: string, isMultiple: boolean) => {
    setAnswers(prev => {
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
    setAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1);
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
          onComplete(); // Mark lesson as completed if passed
        }
      } else {
        setError(res.message || "Ocorreu um erro ao enviar suas respostas.");
      }
    });
  };

  if (result) {
    return (
      <div className="mx-auto max-w-2xl text-center py-12 px-4 bg-surface border border-border rounded-2xl shadow-sm">
        {result.passed ? (
          <CheckCircle2 className="mx-auto size-16 text-success mb-6" />
        ) : (
          <AlertCircle className="mx-auto size-16 text-warning mb-6" />
        )}
        <h2 className="text-3xl font-display font-bold text-foreground mb-4">
          {result.passed ? "Parabéns! Você foi aprovado." : "Não foi dessa vez."}
        </h2>
        <p className="text-muted text-lg mb-8">
          Sua nota foi <strong className="text-foreground">{result.score}%</strong>. 
          A nota de corte era de {quiz.passingScore}%.
        </p>
        {!result.passed && (
          <Button variant="primary" onClick={() => { 
            setResult(null); 
            setAnswers({}); 
            setCurrentQuestionIndex(0);
          }}>
            Tentar Novamente
          </Button>
        )}
      </div>
    );
  }

  // Calculate progress
  const progressPercent = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="mx-auto max-w-3xl bg-surface border border-border rounded-2xl p-6 sm:p-10 shadow-sm">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-foreground">{quiz.title}</h2>
        {quiz.description && (
          <p className="text-muted mt-2">{quiz.description}</p>
        )}
        <p className="text-sm font-medium text-accent mt-4">
          Nota mínima para aprovação: {quiz.passingScore}%
        </p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted mb-2 font-medium">
          <span>Pergunta {currentQuestionIndex + 1} de {quiz.questions.length}</span>
          <span>{Math.round(progressPercent)}% concluído</span>
        </div>
        <div className="w-full bg-border rounded-full h-2.5">
          <div 
            className="bg-accent h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-6 min-h-[300px]">
        {question && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-semibold text-foreground flex gap-3 leading-snug">
              <span className="text-accent">{currentQuestionIndex + 1}.</span> {question.text}
            </h3>

            {question.type === 'open_ended' ? (
              <textarea
                required
                rows={5}
                value={answers[question.id] || ""}
                onChange={(e) => handleOpenEndedChange(question.id, e.target.value)}
                placeholder="Escreva sua resposta..."
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-base focus:outline-none focus:border-accent transition-colors resize-y"
              />
            ) : (
              <div className="space-y-3">
                {question.options?.map(opt => {
                  const isMultiple = question.type === 'multiple_select';
                  const isSelected = isMultiple 
                    ? (answers[question.id] || []).includes(opt.id)
                    : answers[question.id] === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(question.id, opt.id, isMultiple)}
                      className={`w-full flex items-center gap-4 p-5 rounded-xl border text-left transition-colors ${
                        isSelected 
                          ? 'border-accent bg-accent/5 text-accent-foreground ring-1 ring-accent' 
                          : 'border-border bg-background hover:bg-surface-hover hover:border-accent/50'
                      }`}
                    >
                      <div className={`shrink-0 ${isSelected ? 'text-accent' : 'text-muted'}`}>
                        {isSelected ? <CheckCircle2 className="size-6" /> : <Circle className="size-6" />}
                      </div>
                      <span className="text-base font-medium">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm font-medium text-danger text-center bg-danger/10 p-3 rounded-lg mt-4">
            {error}
          </p>
        )}
      </div>

      <div className="pt-8 mt-8 border-t border-border flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          isDisabled={isFirstQuestion}
          onClick={handlePrev}
          className="gap-2"
        >
          <ArrowLeft className="size-4" /> Anterior
        </Button>

        {isLastQuestion ? (
          <Button
            type="button"
            onClick={() => handleSubmit()}
            isDisabled={isSubmitting || !answers[question.id]}
            variant="primary"
            className="gap-2"
          >
            {isSubmitting ? "Enviando..." : "Finalizar Quiz"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleNext}
            isDisabled={!answers[question.id] || (Array.isArray(answers[question.id]) && answers[question.id].length === 0)}
            variant="primary"
            className="gap-2"
          >
            Próxima <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
