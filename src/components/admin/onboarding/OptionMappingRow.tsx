'use client';

import React, { useRef, useState } from 'react';
import { ContentMapping, QuestionOption } from '@/types/trilha';
import { X, Clock, Plus, GripVertical, FileText, Video, Folder, BookOpen, Link as LinkIcon, Layers3, TriangleAlert, ImagePlus, LoaderCircle } from 'lucide-react';
import { Reorder } from 'framer-motion';
import type { ContentIndex } from '@/lib/contentCatalog';
import { normalizeTag } from '@/lib/matching';
import { createClient } from '@/lib/supabase/client';
import { uploadImageToStorage } from '@/lib/imageOptimization';

interface OptionMappingRowProps {
  option: QuestionOption;
  onUpdate: (updatedOption: QuestionOption) => void;
  onDelete: () => void;
  onOpenContentPicker: () => void;
  /** Catálogo real — usado para sinalizar mapeamentos que já não existem mais (curso/aula despublicada). */
  index: ContentIndex;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'lesson': return <Video size={14} className="text-accent" />;
    case 'module': return <Folder size={14} className="text-warning" />;
    case 'course': return <BookOpen size={14} className="text-success" />;
    case 'article': return <FileText size={14} className="text-accent" />;
    case 'external_link': return <LinkIcon size={14} className="text-muted" />;
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

/** Um link externo customizado nunca precisa existir no catálogo — só cursos/módulos/aulas/artigos. */
function isOrphan(mapping: ContentMapping, index: ContentIndex): boolean {
  if (mapping.type === 'external_link') return index.resolve(mapping).length === 0 && !(mapping.url && mapping.estimatedDurationMin);
  return index.resolve(mapping).length === 0;
}

export const OptionMappingRow: React.FC<OptionMappingRowProps> = ({ option, onUpdate, onDelete, onOpenContentPicker, index }) => {
  const [newTag, setNewTag] = useState('');
  /** Mapeamento cuja capa está sendo enviada agora. */
  const [uploadingCoverFor, setUploadingCoverFor] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const coverTargetRef = useRef<string | null>(null);

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate({
      ...option,
      tags: option.tags?.filter(tag => tag !== tagToRemove)
    });
  };

  const handleAddTag = () => {
    const normalized = normalizeTag(newTag);
    if (!normalized) return;
    if (!option.tags?.includes(normalized)) {
      onUpdate({ ...option, tags: [...(option.tags || []), normalized] });
    }
    setNewTag('');
  };

  const handleRemoveMapping = (mappingId: string) => {
    onUpdate({
      ...option,
      contentMappings: option.contentMappings?.filter(m => m.id !== mappingId)
    });
  };

  const handleUpdateMapping = (mappingId: string, patch: Partial<ContentMapping>) => {
    onUpdate({
      ...option,
      contentMappings: option.contentMappings?.map(m =>
        m.id === mappingId ? { ...m, ...patch } : m
      )
    });
  };

  /**
   * Troca da capa de um link já vinculado.
   *
   * A capa vem do Open Graph do site quando o link é criado; aqui o admin
   * substitui por uma imagem própria sem precisar remover e remapear o conteúdo.
   */
  const handlePickCover = (mappingId: string) => {
    coverTargetRef.current = mappingId;
    coverInputRef.current?.click();
  };

