'use client';

import React, { useState } from 'react';
import { ProfileQuestion, ProfileCategory, QuestionOption } from '@/types/profileTest';
import { Trash2, Plus, GripVertical, HelpCircle, ChevronDown, ChevronRight, Calculator } from 'lucide-react';
import { ScoreDistributionBar } from './ScoreDistributionBar';

interface QuestionEditorProps {
  questions: ProfileQuestion[];
  categories: ProfileCategory[];
  onChange: (questions: ProfileQuestion[]) => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({ questions, categories, onChange }) => {
  const [expandedIds, setExpandedIds] = useState<string[]>(questions.map((q) => q.id));

  const toggleExpand = (id: string) => {
    if (expandedIds.includes(id)) {
      setExpandedIds(expandedIds.filter((expId) => expId !== id));
    } else {
      setExpandedIds([...expandedIds, id]);
    }
  };

  const expandAll = () => setExpandedIds(questions.map((q) => q.id));
  const collapseAll = () => setExpandedIds([]);

  const handleAddQuestion = () => {
    const newQuestionId = `q-${Date.now()}`;
    const newQuestion: ProfileQuestion = {
      id: newQuestionId,
      text: `Pergunta ${questions.length + 1}`,
      options: [
        {
          id: `o_${Date.now()}_1`,
          text: 'Opção A',
          categoryScores: categories.length > 0 ? { [categories[0].id]: 3 } : {},
        },
        {
          id: `o_${Date.now()}_2`,
          text: 'Opção B',
          categoryScores: categories.length > 1 ? { [categories[1].id]: 3 } : {},
        },
      ],
    };

    onChange([...questions, newQuestion]);
    setExpandedIds([...expandedIds, newQuestionId]);
  };

  const handleUpdateQuestion = (qId: string, updatedFields: Partial<ProfileQuestion>) => {
    onChange(questions.map((q) => (q.id === qId ? { ...q, ...updatedFields } : q)));
  };

  const handleRemoveQuestion = (qId: string) => {
    if (questions.length <= 1) {
      alert('O teste precisa ter pelo menos 1 pergunta.');
      return;
    }
    onChange(questions.filter((q) => q.id !== qId));
    setExpandedIds(expandedIds.filter((id) => id !== qId));
  };

  const handleAddOption = (qId: string) => {
    const targetQ = questions.find((q) => q.id === qId);
    if (!targetQ) return;

    const newOption: QuestionOption = {
      id: `o_${Date.now()}_${targetQ.options.length + 1}`,
      text: `Opção ${String.fromCharCode(65 + targetQ.options.length)}`,
      categoryScores: {},
    };

    handleUpdateQuestion(qId, {
      options: [...targetQ.options, newOption],
    });
  };

  const handleUpdateOption = (qId: string, oId: string, updatedFields: Partial<QuestionOption>) => {
    const targetQ = questions.find((q) => q.id === qId);
    if (!targetQ) return;

    const newOptions = targetQ.options.map((opt) =>
      opt.id === oId ? { ...opt, ...updatedFields } : opt
    );

    handleUpdateQuestion(qId, { options: newOptions });
  };

  const handleRemoveOption = (qId: string, oId: string) => {
    const targetQ = questions.find((q) => q.id === qId);
    if (!targetQ) return;

    if (targetQ.options.length <= 2) {
      alert('Cada pergunta precisa ter pelo menos 2 alternativas.');
      return;
    }

    handleUpdateQuestion(qId, {
      options: targetQ.options.filter((opt) => opt.id !== oId),
    });
  };

  const handleScoreChange = (qId: string, oId: string, catId: string, points: number) => {
    const targetQ = questions.find((q) => q.id === qId);
    if (!targetQ) return;

    const targetOpt = targetQ.options.find((opt) => opt.id === oId);
    if (!targetOpt) return;

    const updatedScores = { ...targetOpt.categoryScores };
    if (points <= 0) {
      delete updatedScores[catId];
    } else {
      updatedScores[catId] = points;
    }

    handleUpdateOption(qId, oId, { categoryScores: updatedScores });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-primary-pale/60 p-4 rounded-xl border border-primary/10">
        <div>
          <h3 className="font-bold text-ink-deep flex items-center gap-2 text-base">
            <HelpCircle className="w-5 h-5 text-primary" />
            Perguntas & Pontuações
          </h3>
          <p className="text-sm text-text-soft">
            Crie as perguntas do teste e atribua pontos a uma ou mais categorias para cada resposta escolhida.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={expandedIds.length === 0 ? expandAll : collapseAll}
            className="px-4 py-2.5 rounded-xl border border-border/60 font-semibold text-xs text-text hover:bg-canvas-soft transition-all shrink-0"
          >
            {expandedIds.length === 0 ? 'Expandir Tudo' : 'Recolher Tudo'}
          </button>
          <button
            type="button"
            onClick={handleAddQuestion}
            className="bg-primary text-on-primary px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-active transition-all flex items-center gap-2 shadow-sm hover:shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" />
            Adicionar Pergunta
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, qIndex) => {
          const isExpanded = expandedIds.includes(q.id);

          return (
            <div
              key={q.id}
              className={`bg-surface-card border rounded-2xl shadow-sm transition-all overflow-hidden ${
                isExpanded ? 'border-border/60 hover:shadow-md' : 'border-border/30 hover:border-primary/40 opacity-90 hover:opacity-100'
              }`}
            >
              {/* Header / Title (Always visible) */}
              <div 
                className={`flex items-center justify-between gap-4 p-4 cursor-pointer select-none transition-colors ${
                  isExpanded ? 'border-b border-border/30 bg-surface/50' : 'hover:bg-surface/50'
                }`}
                onClick={(e) => {
                  // Prevent toggle if clicking input or trash
                  if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'BUTTON') {
                    toggleExpand(q.id);
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-1 text-text-mute hover:text-text rounded-md hover:bg-canvas-soft transition-colors cursor-grab" onClick={(e) => e.stopPropagation()}>
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <span className="bg-primary/10 text-primary font-black px-2.5 py-1 rounded-full text-xs shrink-0">
                    Q{qIndex + 1}
                  </span>
                  
                  {isExpanded ? (
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => handleUpdateQuestion(q.id, { text: e.target.value })}
                      placeholder="Digite o enunciado da pergunta..."
                      className="flex-1 font-bold text-lg text-text bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none py-1 transition-colors"
                    />
                  ) : (
                    <span className="flex-1 font-bold text-text truncate">
                      {q.text || 'Pergunta sem enunciado'}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveQuestion(q.id);
                    }}
                    className="text-text-mute hover:text-negative p-2 rounded-xl hover:bg-negative/10 transition-colors"
                    title="Excluir Pergunta"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="p-2 text-text-mute">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Options List (Collapsible) */}
              {isExpanded && (
                <div className="p-4 sm:p-6 space-y-6 bg-canvas-soft/20 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-4 h-4 text-text-soft" />
                    <span className="text-xs font-bold text-text-soft uppercase tracking-wider block">
                      Alternativas e Distribuição de Pontos
                    </span>
                  </div>

                  <div className="space-y-5">
                    {q.options.map((opt, oIndex) => (
                      <div
                        key={opt.id}
                        className="bg-surface-card border border-border/60 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
                      >
                        {/* Option Text */}
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-primary/5 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0">
                            {String.fromCharCode(65 + oIndex)}
                          </span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleUpdateOption(q.id, opt.id, { text: e.target.value })}
                            placeholder="Texto da alternativa..."
                            className="flex-1 bg-canvas-soft border border-border/50 rounded-xl px-4 py-2.5 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(q.id, opt.id)}
                            className="text-text-mute hover:text-negative p-2 rounded-xl hover:bg-negative/10 transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Point allocation grid */}
                        <div className="pt-3 border-t border-border/30 bg-canvas-soft/30 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                            
                            <div className="flex-1 space-y-3">
                              <span className="text-[10px] font-bold text-text-mute uppercase tracking-wider block">
                                Se o aluno escolher esta opção, ele ganha pontos em:
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                                {categories.map((cat) => {
                                  const currentPoints = opt.categoryScores[cat.id] || 0;
                                  const isActive = currentPoints > 0;
                                  
                                  return (
                                    <div
                                      key={cat.id}
                                      className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${
                                        isActive 
                                          ? 'bg-surface border-border/60 shadow-sm' 
                                          : 'bg-transparent border-border/30 opacity-70 hover:opacity-100 hover:bg-surface/50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate pr-2" title={cat.name}>
                                        <span className="text-base">{cat.emoji}</span>
                                        <span className={`text-xs font-semibold truncate ${isActive ? 'text-text' : 'text-text-mute'}`}>
                                          {cat.name}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 shrink-0 bg-canvas-soft rounded-lg p-0.5 border border-border/40">
                                        <button
                                          type="button"
                                          onClick={() => handleScoreChange(q.id, opt.id, cat.id, Math.max(0, currentPoints - 1))}
                                          className="w-6 h-6 rounded-md hover:bg-surface hover:shadow-sm text-text-soft flex items-center justify-center transition-all"
                                        >
                                          -
                                        </button>
                                        <span className={`w-5 text-center text-xs font-black ${isActive ? 'text-primary' : 'text-text-mute'}`}>
                                          {currentPoints}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleScoreChange(q.id, opt.id, cat.id, currentPoints + 1)}
                                          className="w-6 h-6 rounded-md hover:bg-surface hover:shadow-sm text-text-soft flex items-center justify-center transition-all"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Score Preview Bar (Mini) */}
                            <div className="w-full sm:w-1/3 min-w-[150px] border-t sm:border-t-0 sm:border-l border-border/40 pt-3 sm:pt-0 sm:pl-6 flex flex-col justify-center">
                              <span className="text-[10px] font-bold text-text-mute uppercase tracking-wider block mb-2">
                                Distribuição
                              </span>
                              <ScoreDistributionBar categories={categories} categoryScores={opt.categoryScores} />
                            </div>

                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddOption(q.id)}
                    className="text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 px-4 py-2.5 rounded-xl border border-primary/20 flex items-center gap-1.5 transition-colors w-fit"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Alternativa
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
