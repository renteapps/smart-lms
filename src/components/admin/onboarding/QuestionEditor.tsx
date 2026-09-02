import React, { useState } from 'react';
import { Question, QuestionOption } from '@/types/trilha';
import { ChevronDown, ChevronUp, GripVertical, Settings2, Plus, Type, Copy, Trash2, TriangleAlert, LockKeyhole, Braces } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OptionMappingRow } from './OptionMappingRow';
import type { ContentIndex } from '@/lib/contentCatalog';
import { isValidUserVariableKey, normalizeVariableKey } from '@/lib/userVariables';

interface QuestionEditorProps {
  question: Question;
  index: number;
  onUpdate: (updatedQuestion: Question) => void;
  onOpenContentPicker: (optionIndex: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  /** Catálogo real do Supabase — repassado até o picker de conteúdo e a detecção de mapeamentos órfãos. */
  contentIndex: ContentIndex;
  /** Erros/avisos desta pergunta específica, computados pela validação em tempo real do editor. */
  issueCount?: number;
  lockedVariableKey?: string;
  availableVariableKeys?: string[];
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  index,
  onUpdate,
  onOpenContentPicker,
  onDelete,
  onDuplicate,
  contentIndex,
  issueCount = 0,
  lockedVariableKey,
  availableVariableKeys = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState(false);
  const questionTypeLabel = question.type === 'single'
    ? 'Escolha única'
    : question.type === 'multiple'
      ? 'Múltipla escolha'
      : 'Resposta aberta';

  const handleUpdateOption = (optionIndex: number, updatedOption: QuestionOption) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = updatedOption;
    onUpdate({ ...question, options: newOptions });
  };

  const handleAddOption = () => {
    const newOption: QuestionOption = {
      label: 'Nova opção',
      tags: [],
      contentMappings: []
    };
    onUpdate({ ...question, options: [...question.options, newOption] });
  };

  const handleDeleteOption = (optionIndex: number) => {
    const newOptions = question.options.filter((_, idx) => idx !== optionIndex);
    onUpdate({ ...question, options: newOptions });
  };

  return (
    <div className={`rounded-2xl border bg-surface shadow-sm overflow-hidden transition-all ${issueCount > 0 ? 'border-warning/50' : 'border-border/40 hover:border-border/80'}`}>

      {/* Header / Summary */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <GripVertical size={20} className="text-muted hover:text-foreground cursor-grab shrink-0" />

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent font-bold shrink-0">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{question.text}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted">
            <span className="capitalize">{question.role}</span>
            <span>•</span>
            <span>{questionTypeLabel}</span>
            <span>•</span>
            <span>{question.type === 'open' ? 'salva para IA e agentes' : `${question.options.length} opções`}</span>
          </div>
        </div>

        {issueCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning shrink-0">
            <TriangleAlert size={13} />
            {issueCount}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0" onClick={(event) => event.stopPropagation()}>
          <button
            onClick={onDuplicate}
            title="Duplicar pergunta"
            className="p-2 text-muted hover:text-accent hover:bg-accent/5 rounded-lg transition-colors"
          >
            <Copy size={17} />
          </button>
          <button
            onClick={onDelete}
            title="Excluir pergunta"
            className="p-2 text-muted hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
          >
            <Trash2 size={17} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-muted hover:text-accent hover:bg-accent/5 rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/40 bg-surface"
          >
            <div className="p-5 flex flex-col gap-5">

              {/* Question Settings Row */}
              <div className="flex flex-wrap gap-4 items-center bg-surface p-3 rounded-xl border border-border/40">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-semibold text-muted mb-1 block">Título da Pergunta</label>
                  <div className="flex items-center gap-2 border-b border-border/60 pb-1 focus-within:border-accent transition-colors">
                    <Type size={16} className="text-muted" />
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) => onUpdate({ ...question, text: e.target.value })}
                      className="w-full bg-transparent text-sm font-medium outline-none text-foreground"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] leading-4 text-muted">Use <code>{'{{nome}}'}</code> para mostrar o primeiro nome do aluno.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted mb-1 block">Papel (Role)</label>
                  <select
                    value={question.role}
                    onChange={(e) => onUpdate({ ...question, role: e.target.value as Question['role'] })}
                    className="bg-background border border-border/60 rounded-lg text-sm px-3 py-1.5 outline-none focus:border-accent"
                  >
                    <option value="perfil">Perfil</option>
                    <option value="problema">Problema</option>
                    <option value="interesse">Interesse</option>
                    <option value="nivel">Nível</option>
                    <option value="restricao">Restrição</option>
                    <option value="contexto">Contexto para IA</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted mb-1 block">Seleção</label>
                  <select
                    value={question.type}
                    onChange={(e) => {
                      const type = e.target.value as Question['type'];
                      const becomesOpen = type === 'open';
                      onUpdate({
                        ...question,
                        type,
                        role: becomesOpen ? 'contexto' : question.role === 'contexto' ? 'perfil' : question.role,
                        visualType: becomesOpen ? 'list' : question.visualType,
                        options: becomesOpen ? [] : question.options.length ? question.options : [{ label: 'Nova opção', tags: [], contentMappings: [] }],
                      });
                    }}
                    className="bg-background border border-border/60 rounded-lg text-sm px-3 py-1.5 outline-none focus:border-accent"
                  >
                    <option value="single">Única</option>
                    <option value="multiple">Múltipla</option>
                    <option value="open">Resposta aberta</option>
                  </select>
                </div>

