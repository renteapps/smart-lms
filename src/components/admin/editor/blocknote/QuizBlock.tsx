"use client";

import { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { Input, Label, TextArea, TextField } from "@heroui/react";
import { Check, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

function parseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
  } catch {
    // string antiga/corrompida — trata como sem opções
  }
  return ["", "", "", ""];
}

export const quizBlockConfig = {
  type: "quiz",
  propSchema: {
    question: { default: "" as const },
    options: { default: JSON.stringify(["", "", "", ""]) },
    correctAnswer: { default: 0 },
    explanation: { default: "" as const },
  },
  content: "none",
} as const;

export const QuizBlock = createReactBlockSpec(quizBlockConfig, {
  render: ({ block, editor }) => {
    const { question, correctAnswer, explanation } = block.props;
    const options = parseOptions(block.props.options);

    const update = (patch: Partial<{ question: string; options: string; correctAnswer: number; explanation: string }>) => {
      editor.updateBlock(block, { props: { ...block.props, ...patch } });
    };

    const setOption = (index: number, value: string) => {
      const next = [...options];
      next[index] = value;
      update({ options: JSON.stringify(next) });
    };

    if (!editor.isEditable) {
      return <QuizPlayer question={question} options={options} correctAnswer={correctAnswer} explanation={explanation} />;
    }

    return (
      <div className="my-2 w-full space-y-4 rounded-xl border border-border bg-surface p-4" contentEditable={false}>
        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
          <HelpCircle className="size-4" aria-hidden="true" />
          Bloco de Quiz
        </div>

        <TextField aria-label="Pergunta do quiz" value={question} onChange={(value) => update({ question: value })}>
          <Label>Pergunta</Label>
          <TextArea rows={2} placeholder="Qual é a pergunta?" />
        </TextField>

        <div className="space-y-2">
          <Label>Alternativas — clique para marcar a correta</Label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Marcar alternativa ${index + 1} como correta`}
                aria-pressed={correctAnswer === index}
                onClick={() => update({ correctAnswer: index })}
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  correctAnswer === index ? "border-success bg-success-soft text-success" : "border-separator text-muted hover:border-accent",
                )}
              >
                {correctAnswer === index && <Check className="size-4" aria-hidden="true" />}
              </button>
              <TextField aria-label={`Texto da alternativa ${index + 1}`} value={option} onChange={(value) => setOption(index, value)} className="flex-1">
                <Input placeholder={`Alternativa ${index + 1}`} />
              </TextField>
            </div>
          ))}
        </div>

        <TextField aria-label="Explicação da resposta" value={explanation} onChange={(value) => update({ explanation: value })}>
          <Label>Explicação (opcional, exibida após responder)</Label>
          <TextArea rows={2} placeholder="Por que essa é a resposta correta?" />
        </TextField>
      </div>
    );
  },
});

function QuizPlayer({
  question,
  options,
  correctAnswer,
  explanation,
}: {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="my-10 overflow-hidden rounded-2xl border border-hairline bg-surface shadow-elev-2">
      <div className="flex items-center gap-3 px-6 pt-6 sm:px-8 sm:pt-8">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
          <HelpCircle className="size-4.5" aria-hidden="true" />
        </span>
        <p className="eyebrow">Verifique seu conhecimento</p>
      </div>
      <p className="px-6 pt-4 font-display text-lg font-bold leading-snug tracking-[-0.02em] text-foreground sm:px-8 sm:text-xl">
        {question}
      </p>

      <div className="space-y-2.5 px-6 pt-5 sm:px-8">
        {options.map((option, index) => {
          if (!option) return null;
          const isChosen = index === selected;
          const isRight = submitted && index === correctAnswer;
          const isWrong = submitted && isChosen && index !== correctAnswer;

          return (
            <button
              key={index}
              type="button"
              onClick={() => !submitted && setSelected(index)}
              disabled={submitted}
              aria-pressed={isChosen}
              className={cn(
                "flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-hairline bg-surface px-5 py-3.5 text-left text-base transition-colors",
                !submitted && "hover:border-accent hover:bg-accent-soft/45",
                !submitted && isChosen && "border-accent bg-accent-soft text-accent-soft-foreground",
                isRight && "border-success bg-success-soft text-success-soft-foreground",
                isWrong && "border-danger bg-danger-soft text-danger-soft-foreground",
                submitted && !isRight && !isWrong && "opacity-55",
              )}
            >
              <span className="font-medium">{option}</span>
              {isRight && <Check className="size-5 shrink-0" aria-hidden="true" />}
              {isWrong && <X className="size-5 shrink-0" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
        {!submitted ? (
          <button
            type="button"
            disabled={selected === null}
            onClick={() => setSubmitted(true)}
            className="self-end rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors disabled:opacity-50"
          >
            Confirmar resposta
          </button>
        ) : (
          explanation && <p className="text-sm leading-relaxed text-muted">{explanation}</p>
        )}
      </div>
    </div>
  );
}
