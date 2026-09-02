"use client";

import { useState } from "react";
import { AlertTriangle, Coins, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button, Modal } from "@heroui/react";
import { AgentMarkdown } from "@/components/agentes/AgentMarkdown";
import BlockViewer from "@/components/classroom/BlockViewer";
import { AssistantAvatar } from "@/components/platform-assistant/AssistantAvatar";
import { formatAiCredits } from "@/lib/aiCredits";
import type {
  PersonalizedGenerationPublic,
  PersonalizedLessonGenerateResult,
  PersonalizedLessonQuote,
  PersonalizedLessonStudentState,
} from "@/types/personalizedLesson";

const INPUT_CLASS = "w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm outline-none transition-colors focus:border-accent";

export default function PersonalizedLessonExperience({
  lessonId,
  initialState,
  onReady,
}: {
  lessonId: string;
  initialState: PersonalizedLessonStudentState;
  onReady: () => void;
}) {
  const [answers, setAnswers] = useState(initialState.savedAnswers);
  const [generation, setGeneration] = useState<PersonalizedGenerationPublic | null>(initialState.generation);
  const [outdated, setOutdated] = useState(initialState.outdated);
  const [editing, setEditing] = useState(!initialState.generation);
  const [quote, setQuote] = useState<PersonalizedLessonQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBalance, setLastBalance] = useState<number | null>(null);
  const [lastRefund, setLastRefund] = useState(0);
  const [requestKey, setRequestKey] = useState<string | null>(null);

  const setAnswer = (key: string, value: string | string[]) => setAnswers((current) => ({ ...current, [key]: value }));

  const requestQuote = async () => {
    setError(null);
    setIsQuoting(true);
    setRequestKey((current) => current ?? crypto.randomUUID());
    try {
      const response = await fetch("/api/ai/personalized-lessons/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, answers }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível calcular a estimativa.");
      setQuote(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível calcular a estimativa.");
    } finally {
      setIsQuoting(false);
    }
  };

  const generate = async () => {
    setQuote(null);
    setError(null);
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/personalized-lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          answers,
          requestKey: requestKey ?? crypto.randomUUID(),
          confirmedMaximumCredits: quote?.maximumCredits,
        }),
      });
      const payload = await response.json() as PersonalizedLessonGenerateResult & { error?: string; code?: string };
      if (!response.ok) {
        if (payload.code !== "generation_in_progress") setRequestKey(null);
        throw new Error(payload.error || "Não foi possível gerar a aula.");
      }
      setGeneration(payload.generation);
      setLastBalance(payload.creditsRemaining);
      setLastRefund(payload.refundedCredits);
      setOutdated(false);
      setEditing(false);
      setRequestKey(null);
      onReady();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar a aula.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="grid min-h-[24rem] place-items-center rounded-3xl border border-accent/20 bg-accent-soft/40 px-6 text-center">
        <div className="max-w-md">
          <div className="relative mx-auto size-20">
            <AssistantAvatar config={initialState.assistant} className="size-20 rounded-3xl shadow-lg" />
            <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-surface shadow"><Loader2 className="size-4 animate-spin text-accent" /></span>
          </div>
          <h2 className="mt-6 text-xl font-bold text-foreground">{initialState.assistant.displayName} está escrevendo sua aula personalizada...</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Estamos combinando somente as respostas e fontes autorizadas para criar esta versão.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {outdated && generation && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <div><p className="font-semibold text-foreground">Há uma versão mais atual para gerar</p><p className="text-sm text-muted">Sua aula atual foi mantida. Revise as respostas para gerar com os dados e a configuração atuais.</p></div>
          </div>
          <Button variant="outline" onClick={() => setEditing(true)} className="shrink-0">Gerar versão atualizada</Button>
        </div>
      )}

      {editing && (
        <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <AssistantAvatar config={initialState.assistant} className="size-12 rounded-2xl" />
            <div>
              <p className="eyebrow">Aula personalizada</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">Conte um pouco sobre o seu contexto</h2>
              <p className="mt-1 text-sm leading-6 text-muted">As respostas ficam salvas para você e serão usadas somente nas variáveis autorizadas desta aula.</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {initialState.questions.map((question) => (
              <fieldset key={question.id} className="space-y-2">
                <legend className="text-sm font-semibold text-foreground">{question.label}{question.required && <span className="ml-1 text-danger">*</span>}</legend>
                {question.type === "long_text" ? (
                  <textarea rows={5} value={String(answers[question.key] ?? "")} onChange={(event) => setAnswer(question.key, event.target.value)} className={INPUT_CLASS} />
                ) : question.type === "short_text" ? (
                  <input value={String(answers[question.key] ?? "")} onChange={(event) => setAnswer(question.key, event.target.value)} className={INPUT_CLASS} />
                ) : question.type === "single" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.options.map((option) => (
                      <label key={option} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-3 text-sm hover:bg-background">
                        <input type="radio" name={question.key} value={option} checked={answers[question.key] === option} onChange={() => setAnswer(question.key, option)} /> {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.options.map((option) => {
                      const selected = Array.isArray(answers[question.key]) && answers[question.key].includes(option);
                      return (
                        <label key={option} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-3 text-sm hover:bg-background">
                          <input type="checkbox" checked={selected} onChange={() => { const current = Array.isArray(answers[question.key]) ? answers[question.key] as string[] : []; setAnswer(question.key, selected ? current.filter((item) => item !== option) : [...current, option]); }} /> {option}
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>
            ))}
            {initialState.questions.length === 0 && <p className="rounded-xl bg-background p-4 text-sm text-muted">Esta aula não precisa de respostas adicionais. O conteúdo usará os dados autorizados pelo administrador.</p>}
          </div>

          {error && <p role="alert" className="mt-5 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {generation && <Button variant="ghost" onClick={() => { setEditing(false); setError(null); }}>Cancelar</Button>}
            <Button onClick={requestQuote} isDisabled={isQuoting} className="gap-2">
              {isQuoting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {isQuoting ? "Calculando..." : generation ? "Recriar aula" : "Gerar aula personalizada"}
            </Button>
          </div>
        </section>
      )}

      {generation && !editing && (
        <article className="rounded-3xl border border-border bg-surface px-5 py-7 shadow-sm sm:px-8 sm:py-9">
          {generation.contentBlocks?.length ? (
            <BlockViewer blocks={generation.contentBlocks} />
          ) : (
            <AgentMarkdown text={generation.contentMarkdown} />
          )}
          <div className="mt-8 flex flex-col gap-3 border-t border-border pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted">
              <p>Versão {generation.version} · {formatAiCredits(generation.creditsCharged)} crédito(s) cobrados</p>
              {lastBalance != null && <p>Saldo restante: {formatAiCredits(lastBalance)}{lastRefund > 0 ? ` · ${formatAiCredits(lastRefund)} devolvidos da reserva` : ""}</p>}
            </div>
            <Button variant="outline" onClick={() => setEditing(true)} className="gap-2"><RefreshCw className="size-4" /> Recriar aula</Button>
          </div>
        </article>
      )}

      <Modal.Root isOpen={Boolean(quote)} onOpenChange={(open) => !open && setQuote(null)}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog className="max-w-md">
              <Modal.Header>
                <div className="flex items-center gap-3">
                  <Modal.Icon className="bg-accent-soft text-accent"><Coins className="size-5" /></Modal.Icon>
                  <div><Modal.Heading className="font-display text-lg font-bold">Confirmar geração</Modal.Heading><p className="text-xs text-muted">Esta ação usa créditos de IA.</p></div>
                </div>
              </Modal.Header>
              <Modal.Body className="space-y-4 py-2">
                {quote && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-background p-3"><p className="text-xs text-muted">Seu saldo</p><p className="mt-1 text-lg font-bold">{formatAiCredits(quote.availableCredits)}</p></div>
                      <div className="rounded-xl bg-background p-3"><p className="text-xs text-muted">Reserva máxima</p><p className="mt-1 text-lg font-bold">{formatAiCredits(quote.maximumCredits)}</p></div>
                    </div>
                    <p className="text-sm leading-6 text-muted">O máximo será reservado agora. Você pagará somente o uso real, e a diferença será devolvida automaticamente. Cada recriação gera uma nova cobrança.</p>
                    {quote.availableCredits < quote.maximumCredits && <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger">Saldo insuficiente para reservar esta geração.</p>}
                  </>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onClick={() => setQuote(null)}>Cancelar</Button>
                <Button onClick={generate} isDisabled={!quote || quote.availableCredits < quote.maximumCredits}>Confirmar e gerar</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </div>
  );
}