                {question.type !== 'open' && <div>
                  <label className="text-xs font-semibold text-muted mb-1 block">Visual</label>
                  <select
                    value={question.visualType || 'list'}
                    onChange={(e) => onUpdate({ ...question, visualType: e.target.value as NonNullable<Question['visualType']> })}
                    className="bg-background border border-border/60 rounded-lg text-sm px-3 py-1.5 outline-none focus:border-accent"
                  >
                    <option value="list">Lista</option>
                    <option value="cards">Cards (Grid)</option>
                    <option value="physics">Bolhas dinâmicas</option>
                  </select>
                  {question.visualType === 'physics' && (
                    <p className="mt-1.5 max-w-44 text-[11px] leading-4 text-muted">Uma opção por bolha, sem níveis secundários.</p>
                  )}
                </div>}
              </div>

              <div className="rounded-xl border border-border/50 bg-background-secondary/45 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Braces size={16} className="text-accent" />
                      Variável do usuário
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Opcional. A resposta poderá ser usada depois em toda a plataforma.
                    </p>
                  </div>
                  {lockedVariableKey && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-muted">
                      <LockKeyhole size={12} /> Publicada e protegida
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <div className="flex flex-1 items-center rounded-lg border border-border/60 bg-background px-3 focus-within:border-accent">
                    <span className="text-sm font-bold text-muted">{'{{'}</span>
                    <input
                      value={question.variableKey || ''}
                      disabled={Boolean(lockedVariableKey)}
                      onChange={(event) => {
                        const key = event.target.value
                          .toLowerCase()
                          .replace(/[\s-]+/g, '_')
                          .replace(/[^a-z0-9_]/g, '')
                          .slice(0, 64);
                        onUpdate({ ...question, variableKey: key || undefined });
                      }}
                      placeholder="cargo_pretendido"
                      aria-label="Chave da variável"
                      className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm font-semibold text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-70"
                    />
                    <span className="text-sm font-bold text-muted">{'}}'}</span>
                  </div>
                  <button
                    type="button"
                    disabled={!question.variableKey}
                    onClick={async () => {
                      if (!question.variableKey) return;
                      await navigator.clipboard.writeText(`{{${question.variableKey}}}`);
                      setCopiedVariable(true);
                      window.setTimeout(() => setCopiedVariable(false), 1500);
                    }}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border/60 bg-surface px-4 text-xs font-bold text-muted hover:text-accent disabled:opacity-40"
                  >
                    <Copy size={14} /> {copiedVariable ? 'Copiada' : 'Copiar variável'}
                  </button>
                </div>
                {question.variableKey && !isValidUserVariableKey(question.variableKey) && (
                  <p className="mt-2 text-xs font-semibold text-danger">
                    Use apenas letras minúsculas, números e sublinhado, começando por uma letra; o nome não pode ser reservado.
                  </p>
                )}
                {availableVariableKeys.length > 0 && (
                  <p className="mt-3 text-[11px] leading-5 text-muted">
                    Nesta pergunta você já pode usar: {availableVariableKeys.map((key) => `{{${normalizeVariableKey(key)}}}`).join(', ')}. Também estão disponíveis {'{{first_name}}'} e {'{{nome}}'}.
                  </p>
                )}
              </div>

              {question.type === 'open' ? (
                <div className="rounded-xl border border-primary/20 bg-primary-pale/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Resposta aberta e privada</h4>
                      <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">A resposta não aceita conteúdos, tags, pesos ou mapeamentos e nunca altera a trilha. Ela fica vinculada ao aluno e pode enriquecer os agentes e o Assistente IA.</p>
                    </div>
                    <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-primary">Contexto de IA</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_10rem]">
                    <label className="text-xs font-semibold text-muted">
                      Placeholder do campo
                      <input
                        type="text"
                        value={question.placeholder || ''}
                        onChange={(event) => onUpdate({ ...question, placeholder: event.target.value })}
                        placeholder="Ex.: Quero conseguir…"
                        className="mt-1.5 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-accent"
                      />
                    </label>
                    <label className="text-xs font-semibold text-muted">
                      Máx. caracteres
                      <input
                        type="number"
                        min="1"
                        max="2000"
                        value={question.maxLength ?? 700}
                        onChange={(event) => onUpdate({ ...question, maxLength: Math.max(1, Math.min(2000, Number(event.target.value) || 700)) })}
                        className="mt-1.5 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-accent"
                      />
                    </label>
                  </div>
                </div>
              ) : <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Settings2 size={16} className="text-accent" />
                    Opções de Resposta e Mapeamento
                  </h4>
                </div>

                <div className="flex flex-col gap-3">
                  {question.options.map((option, optIdx) => (
                    <OptionMappingRow
                      key={optIdx}
                      option={option}
                      onUpdate={(updated) => handleUpdateOption(optIdx, updated)}
                      onDelete={() => handleDeleteOption(optIdx)}
                      onOpenContentPicker={() => onOpenContentPicker(optIdx)}
                      index={contentIndex}
                    />
                  ))}
                </div>

                <button
                  onClick={handleAddOption}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-accent/40 bg-accent/5 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 hover:border-accent/60"
                >
                  <Plus size={16} />
                  Adicionar Opção
                </button>
              </div>}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
