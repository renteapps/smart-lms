"use client";

import { useState, useTransition } from "react";
import { Button } from "@heroui/react";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import type { Quiz, QuizQuestion } from "@/types/quiz";
import { submitQuizResult } from "@/app/actions/progress";

interface QuizRunnerProps {
  quiz: Quiz;
  lessonId: string;
  onComplete: () => void;
}

export default function QuizRunner({ quiz, lessonId, onComplete }: QuizRunnerProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, startSubmitting] = useTransition();
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
          <Button variant="primary" onClick={() => { setResult(null); setAnswers({}); }}>
            Tentar Novamente
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl bg-surface border border-border rounded-2xl p-6 sm:p-10 shadow-sm">
      <div className="mb-8 border-b border-border pb-6 text-center">
        <h2 className="text-2xl font-bold text-foreground">{quiz.title}</h2>
        {quiz.description && (
          <p className="text-muted mt-2">{quiz.description}</p>
        )}
        <p className="text-sm font-medium text-accent mt-4">
          Nota mínima para aprovação: {quiz.passingScore}%
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {quiz.questions.map((q: QuizQuestion, index: number) => (
          <div key={q.id} className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex gap-3">
              <span className="text-accent">{index + 1}.</span> {q.text}
            </h3>

            {q.type === 'open_ended' ? (
              <textarea
                required
                rows={4}
                value={answers[q.id] || ""}
                onChange={(e) => handleOpenEndedChange(q.id, e.target.value)}
                placeholder="Escreva sua resposta..."
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors resize-y"
              />
            ) : (
              <div className="space-y-3">
                {q.options?.map(opt => {
                  const isMultiple = q.type === 'multiple_select';
                  const isSelected = isMultiple 
                    ? (answers[q.id] || []).includes(opt.id)
                    : answers[q.id] === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(q.id, opt.id, isMultiple)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                        isSelected 
                          ? 'border-accent bg-accent/5 text-accent-foreground' 
                          : 'border-border bg-background hover:bg-surface-hover hover:border-accent/50'
                      }`}
                    >
                      <div className={`shrink-0 ${isSelected ? 'text-accent' : 'text-muted'}`}>
                        {isSelected ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
                      </div>
                      <span className="text-sm font-medium">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {error && (
          <p className="text-sm font-medium text-danger text-center bg-danger/10 p-3 rounded-lg">
            {error}
          </p>
        )}

        <div className="pt-6 border-t border-border flex justify-center">
          <Button
            type="submit"
            isDisabled={isSubmitting}
            variant="primary"
            size="lg"
            className="w-full sm:w-auto px-12"
          >
            {isSubmitting ? "Enviando..." : "Finalizar Quiz"}
          </Button>
        </div>
      </form>
    </div>
  );
}
