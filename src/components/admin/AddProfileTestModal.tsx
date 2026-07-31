"use client";

import React, { useState, useEffect } from "react";
import { X, Brain, CheckCircle2, RotateCcw, SkipForward, Sparkles } from "lucide-react";
import { MOCK_PROFILE_TESTS } from "@/lib/mocks/profileTests";

interface AddProfileTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    profileTestId: string;
    allowSkipIfCompleted: boolean;
    requireRetake: boolean;
    durationInMinutes: number;
  }) => void;
  initialData?: {
    title?: string;
    profileTestId?: string;
    allowSkipIfCompleted?: boolean;
    requireRetake?: boolean;
    durationInMinutes?: number;
  } | null;
}

export default function AddProfileTestModal({
  isOpen,
  onClose,
  onSave,
  initialData
}: AddProfileTestModalProps) {
  const [selectedTestId, setSelectedTestId] = useState<string>(
    initialData?.profileTestId || MOCK_PROFILE_TESTS[0]?.id || ""
  );
  const [customTitle, setCustomTitle] = useState<string>(initialData?.title || "");
  const [allowSkip, setAllowSkip] = useState<boolean>(
    initialData?.allowSkipIfCompleted ?? true
  );
  const [requireRetake, setRequireRetake] = useState<boolean>(
    initialData?.requireRetake ?? false
  );
  const [duration, setDuration] = useState<number>(
    initialData?.durationInMinutes || 10
  );

  useEffect(() => {
    if (initialData) {
      setSelectedTestId(initialData.profileTestId || MOCK_PROFILE_TESTS[0]?.id || "");
      setCustomTitle(initialData.title || "");
      setAllowSkip(initialData.allowSkipIfCompleted ?? true);
      setRequireRetake(initialData.requireRetake ?? false);
      setDuration(initialData.durationInMinutes || 10);
    } else if (MOCK_PROFILE_TESTS.length > 0) {
      const firstTest = MOCK_PROFILE_TESTS[0];
      setSelectedTestId(firstTest.id);
      setCustomTitle(`Diagnóstico: ${firstTest.title}`);
      setAllowSkip(true);
      setRequireRetake(false);
      setDuration(10);
    }
  }, [initialData, isOpen]);

  const handleSelectTest = (testId: string) => {
    setSelectedTestId(testId);
    const found = MOCK_PROFILE_TESTS.find((t) => t.id === testId);
    if (found && (!customTitle || customTitle.startsWith("Diagnóstico:"))) {
      setCustomTitle(`Diagnóstico: ${found.title}`);
    }
  };

  const handleToggleSkip = (checked: boolean) => {
    setAllowSkip(checked);
    if (checked) {
      setRequireRetake(false);
    }
  };

  const handleToggleRetake = (checked: boolean) => {
    setRequireRetake(checked);
    if (checked) {
      setAllowSkip(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestId) return;

    const selectedTest = MOCK_PROFILE_TESTS.find((t) => t.id === selectedTestId);
    const finalTitle = customTitle.trim() || selectedTest?.title || "Teste de Perfil";

    onSave({
      title: finalTitle,
      profileTestId: selectedTestId,
      allowSkipIfCompleted: allowSkip,
      requireRetake: requireRetake,
      durationInMinutes: Number(duration) || 10
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">
                {initialData ? "Editar Teste de Perfil no Módulo" : "Adicionar Teste de Perfil ao Módulo"}
              </h2>
              <p className="text-xs text-text-soft">
                Incorpore avaliações comportamentais criadas no sistema ao fluxo do curso.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-soft hover:text-ink hover:bg-canvas-soft rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Select Test */}
          <div>
            <label className="block text-sm font-bold text-ink mb-2">
              Selecione o Teste de Perfil Criado <span className="text-red-500">*</span>
            </label>
            <div className="grid gap-3 max-h-48 overflow-y-auto pr-1">
              {MOCK_PROFILE_TESTS.map((test) => {
                const isSelected = selectedTestId === test.id;
                return (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => handleSelectTest(test.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/5 ring-1 ring-purple-500"
                        : "border-border hover:border-purple-500/40 bg-surface-card hover:bg-surface-hover"
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-purple-500 bg-purple-500 text-white" : "border-border"
                    }`}>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-ink truncate">{test.title}</p>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          test.status === 'published' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {test.status === 'published' ? 'Publicado' : 'Rascunho'}
                        </span>
                      </div>
                      <p className="text-xs text-text-soft line-clamp-1 mt-0.5">
                        {test.description}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-text-soft mt-1.5 font-medium">
                        <span>{test.questions.length} perguntas</span>
                        <span>•</span>
                        <span>{test.categories.length} perfis/categorias</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Item Title */}
          <div>
            <label className="block text-sm font-bold text-ink mb-1">
              Título Exibido no Módulo
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Ex: Diagnóstico: Descubra seu Perfil de Liderança"
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-bold text-ink mb-1">
              Duração Estimada (minutos)
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full sm:w-36 px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* Student Execution Settings */}
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-sm font-bold text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Regras para o Aluno no Curso
            </p>
            <p className="text-xs text-text-soft">
              Defina como o sistema deve tratar alunos que já realizaram este mesmo teste em outro momento.
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Allow skip if completed */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                allowSkip ? "bg-purple-500/5 border-purple-500/40" : "bg-surface-card border-border hover:bg-surface-hover"
              }`}>
                <input
                  type="checkbox"
                  checked={allowSkip}
                  onChange={(e) => handleToggleSkip(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-purple-600 rounded"
                />
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm text-ink">
                    <SkipForward className="w-4 h-4 text-purple-500" />
                    Permitir pular se já tiver feito anteriormente
                  </div>
                  <p className="text-xs text-text-soft mt-0.5">
                    O aluno poderá aproveitar o resultado do teste que já realizou no sistema para concluir esta etapa sem precisar responder tudo de novo.
                  </p>
                </div>
              </label>

              {/* Option 2: Force retake */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                requireRetake ? "bg-amber-500/5 border-amber-500/40" : "bg-surface-card border-border hover:bg-surface-hover"
              }`}>
                <input
                  type="checkbox"
                  checked={requireRetake}
                  onChange={(e) => handleToggleRetake(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-amber-600 rounded"
                />
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm text-ink">
                    <RotateCcw className="w-4 h-4 text-amber-500" />
                    Exigir que o aluno refaça o teste nesta aula
                  </div>
                  <p className="text-xs text-text-soft mt-0.5">
                    Mesmo que o aluno já tenha feito o teste em outra ocasião, ele será convidado a responder novamente nesta etapa específica do curso.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-bold text-text-soft hover:text-ink hover:bg-canvas-soft rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm hover:shadow flex items-center gap-2"
            >
              <Brain className="w-4 h-4" />
              {initialData ? "Salvar Alterações" : "Adicionar Teste ao Módulo"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
