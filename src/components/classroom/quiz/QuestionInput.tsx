"use client";

import { useMemo } from "react";
import { CheckCircle2, Circle, CheckSquare, Plus, Square, Trash2 } from "lucide-react";
import type { QuizQuestion } from "@/types/quiz";
import { cn } from "@/lib/utils";

interface QuestionInputProps {
  question: QuizQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Divide o template de "preencher lacunas" em texto/marcador, preservando a ordem. */
function splitBlankTemplate(text: string): Array<{ kind: "text"; value: string } | { kind: "blank"; index: number }> {
  const parts: Array<{ kind: "text"; value: string } | { kind: "blank"; index: number }> = [];
  const regex = /\{\{(\d+)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) {
      parts.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ kind: "blank", index: Number(match[1]) - 1 });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ kind: "text", value: text.slice(lastIndex) });
  }
  return parts;
}

/** Captura de resposta do aluno, uma pergunta por vez, com um renderer por tipo. */
export default function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  const matchingOptions = useMemo(
    () => shuffled(question.pairs ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question.id]
  );

  if (question.type === "open_ended") {
    return (
      <div className="mt-4">
        <textarea
          required
          rows={5}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite sua resposta aqui com detalhes..."
          className="w-full rounded-xl border border-hairline bg-surface p-4 text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-y shadow-xs"
        />
      </div>
    );
  }

  if (question.type === "matching") {
    const pairs = question.pairs ?? [];
    const current = (value && typeof value === "object" ? (value as Record<string, string>) : {}) || {};
    return (
      <div className="mt-4 space-y-3">
        {pairs.map((pair) => (
          <div
            key={pair.id}
            className="flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="font-medium text-foreground">{pair.left}</span>
            <select
              value={current[pair.id] || ""}
              onChange={(e) => onChange({ ...current, [pair.id]: e.target.value })}
              className="w-full sm:w-64 rounded-lg border border-hairline bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="" disabled>
                Selecione uma opção...
              </option>
              {matchingOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.right}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "fill_table") {
    const columns = question.columns ?? [];
    const minRows = question.minRows ?? 1;
    const rows: Record<string, string>[] =
      Array.isArray(value) && value.length > 0
        ? (value as Record<string, string>[])
        : Array.from({ length: minRows }, () => ({}));

    const updateCell = (rowIndex: number, columnId: string, cellValue: string) => {
      const next = rows.map((row, i) => (i === rowIndex ? { ...row, [columnId]: cellValue } : row));
      onChange(next);
    };
    const addRow = () => onChange([...rows, {}]);
    const removeRow = (rowIndex: number) => {
      if (rows.length <= 1) return;
      onChange(rows.filter((_, i) => i !== rowIndex));
    };

    return (
      <div className="mt-4 space-y-3">
        <div className="overflow-x-auto rounded-2xl border border-hairline shadow-xs">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="bg-background-secondary">
                {columns.map((col) => (
                  <th key={col.id} className="border-b border-hairline px-3 py-2 text-left font-semibold text-foreground">
                    {col.header}
                  </th>
                ))}
                <th className="w-10 border-b border-hairline" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-hairline last:border-0">
                  {columns.map((col) => (
                    <td key={col.id} className="p-2">
                      <input
                        type="text"
                        value={row[col.id] || ""}
                        onChange={(e) => updateCell(rowIndex, col.id, e.target.value)}
                        className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      />
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(rowIndex)}
                      disabled={rows.length <= 1}
                      className="text-muted hover:text-danger disabled:opacity-30 disabled:hover:text-muted"
                      aria-label="Remover linha"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent/80"
        >
          <Plus className="size-3.5" /> Adicionar Linha
        </button>
        {minRows > 1 && <p className="text-xs text-muted">Preencha pelo menos {minRows} linhas.</p>}
      </div>
    );
  }

  if (question.type === "fill_blank") {
    const current = (value && typeof value === "object" ? (value as Record<string, string>) : {}) || {};
    const parts = splitBlankTemplate(question.text);
    return (
      <p className="mt-4 whitespace-pre-wrap text-base leading-loose text-foreground">
        {parts.map((part, i) => {
          if (part.kind === "text") return <span key={i}>{part.value}</span>;
          const blank = question.blanks?.[part.index];
          if (!blank) return null;
          return (
            <input
              key={i}
              type="text"
              value={current[blank.id] || ""}
              onChange={(e) => onChange({ ...current, [blank.id]: e.target.value })}
              className="mx-1 inline-block w-40 rounded-lg border border-hairline bg-surface px-2 py-1 text-sm focus:border-accent focus:outline-none"
            />
          );
        })}
      </p>
    );
  }

  // multiple_choice / true_false / multiple_select
  const isMultiple = question.type === "multiple_select";
  return (
    <div className="space-y-3 pt-2">
      {(question.options ?? []).map((opt, optIndex) => {
        const isSelected = isMultiple
          ? Array.isArray(value) && (value as string[]).includes(opt.id)
          : value === opt.id;
        const letter = String.fromCharCode(65 + optIndex);

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              if (isMultiple) {
                const current = Array.isArray(value) ? (value as string[]) : [];
                onChange(
                  current.includes(opt.id)
                    ? current.filter((id) => id !== opt.id)
                    : [...current, opt.id]
                );
              } else {
                onChange(opt.id);
              }
            }}
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
                  isSelected ? "font-semibold text-foreground" : "font-normal text-foreground"
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
  );
}

export function questionTypeLabel(question: QuizQuestion): string {
  switch (question.type) {
    case "multiple_select":
      return "Múltipla escolha (selecione todas as corretas)";
    case "open_ended":
      return "Resposta dissertativa";
    case "matching":
      return "Associe as colunas";
    case "fill_table":
      return "Preencha a tabela";
    case "fill_blank":
      return "Preencha as lacunas";
    default:
      return "Escolha única";
  }
}
