"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Check, PencilLine, Sparkles } from "lucide-react";
import {
  Button,
  Chip,
  Description,
  Label,
  Modal,
  NumberField,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import LessonMultiSelect, { type LessonMultiSelectGroup } from "@/components/admin/LessonMultiSelect";
import { StepWizard, type WizardStep } from "@/components/admin/profile-tests/StepWizard";
import QuestionPreview from "./QuestionPreview";
import { CURATED_OPENROUTER_MODELS } from "@/lib/openrouterService";
import { generateQuizQuestionsWithAI } from "@/app/actions/admin/ai-generation";
import {
  MAX_AI_EXTRA_PROMPT,
  MAX_AI_LESSONS,
  MAX_AI_QUESTIONS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type AiSourceKind,
} from "@/lib/quiz/aiQuestions";
import type { QuestionType, QuizQuestion } from "@/types/quiz";
import { cn } from "@/lib/utils";

/** Aula elegível para servir de material — só metadados, nunca o texto. */
export interface AiLessonOption {
  id: string;
  moduleId: string;
  moduleTitle: string;
  title: string;
  sources: AiSourceKind[];
}

interface CreateQuestionModalProps {
  /**
   * O pai monta e desmonta este componente (não o mantém escondido): é a
   * desmontagem que zera os passos, a seleção e o resultado entre uma abertura
   * e a próxima, sem efeito de reset.
   */
  onClose: () => void;
  /** "Criar do zero" — insere a pergunta em branco de sempre. */
  onCreateBlank: () => void;
  onInsert: (questions: QuizQuestion[]) => void;
  courseId: string;
  courseTitle?: string;
  quizTitle?: string;
  lessons: AiLessonOption[];
  defaultModel: string;
  /** Falso quando a integração com OpenRouter não está pronta. */
  aiEnabled: boolean;
}

const SOURCE_LABELS: Record<AiSourceKind, string> = {
  transcription: "Transcrição",
  content: "Conteúdo",
  shortDescription: "Descrição",
};

const STEPS: WizardStep[] = [
  { id: 1, title: "Aulas", subtitle: "Material de origem" },
  { id: 2, title: "Modelo", subtitle: "Qual IA vai escrever" },
  { id: 3, title: "Pergunta", subtitle: "Tipo e quantidade" },
  { id: 4, title: "Prompt", subtitle: "Instruções extras" },
];

const TYPE_HINTS: Record<QuestionType, string> = {
  multiple_choice: "Uma alternativa correta entre distratores.",
  multiple_select: "Duas ou mais alternativas corretas.",
  true_false: "Uma afirmação para o aluno julgar.",
  open_ended: "Dissertativa — a nota é por ter respondido.",
  matching: "Associar cada item à sua correspondência.",
  fill_table: "O aluno preenche uma tabela livre.",
  fill_blank: "Completar lacunas no meio do texto.",
};

export default function CreateQuestionModal({
  onClose,
  onCreateBlank,
  onInsert,
  courseId,
  courseTitle,
  quizTitle,
  lessons,
  defaultModel,
  aiEnabled,
}: CreateQuestionModalProps) {
  // O modelo padrão pode ter saído da curadoria (ou vir de env var antiga).
  const resolvedDefaultModel = CURATED_OPENROUTER_MODELS.some((item) => item.id === defaultModel)
    ? defaultModel
    : CURATED_OPENROUTER_MODELS[0].id;

  const [screen, setScreen] = useState<"choice" | "wizard" | "review">("choice");
  const [step, setStep] = useState(1);
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [model, setModel] = useState(resolvedDefaultModel);
  const [questionType, setQuestionType] = useState<QuestionType>("multiple_choice");
  const [count, setCount] = useState(3);
  const [extraPrompt, setExtraPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<QuizQuestion[]>([]);
  const [keptIds, setKeptIds] = useState<string[]>([]);

  const groups: LessonMultiSelectGroup[] = useMemo(() => {
    const byModule = new Map<string, LessonMultiSelectGroup>();
    for (const lesson of lessons) {
      const group = byModule.get(lesson.moduleId) ?? { id: lesson.moduleId, title: lesson.moduleTitle, lessons: [] };
      group.lessons.push({ id: lesson.id, title: lesson.title });
      byModule.set(lesson.moduleId, group);
    }
    return [...byModule.values()];
  }, [lessons]);

  const sourcesByLesson = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson.sources])),
    [lessons],
  );

  const handleClose = () => {
    if (isGenerating) return;
    onClose();
  };

  const handleSelectLessons = (ids: string[]) => {
    if (ids.length > MAX_AI_LESSONS) {
      toast.warning(`Selecione no máximo ${MAX_AI_LESSONS} aulas por geração.`);
      return;
    }
    setSelectedLessons(ids);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateQuizQuestionsWithAI({
        courseId,
        courseTitle,
        quizTitle,
        lessonIds: selectedLessons,
        model,
        questionType,
        count,
        extraPrompt,
      });

      if (!result.success) {
        toast.danger(result.error);
        return;
      }

      setGenerated(result.data);
      setKeptIds(result.data.map((question) => question.id));
      setScreen("review");

      if (result.discarded > 0) {
        toast.warning(
          `A IA devolveu ${result.data.length} de ${count} perguntas — o resto veio fora do formato e foi descartado.`,
        );
      }
    } catch (error: unknown) {
      toast.danger(error instanceof Error ? error.message : "Erro inesperado ao gerar as perguntas.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = () => {
    const kept = generated.filter((question) => keptIds.includes(question.id));
    if (kept.length === 0) return;
    onInsert(kept);
    toast.success(kept.length === 1 ? "Pergunta adicionada ao quiz." : `${kept.length} perguntas adicionadas ao quiz.`);
    onClose();
  };

  const canAdvance = step === 1 ? selectedLessons.length > 0 : true;

  return (
    <Modal.Root isOpen onOpenChange={(open) => { if (!open) handleClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size={screen === "choice" ? "md" : "lg"} scroll="inside">
          <Modal.Dialog>
            <Modal.Header>
              <div className="flex items-center gap-3">
                <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                  {screen === "choice" ? (
                    <PencilLine className="size-5" aria-hidden="true" />
                  ) : (
                    <Bot className="size-5" aria-hidden="true" />
                  )}
                </Modal.Icon>
                <div>
                  <Modal.Heading className="font-display text-lg font-bold">
                    {screen === "choice" ? "Nova pergunta" : screen === "review" ? "Revisar perguntas" : "Criar com IA"}
                  </Modal.Heading>
                  <p className="text-xs text-muted">
                    {screen === "choice"
                      ? "Como você quer montar esta pergunta?"
                      : screen === "review"
                        ? "Escolha o que entra no quiz. Dá para editar tudo depois."
                        : "A IA lê o material das aulas selecionadas e escreve as perguntas."}
                  </p>
                </div>
              </div>
            </Modal.Header>

            <Modal.Body className="space-y-5 py-2">
              {screen === "choice" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      onCreateBlank();
                      onClose();
                    }}
                    className="rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-accent hover:bg-surface-secondary"
                  >
                    <PencilLine className="size-5 text-accent" aria-hidden="true" />
                    <span className="mt-3 block text-sm font-bold text-foreground">Criar do zero</span>
                    <span className="mt-1 block text-xs text-muted">
                      Adiciona uma pergunta em branco para você escrever.
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!aiEnabled || lessons.length === 0}
                    onClick={() => setScreen("wizard")}
                    className="rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-accent hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-background"
                  >
                    <Sparkles className="size-5 text-accent" aria-hidden="true" />
                    <span className="mt-3 block text-sm font-bold text-foreground">Criar com IA</span>
                    <span className="mt-1 block text-xs text-muted">
                      Gera perguntas a partir da transcrição, da descrição ou do conteúdo das aulas.
                    </span>
                  </button>

                  {!aiEnabled && (
                    <p className="text-xs text-warning sm:col-span-2">
                      A integração com OpenRouter não está pronta. Configure em{" "}
                      <Link href="/admin/integracoes/openrouter" className="underline">
                        /admin/integracoes/openrouter
                      </Link>{" "}
                      para gerar perguntas com IA.
                    </p>
                  )}

                  {aiEnabled && lessons.length === 0 && (
                    <p className="text-xs text-warning sm:col-span-2">
                      Nenhuma aula deste curso tem transcrição, descrição ou conteúdo para servir de material.
                    </p>
                  )}
                </div>
              )}

              {screen === "wizard" && (
                <>
                  <StepWizard
                    steps={STEPS}
                    currentStep={step}
                    onStepClick={(id) => setStep((current) => (id < current ? id : current))}
                    compact
                  />

                  {step === 1 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted">
                        Só aparecem aulas com material aproveitável. Quanto mais aulas, mais amplo — e mais raso — fica o
                        contexto.
                      </p>
                      <LessonMultiSelect
                        groups={groups}
                        value={selectedLessons}
                        onChange={handleSelectLessons}
                        emptyMessage="Nenhuma aula deste curso tem transcrição, descrição ou conteúdo."
                        listClassName="max-h-72"
                        renderMeta={(lesson) => {
                          const kinds = sourcesByLesson.get(lesson.id) ?? [];
                          return kinds[0] ? (
                            <Chip color="default" variant="soft" size="sm">
                              {SOURCE_LABELS[kinds[0]]}
                            </Chip>
                          ) : null;
                        }}
                      />
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-2">
                      {CURATED_OPENROUTER_MODELS.map((item) => {
                        const selected = model === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setModel(item.id)}
                            aria-pressed={selected}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                              selected ? "border-accent bg-accent-soft" : "border-border bg-background hover:bg-surface-secondary",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
                                selected ? "border-accent bg-accent text-accent-foreground" : "border-separator",
                              )}
                            >
                              {selected && <Check className="size-3" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{item.name}</span>
                                <span className="text-xs text-muted">{item.provider}</span>
                                {item.id === resolvedDefaultModel && (
                                  <Chip color="accent" variant="soft" size="sm">
                                    Padrão da plataforma
                                  </Chip>
                                )}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted">
                                {item.recommendedFor || item.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {QUESTION_TYPES.map((type) => {
                          const selected = questionType === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setQuestionType(type)}
                              aria-pressed={selected}
                              className={cn(
                                "rounded-xl border p-3 text-left transition-colors",
                                selected ? "border-accent bg-accent-soft" : "border-border bg-background hover:bg-surface-secondary",
                              )}
                            >
                              <span className="block text-sm font-semibold text-foreground">
                                {QUESTION_TYPE_LABELS[type]}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted">{TYPE_HINTS[type]}</span>
                            </button>
                          );
                        })}
                      </div>

                      <NumberField
                        value={count}
                        onChange={(value) => setCount(Number.isNaN(value) ? 1 : value)}
                        minValue={1}
                        maxValue={MAX_AI_QUESTIONS}
                        className="w-full sm:w-56"
                      >
                        <Label>Quantas perguntas gerar</Label>
                        <NumberField.Group>
                          <NumberField.DecrementButton />
                          <NumberField.Input />
                          <NumberField.IncrementButton />
                        </NumberField.Group>
                      </NumberField>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-4">
                      <TextField value={extraPrompt} onChange={setExtraPrompt} maxLength={MAX_AI_EXTRA_PROMPT} fullWidth>
                        <Label>Prompt específico (opcional)</Label>
                        <TextArea
                          rows={4}
                          placeholder="Ex: foque na parte de orçamento; use exemplos do setor de varejo; evite perguntas sobre datas."
                        />
                        <Description>
                          {extraPrompt.length}/{MAX_AI_EXTRA_PROMPT} caracteres. Some às regras do tipo escolhido, sem
                          substituí-las.
                        </Description>
                      </TextField>

                      <div className="rounded-xl bg-background-secondary p-3 text-xs text-muted">
                        <p>
                          <strong className="font-semibold text-foreground">{count}</strong>{" "}
                          {count === 1 ? "pergunta" : "perguntas"} do tipo{" "}
                          <strong className="font-semibold text-foreground">{QUESTION_TYPE_LABELS[questionType]}</strong>,
                          a partir de{" "}
                          <strong className="font-semibold text-foreground">{selectedLessons.length}</strong>{" "}
                          {selectedLessons.length === 1 ? "aula" : "aulas"}.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {screen === "review" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted">
                    {keptIds.length} de {generated.length} selecionadas. Revise o gabarito — a IA erra.
                  </p>
                  {generated.map((question) => {
                    const kept = keptIds.includes(question.id);
                    return (
                      <div
                        key={question.id}
                        className={cn(
                          "rounded-xl border p-4 transition-colors",
                          kept ? "border-accent bg-surface" : "border-border bg-background opacity-60",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setKeptIds((current) =>
                              current.includes(question.id)
                                ? current.filter((id) => id !== question.id)
                                : [...current, question.id],
                            )
                          }
                          aria-pressed={kept}
                          className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-foreground"
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                              kept ? "border-accent bg-accent text-accent-foreground" : "border-separator",
                            )}
                          >
                            {kept && <Check className="size-3" />}
                          </span>
                          {kept ? "Vai para o quiz" : "Descartada"}
                        </button>

                        <QuestionPreview question={question} />
                      </div>
                    );
                  })}
                </div>
              )}
            </Modal.Body>

            <Modal.Footer>
              {screen === "choice" && (
                <Button variant="tertiary" type="button" onClick={handleClose}>
                  Cancelar
                </Button>
              )}

              {screen === "wizard" && (
                <>
                  <Button
                    variant="tertiary"
                    type="button"
                    isDisabled={isGenerating}
                    onClick={() => (step === 1 ? setScreen("choice") : setStep((current) => current - 1))}
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Voltar
                  </Button>

                  {step < STEPS.length ? (
                    <Button
                      variant="primary"
                      type="button"
                      isDisabled={!canAdvance}
                      onClick={() => setStep((current) => current + 1)}
                    >
                      Continuar
                    </Button>
                  ) : (
                    <Button variant="primary" type="button" isDisabled={isGenerating} onClick={handleGenerate}>
                      <Sparkles className="size-4" aria-hidden="true" />
                      {isGenerating ? "Gerando..." : "Gerar"}
                    </Button>
                  )}
                </>
              )}

              {screen === "review" && (
                <>
                  <Button
                    variant="tertiary"
                    type="button"
                    isDisabled={isGenerating}
                    onClick={() => {
                      setScreen("wizard");
                      setStep(4);
                    }}
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Gerar de novo
                  </Button>
                  <Button variant="primary" type="button" isDisabled={keptIds.length === 0} onClick={handleInsert}>
                    Inserir {keptIds.length === 1 ? "1 pergunta" : `${keptIds.length} perguntas`}
                  </Button>
                </>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
