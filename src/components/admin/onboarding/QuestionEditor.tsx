import React, { useState } from 'react';
import { Question, QuestionOption } from '@/types/trilha';
import { ChevronDown, ChevronUp, GripVertical, Settings2, Plus, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OptionMappingRow } from './OptionMappingRow';

interface QuestionEditorProps {
  question: Question;
  index: number;
  onUpdate: (updatedQuestion: Question) => void;
  onOpenContentPicker: (optionIndex: number) => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({ 
  question, 
  index, 
  onUpdate,
  onOpenContentPicker
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleUpdateOption = (optionIndex: number, updatedOption: QuestionOption) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = updatedOption;
    onUpdate({ ...question, options: newOptions });
  };

  const handleAddOption = () => {
    const newOption: QuestionOption = {
      label: 'Nova Opção',
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
    <div className="rounded-2xl border border-border/40 bg-surface shadow-sm overflow-hidden transition-all hover:border-border/80">
      
      {/* Header / Summary */}
      <div 
        className="flex items-center gap-4 p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <GripVertical size={20} className="text-text-mute hover:text-text cursor-grab shrink-0" />
        
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
          {index + 1}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text truncate">{question.text}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-text-soft">
            <span className="capitalize">{question.role}</span>
            <span>•</span>
            <span>{question.type === 'single' ? 'Escolha Única' : 'Múltipla Escolha'}</span>
            <span>•</span>
            <span>{question.options.length} opções</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button className="p-2 text-text-mute hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
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
            className="border-t border-border/40 bg-surface-card"
          >
            <div className="p-5 flex flex-col gap-5">
              
              {/* Question Settings Row */}
              <div className="flex flex-wrap gap-4 items-center bg-surface p-3 rounded-xl border border-border/40">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-semibold text-text-mute mb-1 block">Título da Pergunta</label>
                  <div className="flex items-center gap-2 border-b border-border/60 pb-1 focus-within:border-primary transition-colors">
                    <Type size={16} className="text-text-mute" />
                    <input 
                      type="text" 
                      value={question.text}
                      onChange={(e) => onUpdate({ ...question, text: e.target.value })}
                      className="w-full bg-transparent text-sm font-medium outline-none text-text"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-mute mb-1 block">Papel (Role)</label>
                  <select 
                    value={question.role}
                    onChange={(e) => onUpdate({ ...question, role: e.target.value as any })}
                    className="bg-bg border border-border/60 rounded-lg text-sm px-3 py-1.5 outline-none focus:border-primary"
                  >
                    <option value="perfil">Perfil</option>
                    <option value="problema">Problema</option>
                    <option value="interesse">Interesse</option>
                    <option value="nivel">Nível</option>
                    <option value="restricao">Restrição</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-mute mb-1 block">Seleção</label>
                  <select 
                    value={question.type}
                    onChange={(e) => onUpdate({ ...question, type: e.target.value as any })}
                    className="bg-bg border border-border/60 rounded-lg text-sm px-3 py-1.5 outline-none focus:border-primary"
                  >
                    <option value="single">Única</option>
                    <option value="multiple">Múltipla</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-text-mute mb-1 block">Visual</label>
                  <select 
                    value={question.visualType || 'list'}
                    onChange={(e) => onUpdate({ ...question, visualType: e.target.value as any })}
                    className="bg-bg border border-border/60 rounded-lg text-sm px-3 py-1.5 outline-none focus:border-primary"
                  >
                    <option value="list">Lista</option>
                    <option value="cards">Cards (Grid)</option>
                    <option value="physics">Física (Bolas)</option>
                  </select>
                </div>
              </div>

              {/* Options List */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-ink-deep flex items-center gap-2">
                    <Settings2 size={16} className="text-primary" />
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
                    />
                  ))}
                </div>

                <button 
                  onClick={handleAddOption}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 hover:border-primary/60"
                >
                  <Plus size={16} />
                  Adicionar Opção
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
