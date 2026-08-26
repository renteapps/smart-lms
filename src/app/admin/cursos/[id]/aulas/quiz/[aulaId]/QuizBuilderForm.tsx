"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import type { Quiz, QuizQuestion, QuestionType, QuizFeedbackMode } from "@/types/quiz";
import QuizQuestionTypeEditor from "./QuizQuestionTypeEditor";
import { saveQuiz, saveLesson } from "@/app/actions/admin/catalog";

interface QuizBuilderFormProps {
  courseId: string;
  moduleId: string | null;
  aulaId: string;
  initialData?: Quiz;
  initialLessonTitle?: string;
}

const emptyQuestion: QuizQuestion = {
  id: `q-${Date.now()}`,
  type: "multiple_choice",
  text: "",
  options: [
    { id: `opt-${Date.now()}-1`, text: "", isCorrect: true },
    { id: `opt-${Date.now()}-2`, text: "", isCorrect: false }
  ]
};

export default function QuizBuilderForm({ courseId, moduleId, aulaId, initialData, initialLessonTitle }: QuizBuilderFormProps) {
  const router = useRouter();
  const isNew = aulaId === "nova";
  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialLessonTitle || initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [passingScore, setPassingScore] = useState(initialData?.passingScore ?? 70);
  const [feedbackMode, setFeedbackMode] = useState<QuizFeedbackMode>(initialData?.feedbackMode ?? "end");
  const [shuffleQuestions, setShuffleQuestions] = useState(initialData?.shuffleQuestions ?? true);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialData?.questions && initialData.questions.length > 0
      ? initialData.questions
      : [emptyQuestion]
  );

  const handleAddQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        id: `q-${Date.now()}`,
        type: "multiple_choice",
        text: "",
        options: [
          { id: `opt-${Date.now()}-1`, text: "", isCorrect: true },
          { id: `opt-${Date.now()}-2`, text: "", isCorrect: false }
        ]
      }
    ]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleTypeChange = (id: string, type: QuestionType) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== id) return q;
      const base: QuizQuestion = {
        id: q.id,
        type,
        text: q.text,
        explanation: q.explanation,
      };

      if (type === "true_false") {
        return {
          ...base,
          options: [
            { id: `opt-${Date.now()}-t`, text: "Verdadeiro", isCorrect: true },
            { id: `opt-${Date.now()}-f`, text: "Falso", isCorrect: false }
          ]
        };
      }
      if (type === "multiple_choice" || type === "multiple_select") {
        return {
          ...base,
          options: q.options && q.options.length > 0 ? q.options : [
            { id: `opt-${Date.now()}-1`, text: "", isCorrect: true },
            { id: `opt-${Date.now()}-2`, text: "", isCorrect: false }
          ]
        };
      }
      if (type === "matching") {
        return {
          ...base,
          pairs: q.pairs && q.pairs.length > 0 ? q.pairs : [
            { id: `pair-${Date.now()}-1`, left: "", right: "" },
            { id: `pair-${Date.now()}-2`, left: "", right: "" }
          ]
        };
      }
      if (type === "fill_table") {
        return {
          ...base,
          columns: q.columns && q.columns.length > 0 ? q.columns : [
            { id: `col-${Date.now()}-1`, header: "" },
            { id: `col-${Date.now()}-2`, header: "" }
          ],
          minRows: q.minRows ?? 1
        };
      }
      if (type === "fill_blank") {
        return { ...base, blanks: q.blanks ?? [] };
      }
      // open_ended
      return base;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!title.trim()) {
      setSaveError("O título do quiz é obrigatório.");
      return;
    }
    
    // Numa aula existente o módulo vem do próprio registro; ao criar, da URL.
    const targetModuleId = moduleId;
    if (!targetModuleId && isNew) {
      setSaveError("Não foi possível identificar o módulo deste quiz.");
      return;
    }

    startSaving(async () => {
      // 1. Save Quiz entity
      const quizRes = await saveQuiz({
        id: initialData?.id,
        title,
        description,
        questions,
        passingScore,
        feedbackMode,
        shuffleQuestions
      });

      if (!quizRes.success || !quizRes.data) {
        setSaveError("Erro ao salvar o quiz: " + quizRes.message);
        return;
      }

      // 2. Link Quiz to a Lesson record
      const lessonRes = await saveLesson((targetModuleId || "") as string, {
        id: isNew ? undefined : aulaId,
        title,
        type: "quiz",
        content: description || "",
        quizId: quizRes.data.id,
        durationInMinutes: Math.max(1, questions.length * 2), // estimate 2 min per question
        isPublished: true, // Auto publish for now
      });

      if (lessonRes.success) {
        router.push(`/admin/cursos/${courseId}/modulos`);
        router.refresh();
      } else {
        setSaveError("Erro ao salvar a aula vinculada: " + lessonRes.message);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <Link
          href={`/admin/cursos/${courseId}/modulos`}
          className="inline-flex items-center gap-2 text-muted hover:text-accent transition-colors text-sm font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Módulos
        </Link>
        <h1 className="text-3xl font-display font-bold">
          {isNew ? "Criar Novo Quiz" : "Editar Quiz"}
        </h1>
        <p className="text-muted mt-2">
          Construa questionários interativos para avaliação e autoavaliação dos alunos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Info */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium text-foreground">
              Título do Quiz
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Avaliação do Módulo 1"
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-foreground">
              Descrição (Opcional)
            </label>
            <textarea
              id="description"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Instruções para o aluno..."
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors resize-y"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="passingScore" className="block text-sm font-medium text-foreground">
              Nota para Aprovação (%)
            </label>
            <input
              id="passingScore"
              type="number"
              min="0"
              max="100"
              required
              value={passingScore}
              onChange={e => setPassingScore(Number(e.target.value))}
              className="w-full sm:w-48 bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-foreground">Quando mostrar o resultado das respostas?</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setFeedbackMode("end")}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                  feedbackMode === "end"
                    ? "border-accent bg-accent/10 text-foreground font-medium"
                    : "border-border bg-background text-muted hover:text-foreground"
                }`}
              >
                No final, junto com a nota
                <span className="block text-xs text-muted font-normal mt-0.5">O aluno vê tudo de uma vez ao terminar o quiz.</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackMode("immediate")}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                  feedbackMode === "immediate"
                    ? "border-accent bg-accent/10 text-foreground font-medium"
                    : "border-border bg-background text-muted hover:text-foreground"
                }`}
              >
                A cada pergunta respondida
                <span className="block text-xs text-muted font-normal mt-0.5">O aluno confere cada resposta antes de seguir para a próxima (a resposta fica travada depois de conferida).</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <span className="block text-sm font-medium text-foreground">Embaralhar ordem das perguntas</span>
              <span className="block text-xs text-muted mt-0.5">A cada tentativa a ordem muda (as alternativas de múltipla escolha e V/F também embaralham sempre). Desligue se a sequência das perguntas importar pedagogicamente.</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={shuffleQuestions}
              onClick={() => setShuffleQuestions((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${shuffleQuestions ? "bg-accent" : "bg-border"}`}
            >
              <span className={`inline-block size-4 transform rounded-full bg-white transition-transform ${shuffleQuestions ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        {/* Questions Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Perguntas</h2>
            <Button variant="primary" size="sm" type="button" onClick={handleAddQuestion}>
              <Plus className="size-4 mr-1.5" /> Adicionar Pergunta
            </Button>
          </div>

          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted">
              Nenhuma pergunta adicionada ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.id} className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                        {index + 1}
                      </span>
                      <select
                        value={q.type}
                        onChange={(e) => handleTypeChange(q.id, e.target.value as QuestionType)}
                        className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-accent"
                      >
                        <option value="multiple_choice">Múltipla Escolha</option>
                        <option value="multiple_select">Seleção Múltipla</option>
                        <option value="true_false">Verdadeiro ou Falso</option>
                        <option value="open_ended">Resposta Aberta (Dissertativa)</option>
                        <option value="matching">Relação (Associação)</option>
                        <option value="fill_table">Preencher Tabela</option>
                        <option value="fill_blank">Preencher Lacunas</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="text-muted hover:text-danger p-1"
                    >
                      <Trash2 className="size-4.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {q.type !== 'fill_blank' && (
                      <input
                        type="text"
                        placeholder="Digite a pergunta aqui..."
                        required
                        value={q.text}
                        onChange={e => handleUpdateQuestion(q.id, { text: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-base font-semibold focus:outline-none focus:border-accent transition-colors"
                      />
                    )}

                    <QuizQuestionTypeEditor
                      question={q}
                      onChange={(updates) => handleUpdateQuestion(q.id, updates)}
                    />

                    <div className="space-y-1 pt-2 border-t border-border">
                      <label htmlFor={`explanation-${q.id}`} className="block text-xs font-medium text-muted">
                        Feedback / explicação (opcional) — mostrado ao aluno depois de responder
                      </label>
                      <textarea
                        id={`explanation-${q.id}`}
                        rows={2}
                        value={q.explanation || ""}
                        onChange={(e) => handleUpdateQuestion(q.id, { explanation: e.target.value })}
                        placeholder="Ex: Lembre-se que o escopo de um projeto deve ser definido antes do orçamento..."
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors resize-y"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {saveError && (
          <p className="text-sm text-danger">{saveError}</p>
        )}

        <div className="pt-6 border-t border-border flex items-center justify-end gap-3">
          <Link
            href={`/admin/cursos/${courseId}/modulos`}
            className="px-5 py-2.5 rounded-lg font-medium text-sm text-foreground hover:bg-surface transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-lg bg-accent text-on-primary font-medium text-sm hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Salvando..." : "Salvar Quiz"}
          </button>
        </div>
      </form>
    </div>
  );
}
