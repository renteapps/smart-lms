"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { QuizQuestion } from "@/types/quiz";
import { normalizeTag } from "@/lib/matching";
import { gradeQuestion } from "@/lib/quiz/grading";
import { cn } from "@/lib/utils";
import { questionTypeLabel } from "./QuestionInput";

interface QuestionReviewProps {
  question: QuizQuestion;
  index: number;
  answer: unknown;
}

function Badge({ correct }: { correct: boolean }) {
  return correct ? (
    <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
  ) : (
    <XCircle className="size-5 shrink-0 text-danger" aria-hidden="true" />
  );
}

/** Rendição somente-leitura de uma pergunta + a resposta que o aluno já deu, para a tela de "já respondido". */
export default function QuestionReview({ question, index, answer }: QuestionReviewProps) {
  const body = (() => {
    switch (question.type) {
      case "multiple_choice":
      case "true_false": {
        const options = question.options ?? [];
        const selected = options.find((opt) => opt.id === answer);
        const correct = options.find((opt) => opt.isCorrect);
        const isCorrect = Boolean(selected && selected.isCorrect);
        return (
          <div className="flex items-start gap-2">
            <Badge correct={isCorrect} />
            <div className="space-y-1">
              <p className="text-sm text-foreground">
                Sua resposta: <span className="font-medium">{selected?.text || "Não respondida"}</span>
              </p>
              {!isCorrect && correct && (
                <p className="text-sm text-muted">
                  Resposta correta: <span className="font-medium text-foreground">{correct.text}</span>
                </p>
              )}
            </div>
          </div>
        );
      }

      case "multiple_select": {
        const options = question.options ?? [];
        const given = Array.isArray(answer) ? (answer as string[]) : [];
        const selectedTexts = options.filter((opt) => given.includes(opt.id)).map((opt) => opt.text);
        const correctTexts = options.filter((opt) => opt.isCorrect).map((opt) => opt.text);
        const isCorrect = gradeQuestion(question, answer) === 1;
        return (
          <div className="flex items-start gap-2">
            <Badge correct={isCorrect} />
            <div className="space-y-1">
              <p className="text-sm text-foreground">
                Sua resposta:{" "}
                <span className="font-medium">{selectedTexts.length > 0 ? selectedTexts.join(", ") : "Não respondida"}</span>
              </p>
              {!isCorrect && (
                <p className="text-sm text-muted">
                  Resposta correta: <span className="font-medium text-foreground">{correctTexts.join(", ")}</span>
                </p>
              )}
            </div>
          </div>
        );
      }

      case "open_ended": {
        const text = typeof answer === "string" ? answer : "";
        return (
          <div className="rounded-xl border border-hairline bg-background-secondary p-3 text-sm text-foreground whitespace-pre-wrap">
            {text.trim().length > 0 ? text : "Não respondida"}
          </div>
        );
      }

      case "matching": {
        const pairs = question.pairs ?? [];
        const given = answer && typeof answer === "object" ? (answer as Record<string, string>) : {};
        return (
          <div className="space-y-2">
            {pairs.map((pair) => {
              const chosenId = given[pair.id];
              const chosen = pairs.find((p) => p.id === chosenId);
              const isCorrect = chosenId === pair.id;
              return (
                <div key={pair.id} className="flex items-start gap-2">
                  <Badge correct={isCorrect} />
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{pair.left}</span> → {chosen?.right || "Não respondida"}
                    {!isCorrect && (
                      <span className="text-muted"> (correto: {pair.right})</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        );
      }

      case "fill_table": {
        const columns = question.columns ?? [];
        const rows = Array.isArray(answer) ? (answer as Record<string, string>[]) : [];
        const filledRows = rows.filter((row) => row && Object.values(row).some((v) => typeof v === "string" && v.trim()));
        if (filledRows.length === 0) {
          return <p className="text-sm text-muted">Não respondida</p>;
        }
        return (
          <div className="overflow-x-auto rounded-xl border border-hairline">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="bg-background-secondary">
                  {columns.map((col) => (
                    <th key={col.id} className="border-b border-hairline px-3 py-2 text-left font-semibold text-foreground">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filledRows.map((row, i) => (
                  <tr key={i} className="border-b border-hairline last:border-0">
                    {columns.map((col) => (
                      <td key={col.id} className="px-3 py-2 text-foreground">
                        {row[col.id] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case "fill_blank": {
        const blanks = question.blanks ?? [];
        const given = answer && typeof answer === "object" ? (answer as Record<string, string>) : {};
        return (
          <div className="space-y-2">
            {blanks.map((blank, i) => {
              const value = given[blank.id] || "";
              const isCorrect =
                value.trim().length > 0 &&
                blank.acceptedAnswers.some((accepted) => normalizeTag(accepted) === normalizeTag(value));
              return (
                <div key={blank.id} className="flex items-start gap-2">
                  <Badge correct={isCorrect} />
                  <p className="text-sm text-foreground">
                    Lacuna {i + 1}: <span className="font-medium">{value || "Não respondida"}</span>
                    {!isCorrect && (
                      <span className="text-muted"> (aceito: {blank.acceptedAnswers.join(", ")})</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        );
      }

      default:
        return null;
    }
  })();

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4 shadow-xs">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
          {index + 1}
        </span>
        <span className="text-xs font-medium text-muted">{questionTypeLabel(question)}</span>
      </div>
      <p className={cn("mb-3 font-semibold text-foreground", question.type === "fill_blank" && "whitespace-pre-wrap")}>
        {question.type === "fill_blank" ? question.text.replace(/\{\{\d+\}\}/g, "___") : question.text}
      </p>
      {body}
    </div>
  );
}
