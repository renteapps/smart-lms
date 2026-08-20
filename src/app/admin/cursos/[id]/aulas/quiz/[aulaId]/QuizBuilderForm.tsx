"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Save, Plus, Trash2, GripVertical, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import type { Quiz, QuizQuestion, QuizOption, QuestionType } from "@/types/quiz";
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
  const [passingScore, setPassingScore] = useState(initialData?.passingScore || 70);
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialData?.questions || [emptyQuestion]);

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
      let newOptions = q.options;
      if (type === "true_false") {
        newOptions = [
          { id: `opt-${Date.now()}-t`, text: "Verdadeiro", isCorrect: true },
          { id: `opt-${Date.now()}-f`, text: "Falso", isCorrect: false }
        ];
      } else if (type === "open_ended") {
        newOptions = undefined;
      } else if (!newOptions || newOptions.length === 0) {
        newOptions = [
          { id: `opt-${Date.now()}-1`, text: "", isCorrect: true },
          { id: `opt-${Date.now()}-2`, text: "", isCorrect: false }
        ];
      }
      return { ...q, type, options: newOptions };
    }));
  };

  const handleAddOption = (questionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId || !q.options) return q;
      return {
        ...q,
        options: [...q.options, { id: `opt-${Date.now()}`, text: "", isCorrect: false }]
      };
    }));
  };

  const handleRemoveOption = (questionId: string, optionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId || !q.options) return q;
      return {
        ...q,
        options: q.options.filter(o => o.id !== optionId)
      };
    }));
  };

  const handleUpdateOption = (questionId: string, optionId: string, text: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId || !q.options) return q;
      return {
        ...q,
        options: q.options.map(o => o.id === optionId ? { ...o, text } : o)
      };
    }));
  };

  const handleSetCorrectOption = (questionId: string, optionId: string, isMultiple: boolean) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId || !q.options) return q;
      return {
        ...q,
        options: q.options.map(o => {
          if (o.id === optionId) return { ...o, isCorrect: isMultiple ? !o.isCorrect : true };
          return isMultiple ? o : { ...o, isCorrect: false };
        })
      };
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
        passingScore
      });

      if (!quizRes.success || !quizRes.data) {
        setSaveError("Erro ao salvar o quiz: " + quizRes.message);
        return;
      }

      // 2. Link Quiz to a Lesson record
      const lessonRes = await saveLesson(targetModuleId as string, {
        id: isNew ? undefined : aulaId,
        title,
        type: "quiz",
        content: description,
        quizId: quizRes.data.id,
        durationInMinutes: questions.length * 2, // estimate 2 min per question
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
                    <input
                      type="text"
                      placeholder="Digite a pergunta aqui..."
                      required
                      value={q.text}
                      onChange={e => handleUpdateQuestion(q.id, { text: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-base font-semibold focus:outline-none focus:border-accent transition-colors"
                    />

                    {/* Options rendering based on type */}
                    {q.type !== 'open_ended' && q.options && (
                      <div className="space-y-2 mt-2">
                        {q.options.map(opt => (
                          <div key={opt.id} className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleSetCorrectOption(q.id, opt.id, q.type === 'multiple_select')}
                              className={`shrink-0 transition-colors ${opt.isCorrect ? 'text-success' : 'text-muted hover:text-foreground'}`}
                            >
                              {opt.isCorrect ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
                            </button>
                            <input
                              type="text"
                              required
                              value={opt.text}
                              onChange={e => handleUpdateOption(q.id, opt.id, e.target.value)}
                              placeholder="Texto da alternativa"
                              disabled={q.type === 'true_false'}
                              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-70 disabled:bg-surface"
                            />
                            {q.type !== 'true_false' && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(q.id, opt.id)}
                                className="text-muted hover:text-danger p-1 shrink-0"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        
                        {q.type !== 'true_false' && (
                          <button
                            type="button"
                            onClick={() => handleAddOption(q.id)}
                            className="text-sm font-medium text-accent hover:text-accent/80 mt-2 inline-flex items-center gap-1"
                          >
                            <Plus className="size-3.5" /> Adicionar Alternativa
                          </button>
                        )}
                      </div>
                    )}
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
            className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium text-sm hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Salvando..." : "Salvar Quiz"}
          </button>
        </div>
      </form>
    </div>
  );
}