  const handleCoverSelected = async (file: File | undefined) => {
    const mappingId = coverTargetRef.current;
    if (!file || !mappingId) return;

    setUploadingCoverFor(mappingId);
    try {
      const { publicUrl } = await uploadImageToStorage(createClient(), {
        file,
        folder: 'trilha',
        maxWidth: 1600,
      });
      handleUpdateMapping(mappingId, { cover: publicUrl });
    } catch (error) {
      console.error('Erro ao enviar a capa do link:', error);
    } finally {
      setUploadingCoverFor(null);
      coverTargetRef.current = null;
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-surface/50 p-4 transition-colors hover:border-border">
      {/* Um input só para todos os links da opção: quem abre define o alvo. */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleCoverSelected(event.target.files?.[0])}
      />

      {/* Top Row: card identity and tags */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <GripVertical size={16} className="cursor-grab text-muted hover:text-foreground" />
          <input
            type="text"
            value={option.emoji || ''}
            onChange={(event) => onUpdate({ ...option, emoji: event.target.value.slice(0, 8) })}
            className="w-11 rounded-lg border border-border/60 bg-background px-1 py-1.5 text-center text-lg outline-none focus:border-accent"
            placeholder="✨"
            aria-label={`Emoji da resposta ${option.label}`}
            title="Emoji do card"
          />
          <input
            type="text"
            value={option.label}
            onChange={(e) => onUpdate({ ...option, label: e.target.value })}
            className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-accent px-1 py-0.5 transition-colors"
            placeholder="Título do card"
            aria-label="Título do card"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {option.tags?.map((tag, idx) => (
            <span key={idx} className="flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1 text-xs text-muted">
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="hover:text-danger transition-colors">
                <X size={12} />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1 rounded-full border border-dashed border-border/70 pl-2.5 pr-1 py-0.5">
            <input
              type="text"
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="nova tag"
              className="w-16 bg-transparent text-xs text-muted outline-none placeholder:text-muted"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="p-0.5 text-muted hover:text-accent disabled:opacity-30 transition-colors"
              aria-label="Adicionar tag"
            >
              <Plus size={12} />
            </button>
          </div>
          <button onClick={onDelete} className="p-1.5 text-muted hover:bg-danger/10 hover:text-danger rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="pl-7">
        <label className="text-xs font-semibold text-muted">
          Descrição do card <span className="font-normal">(opcional)</span>
          <textarea
            value={option.description || ''}
            onChange={(event) => onUpdate({ ...option, description: event.target.value.slice(0, 280) })}
            rows={2}
            placeholder="Explique rapidamente o que esta escolha representa."
            className="mt-1.5 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
      </div>

      {/* Content Mappings Area */}
      <div className="pl-7 pr-1 mt-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
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
              {option.contentMappings.map((mapping) => {
                const orphan = isOrphan(mapping, index);
                return (
                <Reorder.Item
                  key={mapping.id}
                  value={mapping}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-sm ${orphan ? 'border-danger/40 bg-danger/5' : 'border-border/60 bg-surface'}`}
                >
                  <GripVertical size={14} className="cursor-grab text-muted shrink-0" />

                  {mapping.type === 'external_link' ? (
                    <button
                      type="button"
                      onClick={() => handlePickCover(mapping.id)}
                      title="Trocar a capa deste link"
                      aria-label={`Trocar a capa de ${mapping.title}`}
                      className="group relative h-8 w-14 shrink-0 overflow-hidden rounded border border-border/60 bg-background"
                    >
                      {mapping.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mapping.cover} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center">{getTypeIcon(mapping.type)}</span>
                      )}
                      <span className="absolute inset-0 grid place-items-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <ImagePlus size={13} />
                      </span>
                      {uploadingCoverFor === mapping.id && (
                        <span className="absolute inset-0 grid place-items-center bg-black/55 text-white">
                          <LoaderCircle size={13} className="animate-spin" />
                        </span>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center w-6 h-6 rounded bg-background shrink-0" title={getTypeLabel(mapping.type)}>
                      {getTypeIcon(mapping.type)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium text-foreground">{mapping.title}</div>
                    {orphan && (
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-danger">
                        <TriangleAlert size={11} />
                        Não encontrado no catálogo — remova ou substitua
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 border-l border-border/60 pl-3">
                    <Layers3 size={14} className="text-muted" />
                    <select
                      aria-label={`Papel pedagógico de ${mapping.title}`}
                      value={mapping.learningRole}
                      onChange={(event) => handleUpdateMapping(mapping.id, { learningRole: event.target.value as ContentMapping['learningRole'] })}
                      className="rounded border border-border/70 bg-background px-2 py-1 text-xs font-semibold outline-none focus:border-accent"
                    >
                      <option value="essential">Essencial</option>
                      <option value="deepening">Aprofundamento</option>
                      <option value="extra">Extra</option>
                    </select>
                    {(mapping.type === 'article' || mapping.type === 'external_link') && (
                      <label className="flex items-center gap-1 text-xs text-muted">
                        <Clock size={13} />
                        <input
                          aria-label={`Duração estimada de ${mapping.title}`}
                          type="number"
                          min="1"
                          max="240"
                          value={mapping.estimatedDurationMin || 10}
                          onChange={(event) => handleUpdateMapping(mapping.id, { estimatedDurationMin: Number(event.target.value) || 10 })}
                          className="w-12 rounded border border-border/70 bg-background px-1.5 py-1 text-center outline-none focus:border-accent"
                        />
                        min
                      </label>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemoveMapping(mapping.id)}
                    className="ml-2 p-1 text-muted hover:bg-danger/10 hover:text-danger rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                </Reorder.Item>
                );
              })}
            </Reorder.Group>
          ) : (
            <div className="text-sm text-muted italic py-2 px-3 border border-dashed border-border/60 rounded-lg bg-surface/30">
              Nenhum conteúdo vinculado. Respostas contarão apenas via tags.
            </div>
          )}
        </div>

        <button
          onClick={onOpenContentPicker}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-soft-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-accent/5 w-max"
        >
          <Plus size={14} />
          Associar Conteúdo
        </button>
      </div>

    </div>
  );
};
