"use client";

import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import type { QuizQuestion } from "@/types/quiz";

interface QuizQuestionTypeEditorProps {
  question: QuizQuestion;
  onChange: (updates: Partial<QuizQuestion>) => void;
}

function countBlankMarkers(text: string): number {
  return (text.match(/\{\{\d+\}\}/g) || []).length;
}

/** Editor da parte de "resposta" de uma pergunta, específico por tipo — usado dentro de QuizBuilderForm. */
export default function QuizQuestionTypeEditor({ question: q, onChange }: QuizQuestionTypeEditorProps) {
  if (q.type === "multiple_choice" || q.type === "true_false" || q.type === "multiple_select") {
    const options = q.options ?? [];

    const setCorrect = (optionId: string) => {
      const isMultiple = q.type === "multiple_select";
      onChange({
        options: options.map((o) => {
          if (o.id === optionId) return { ...o, isCorrect: isMultiple ? !o.isCorrect : true };
          return isMultiple ? o : { ...o, isCorrect: false };
        }),
      });
    };

    return (
      <div className="space-y-2 mt-2">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCorrect(opt.id)}
              className={`shrink-0 transition-colors ${opt.isCorrect ? "text-success" : "text-muted hover:text-foreground"}`}
            >
              {opt.isCorrect ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
            </button>
            <input
              type="text"
              required
              value={opt.text}
              onChange={(e) => onChange({ options: options.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)) })}
              placeholder="Texto da alternativa"
              disabled={q.type === "true_false"}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-70 disabled:bg-surface"
            />
            {q.type !== "true_false" && (
              <button
                type="button"
                onClick={() => onChange({ options: options.filter((o) => o.id !== opt.id) })}
                className="text-muted hover:text-danger p-1 shrink-0"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}

        {q.type !== "true_false" && (
          <button
            type="button"
            onClick={() => onChange({ options: [...options, { id: `opt-${Date.now()}`, text: "", isCorrect: false }] })}
            className="text-sm font-medium text-accent hover:text-accent/80 mt-2 inline-flex items-center gap-1"
          >
            <Plus className="size-3.5" /> Adicionar Alternativa
          </button>
        )}
      </div>
    );
  }

  if (q.type === "matching") {
    const pairs = q.pairs ?? [];
    return (
      <div className="space-y-2 mt-2">
        <p className="text-xs text-muted">O aluno vai associar cada item da esquerda ao item correto da direita.</p>
        {pairs.map((pair) => (
          <div key={pair.id} className="flex items-center gap-2">
            <input
              type="text"
              required
              value={pair.left}
              onChange={(e) => onChange({ pairs: pairs.map((p) => (p.id === pair.id ? { ...p, left: e.target.value } : p)) })}
              placeholder="Item (esquerda)"
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
            <span className="text-muted text-sm">→</span>
            <input
              type="text"
              required
              value={pair.right}
              onChange={(e) => onChange({ pairs: pairs.map((p) => (p.id === pair.id ? { ...p, right: e.target.value } : p)) })}
              placeholder="Correspondência (direita)"
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => pairs.length > 2 && onChange({ pairs: pairs.filter((p) => p.id !== pair.id) })}
              disabled={pairs.length <= 2}
              className="text-muted hover:text-danger p-1 shrink-0 disabled:opacity-30 disabled:hover:text-muted"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {new Set(pairs.map((p) => p.right.trim().toLowerCase()).filter(Boolean)).size < pairs.filter((p) => p.right.trim()).length && (
          <p className="text-xs text-warning">Duas correspondências têm o mesmo texto — isso pode confundir o aluno.</p>
        )}
        <button
          type="button"
          onClick={() => onChange({ pairs: [...pairs, { id: `pair-${Date.now()}`, left: "", right: "" }] })}
          className="text-sm font-medium text-accent hover:text-accent/80 mt-2 inline-flex items-center gap-1"
        >
          <Plus className="size-3.5" /> Adicionar Par
        </button>
      </div>
    );
  }

  if (q.type === "fill_table") {
    const columns = q.columns ?? [];
    const layout = q.tableLayout ?? "table";
    return (
      <div className="space-y-3 mt-2">
        <p className="text-xs text-muted">O aluno preenche uma tabela livre com essas colunas, adicionando quantas linhas quiser.</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">Layout de resposta</span>
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => onChange({ tableLayout: "table" })}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${layout === "table" ? "bg-accent text-on-primary" : "bg-background text-muted hover:text-foreground"}`}
            >
              Tabela
            </button>
            <button
              type="button"
              onClick={() => onChange({ tableLayout: "stacked" })}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${layout === "stacked" ? "bg-accent text-on-primary" : "bg-background text-muted hover:text-foreground"}`}
            >
              Lista (um registro por vez)
            </button>
          </div>
        </div>
        {columns.length > 3 && layout === "table" && (
          <p className="text-xs text-warning">Com {columns.length} colunas, o layout &quot;Lista&quot; costuma ser mais fácil de preencher.</p>
        )}
        <div className="space-y-2">
          {columns.map((col) => (
            <div key={col.id} className="flex items-center gap-2">
              <input
                type="text"
                required
                value={col.header}
                onChange={(e) => onChange({ columns: columns.map((c) => (c.id === col.id ? { ...c, header: e.target.value } : c)) })}
                placeholder="Nome da coluna"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => columns.length > 1 && onChange({ columns: columns.filter((c) => c.id !== col.id) })}
                disabled={columns.length <= 1}
                className="text-muted hover:text-danger p-1 shrink-0 disabled:opacity-30 disabled:hover:text-muted"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ columns: [...columns, { id: `col-${Date.now()}`, header: "" }] })}
            className="text-sm font-medium text-accent hover:text-accent/80 inline-flex items-center gap-1"
          >
            <Plus className="size-3.5" /> Adicionar Coluna
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={`minrows-${q.id}`} className="text-sm text-foreground">
            Linhas mínimas exigidas
          </label>
          <input
            id={`minrows-${q.id}`}
            type="number"
            min={1}
            value={q.minRows ?? 1}
            onChange={(e) => onChange({ minRows: Math.max(1, Number(e.target.value)) })}
            className="w-20 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>
    );
  }

  if (q.type === "fill_blank") {
    const blanks = q.blanks ?? [];

    const insertBlank = () => {
      const nextNumber = blanks.length + 1;
      const separator = q.text.length === 0 || q.text.endsWith(" ") ? "" : " ";
      onChange({
        text: `${q.text}${separator}{{${nextNumber}}}`,
        blanks: [...blanks, { id: `blank-${Date.now()}`, acceptedAnswers: [] }],
      });
    };

    const updateText = (text: string) => {
      const count = countBlankMarkers(text);
      let nextBlanks = blanks;
      if (count > blanks.length) {
        nextBlanks = [
          ...blanks,
          ...Array.from({ length: count - blanks.length }, (_, i) => ({
            id: `blank-${Date.now()}-${blanks.length + i}`,
            acceptedAnswers: [],
          })),
        ];
      } else if (count < blanks.length) {
        nextBlanks = blanks.slice(0, count);
      }
      onChange({ text, blanks: nextBlanks });
    };

    const removeBlank = (index: number) => {
      const markerToRemove = index + 1;
      const newText = q.text.replace(/\{\{(\d+)\}\}/g, (match, numStr) => {
        const num = Number(numStr);
        if (num === markerToRemove) return "";
        if (num > markerToRemove) return `{{${num - 1}}}`;
        return match;
      });
      onChange({ text: newText, blanks: blanks.filter((_, i) => i !== index) });
    };

    return (
      <div className="space-y-3 mt-2">
        <div className="space-y-2">
          <p className="text-xs text-muted">
            Escreva o texto da lacuna e clique em &quot;Inserir Lacuna&quot; onde o aluno deve completar.
          </p>
          <textarea
            required
            rows={3}
            value={q.text}
            onChange={(e) => updateText(e.target.value)}
            placeholder="Ex: A capital do Brasil é {{1}}."
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors resize-y"
          />
          <button
            type="button"
            onClick={insertBlank}
            className="text-sm font-medium text-accent hover:text-accent/80 inline-flex items-center gap-1"
          >
            <Plus className="size-3.5" /> Inserir Lacuna
          </button>
        </div>

        {blanks.length > 0 && (
          <div className="space-y-3">
            {blanks.map((blank, i) => {
              const isOptionsMode = Boolean(blank.options && blank.options.length > 0);
              const options = blank.options ?? [];

              const setMode = (mode: "text" | "options") => {
                onChange({
                  blanks: blanks.map((b, bi) => {
                    if (bi !== i) return b;
                    if (mode === "options") {
                      return {
                        ...b,
                        options: b.options && b.options.length > 0 ? b.options : [
                          { id: `blankopt-${Date.now()}-1`, text: "", isCorrect: true },
                          { id: `blankopt-${Date.now()}-2`, text: "", isCorrect: false },
                        ],
                      };
                    }
                    return { ...b, options: undefined };
                  }),
                });
              };

              const updateOptions = (nextOptions: typeof options) => {
                onChange({ blanks: blanks.map((b, bi) => (bi === i ? { ...b, options: nextOptions } : b)) });
              };

              return (
                <div key={blank.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted">Lacuna {i + 1}</span>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-lg border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setMode("text")}
                          className={`px-2.5 py-1 text-xs font-medium transition-colors ${!isOptionsMode ? "bg-accent text-on-primary" : "bg-background text-muted hover:text-foreground"}`}
                        >
                          Resposta livre
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode("options")}
                          className={`px-2.5 py-1 text-xs font-medium transition-colors ${isOptionsMode ? "bg-accent text-on-primary" : "bg-background text-muted hover:text-foreground"}`}
                        >
                          Múltipla escolha
                        </button>
                      </div>
                      <button type="button" onClick={() => removeBlank(i)} className="text-muted hover:text-danger p-1 shrink-0">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {isOptionsMode ? (
                    <div className="space-y-2">
                      {options.map((opt) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateOptions(options.map((o) => ({ ...o, isCorrect: o.id === opt.id })))}
                            className={`shrink-0 transition-colors ${opt.isCorrect ? "text-success" : "text-muted hover:text-foreground"}`}
                          >
                            {opt.isCorrect ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
                          </button>
                          <input
                            type="text"
                            required
                            value={opt.text}
                            onChange={(e) => updateOptions(options.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)))}
                            placeholder="Texto da opção"
                            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                          />
                          <button
                            type="button"
                            onClick={() => options.length > 2 && updateOptions(options.filter((o) => o.id !== opt.id))}
                            disabled={options.length <= 2}
                            className="text-muted hover:text-danger p-1 shrink-0 disabled:opacity-30 disabled:hover:text-muted"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateOptions([...options, { id: `blankopt-${Date.now()}`, text: "", isCorrect: false }])}
                        className="text-sm font-medium text-accent hover:text-accent/80 inline-flex items-center gap-1"
                      >
                        <Plus className="size-3.5" /> Adicionar Opção
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      defaultValue={blank.acceptedAnswers.join(", ")}
                      onBlur={(e) =>
                        onChange({
                          blanks: blanks.map((b, bi) =>
                            bi === i
                              ? { ...b, acceptedAnswers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }
                              : b
                          ),
                        })
                      }
                      placeholder="Respostas aceitas, separadas por vírgula"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // open_ended: sem alternativas para configurar
  return null;
}
