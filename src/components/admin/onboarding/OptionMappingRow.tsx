import React from 'react';
import { ContentMapping, QuestionOption } from '@/types/trilha';
import { X, Clock, Plus, GripVertical, FileText, Video, Folder, BookOpen, Link as LinkIcon } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';

interface OptionMappingRowProps {
  option: QuestionOption;
  onUpdate: (updatedOption: QuestionOption) => void;
  onDelete: () => void;
  onOpenContentPicker: () => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'lesson': return <Video size={14} className="text-blue-400" />;
    case 'module': return <Folder size={14} className="text-yellow-400" />;
    case 'course': return <BookOpen size={14} className="text-green-400" />;
    case 'article': return <FileText size={14} className="text-purple-400" />;
    case 'external_link': return <LinkIcon size={14} className="text-gray-400" />;
    default: return <FileText size={14} />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'lesson': return 'Aula';
    case 'module': return 'Módulo';
    case 'course': return 'Curso';
    case 'article': return 'Artigo';
    case 'external_link': return 'Link Externo';
    default: return 'Conteúdo';
  }
};

export const OptionMappingRow: React.FC<OptionMappingRowProps> = ({ option, onUpdate, onDelete, onOpenContentPicker }) => {
  
  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate({
      ...option,
      tags: option.tags?.filter(tag => tag !== tagToRemove)
    });
  };

  const handleRemoveMapping = (mappingId: string) => {
    onUpdate({
      ...option,
      contentMappings: option.contentMappings?.filter(m => m.id !== mappingId)
    });
  };

  const handleUpdateDays = (mappingId: string, days: number) => {
    onUpdate({
      ...option,
      contentMappings: option.contentMappings?.map(m => 
        m.id === mappingId ? { ...m, unlockAfterDays: days } : m
      )
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-surface/50 p-4 transition-colors hover:border-border">
      
      {/* Top Row: Label and Tags */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <GripVertical size={16} className="cursor-grab text-text-mute hover:text-text" />
          <input 
            type="text" 
            value={option.label}
            onChange={(e) => onUpdate({ ...option, label: e.target.value })}
            className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-primary px-1 py-0.5 transition-colors"
            placeholder="Texto da Opção"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {option.tags?.map((tag, idx) => (
            <span key={idx} className="flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1 text-xs text-text-soft">
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="hover:text-negative transition-colors">
                <X size={12} />
              </button>
            </span>
          ))}
          <button onClick={onDelete} className="p-1.5 text-text-mute hover:bg-negative/10 hover:text-negative rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content Mappings Area */}
      <div className="pl-7 pr-1 mt-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-text-mute mb-3 flex items-center gap-2">
          <span>Conteúdos Vinculados</span>
          <div className="h-px flex-1 bg-border/40"></div>
        </div>

        <div className="flex flex-col gap-2 mb-3">
          {option.contentMappings && option.contentMappings.length > 0 ? (
            <Reorder.Group 
              axis="y" 
              values={option.contentMappings} 
              onReorder={(newOrder) => onUpdate({ ...option, contentMappings: newOrder })}
              className="flex flex-col gap-2"
            >
              {option.contentMappings.map((mapping) => (
                <Reorder.Item 
                  key={mapping.id} 
                  value={mapping}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface px-3 py-2 text-sm shadow-sm"
                >
                  <GripVertical size={14} className="cursor-grab text-text-mute shrink-0" />
                  
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-bg shrink-0" title={getTypeLabel(mapping.type)}>
                    {getTypeIcon(mapping.type)}
                  </div>
                  
                  <div className="flex-1 truncate font-medium text-text">
                    {mapping.title}
                  </div>
                  
                  <div className="flex items-center gap-2 border-l border-border/60 pl-3">
                    <Clock size={14} className="text-text-mute" />
                    <span className="text-xs text-text-soft">Liberar em</span>
                    <input 
                      type="number"
                      min="0"
                      value={mapping.unlockAfterDays}
                      onChange={(e) => handleUpdateDays(mapping.id, parseInt(e.target.value) || 0)}
                      className="w-12 rounded bg-bg px-1.5 py-1 text-center text-xs outline-none border border-transparent focus:border-primary"
                    />
                    <span className="text-xs text-text-soft">dias</span>
                  </div>

                  <button 
                    onClick={() => handleRemoveMapping(mapping.id)}
                    className="ml-2 p-1 text-text-mute hover:bg-negative/10 hover:text-negative rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          ) : (
            <div className="text-sm text-text-soft italic py-2 px-3 border border-dashed border-border/60 rounded-lg bg-surface/30">
              Nenhum conteúdo vinculado. Respostas contarão apenas via tags.
            </div>
          )}
        </div>

        <button 
          onClick={onOpenContentPicker}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-active transition-colors px-2 py-1.5 rounded-md hover:bg-primary/5 w-max"
        >
          <Plus size={14} />
          Associar Conteúdo
        </button>
      </div>

    </div>
  );
};
