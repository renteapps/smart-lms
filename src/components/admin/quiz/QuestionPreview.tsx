"use client";

import { Check, Circle } from "lucide-react";
import { Chip } from "@heroui/react";
import type { QuizQuestion } from "@/types/quiz";
import { QUESTION_TYPE_LABELS } from "@/lib/quiz/aiQuestions";

/**
 * Leitura rápida de uma pergunta antes de ela entrar no builder. É só leitura:
 * a edição continua nos cartões do `QuizBuilderForm`.
 */
export default function QuestionPreview({ question }: { question: QuizQuestion }) {
  return (
    <div className="space-y-2">
      <Chip color="default" variant="soft" size="sm">
        {QUESTION_TYPE_LABELS[question.type]}
      </Chip>

      <p className="text-sm font-semibold text-foreground">{question.text}</p>

      {question.options && question.options.length > 0 && (
        <ul className="space-y-1">
          {question.options.map((option) => (
            <li key={option.id} className="flex items-start gap-2 text-sm">
              {option.isCorrect ? (
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
              )}
              <span className={option.isCorrect ? "font-medium text-foreground" : "text-muted"}>
                {option.text}
              </span>
              {option.isCorrect && <span className="sr-only">(resposta correta)</span>}
            </li>
          ))}
        </ul>
      )}

      {question.pairs && question.pairs.length > 0 && (
        <ul className="space-y-1 text-sm">
          {question.pairs.map((pair) => (
            <li key={pair.id} className="flex items-center gap-2 text-muted">
              <span className="font-medium text-foreground">{pair.left}</span>
              <span aria-hidden="true">→</span>
              <span>{pair.right}</span>
            </li>
          ))}
        </ul>
      )}

      {question.columns && question.columns.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {question.columns.map((column) => (
            <Chip key={column.id} color="accent" variant="soft" size="sm">
              {column.header}
            </Chip>
          ))}
          <span className="text-xs text-muted">
            mínimo de {question.minRows ?? 1} {question.minRows === 1 ? "linha" : "linhas"}
          </span>
        </div>
      )}

      {question.blanks && question.blanks.length > 0 && (
        <ul className="space-y-1 text-sm">
          {question.blanks.map((blank, index) => (
            <li key={blank.id} className="text-muted">
              <span className="font-medium text-foreground">{`{{${index + 1}}}`}</span>{" "}
              {blank.options && blank.options.length > 0
                ? blank.options.find((option) => option.isCorrect)?.text
                : blank.acceptedAnswers.join(" · ")}
            </li>
          ))}
        </ul>
      )}

      {question.explanation && (
        <p className="border-t border-border pt-2 text-xs text-muted">
          <span className="font-semibold">Feedback:</span> {question.explanation}
        </p>
      )}
    </div>
  );
}
