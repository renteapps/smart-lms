'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Video, Folder, BookOpen, FileText, Link as LinkIcon, Check, Plus, Inbox, LoaderCircle } from 'lucide-react';
import type { ContentIndex } from '@/lib/contentCatalog';
import { filterContentByType } from '@/lib/contentCatalog';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { fetchLinkPreview } from '@/app/actions/admin/linkPreview';
import { ContentMapping } from '@/types/trilha';

interface ContentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMappings: (mappings: ContentMapping[]) => void;
  /** Catálogo real montado a partir do Supabase — cursos, módulos, aulas e artigos publicados. */
  index: ContentIndex;
}

const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'course', label: 'Cursos', icon: BookOpen },
  { id: 'module', label: 'Módulos', icon: Folder },
  { id: 'lesson', label: 'Aulas', icon: Video },
  { id: 'article', label: 'Artigos', icon: FileText },
  { id: 'external_link', label: 'Links externos', icon: LinkIcon },
];

/** Mesmos rótulos da lista de mapeamentos — o tipo nunca aparece em inglês para o admin. */
/** Só vale disparar a prévia quando o endereço já parece completo. */
const LOOKS_LIKE_URL = /^https?:\/\/\S+\.\S+/i;

const TYPE_LABELS: Record<string, string> = {
  lesson: 'Aula',
  module: 'Módulo',
  course: 'Curso',
  article: 'Artigo',
  external_link: 'Link externo',
};

export const ContentPickerModal: React.FC<ContentPickerModalProps> = ({ isOpen, onClose, onAddMappings, index }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // For external links manually added
  const [customLinkTitle, setCustomLinkTitle] = useState('');
  const [customLinkUrl, setCustomLinkUrl] = useState('');
  const [customLinkDuration, setCustomLinkDuration] = useState(10);
  const [customLinkCover, setCustomLinkCover] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'failed'>('idle');
  /** Capa e título escritos à mão nunca são sobrescritos pela busca automática. */
  const [coverIsManual, setCoverIsManual] = useState(false);
  const [titleIsManual, setTitleIsManual] = useState(false);

  /*
   * Prévia do link: o site de destino publica a própria capa em Open Graph, e é
   * ela que entra na trilha do aluno. Roda com atraso porque o campo dispara a
   * cada tecla — buscar a cada caractere seria uma rajada de requisições para
   * endereços incompletos.
   */
  useEffect(() => {
    const url = customLinkUrl.trim();
    if (!LOOKS_LIKE_URL.test(url)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewState('loading');
      const result = await fetchLinkPreview(url);
      if (cancelled) return;

      if (!result.success) {
        setPreviewState('failed');
        return;
      }

      setPreviewState('idle');
      if (result.preview.image && !coverIsManual) setCustomLinkCover(result.preview.image);
      if (result.preview.title && !titleIsManual) setCustomLinkTitle(result.preview.title);
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customLinkUrl, coverIsManual, titleIsManual]);

  const contents = useMemo(() => filterContentByType(index, activeTab), [index, activeTab]);

  const filteredContents = useMemo(() => {
    if (!search) return contents;
    const lowerSearch = search.toLowerCase();
    return contents.filter(item =>
      item.title.toLowerCase().includes(lowerSearch) ||
      item.category?.toLowerCase().includes(lowerSearch)
    );
  }, [contents, search]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleAdd = () => {
    const newMappings: ContentMapping[] = [];

    // Add selected items from the list
    selectedIds.forEach(id => {
      const item = index.byId(id);
      if (item) {
        newMappings.push({
          id: item.id,
          type: item.type,
          title: item.title,
          slug: item.slug,
          url: item.url,
          learningRole: 'essential',
          estimatedDurationMin: item.estimatedDurationMin,
        });
      }
    });

    // Add manual custom link if filled
    if (activeTab === 'external_link' && customLinkTitle && customLinkUrl) {
      newMappings.push({
        id: `ext-${Date.now()}`,
        type: 'external_link',
        title: customLinkTitle,
        url: customLinkUrl,
        learningRole: 'essential',
        estimatedDurationMin: customLinkDuration,
        cover: customLinkCover || undefined,
      });
    }

    onAddMappings(newMappings);

    // Reset state and close
    setSelectedIds(new Set());
    setCustomLinkTitle('');
    setCustomLinkUrl('');
    setCustomLinkDuration(10);
    setCustomLinkCover(null);
    setCoverIsManual(false);
    setTitleIsManual(false);
    setPreviewState('idle');
    onClose();
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'lesson': return <Video size={16} className="text-accent" />;
      case 'module': return <Folder size={16} className="text-warning" />;
      case 'course': return <BookOpen size={16} className="text-success" />;
      case 'article': return <FileText size={16} className="text-accent" />;
      case 'external_link': return <LinkIcon size={16} className="text-muted" />;
      default: return <FileText size={16} />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex flex-col max-h-[85vh] rounded-2xl border border-border/50 bg-surface shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 p-5 bg-surface">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Plus size={20} className="text-accent" />
                Associar Conteúdo
              </h2>
              <button onClick={onClose} className="p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 px-5 pt-4 border-b border-border/40 overflow-x-auto hide-scrollbar">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
                    activeTab === tab.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted hover:text-foreground'
                  }`}
                >
                  {tab.icon && <tab.icon size={16} />}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="p-5 border-b border-border/40 bg-surface/50">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título ou categoria..."
                  className="w-full bg-background border border-border/60 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent transition-colors text-foreground"
                />
              </div>
            </div>

            {/* Content List / Custom Form */}
            <div className="flex-1 overflow-y-auto p-5 bg-background">
              {activeTab === 'external_link' && (
                <div className="mb-6 p-4 border border-accent/30 bg-accent/5 rounded-xl flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-accent flex items-center gap-2">
                    <LinkIcon size={16} />
                    Adicionar link personalizado
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_110px]">
                    <input
                      type="text"
                      placeholder="Título do link (ex.: Entrar no grupo VIP)"
                      value={customLinkTitle}
                      onChange={e => {
                        setCustomLinkTitle(e.target.value);
                        setTitleIsManual(true);
                      }}
                      className="bg-surface border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface px-3 text-xs font-semibold text-muted">
                      <input
                        type="number"
                        min="1"
                        max="240"
                        value={customLinkDuration}
                        onChange={(event) => setCustomLinkDuration(Number(event.target.value) || 10)}
                        className="w-12 bg-transparent text-sm text-foreground outline-none"
                      /> min
                    </label>
                  </div>

                  <input
                    type="url"
                    placeholder="https://..."
                    value={customLinkUrl}
                    onChange={e => setCustomLinkUrl(e.target.value)}
                    className="bg-surface border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                  />

                  <div className="grid gap-2 border-t border-accent/20 pt-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-foreground">
                      Capa do link
                      {previewState === 'loading' && (
                        <span className="flex items-center gap-1.5 font-semibold text-muted">
                          <LoaderCircle size={12} className="animate-spin" />
                          buscando a imagem do site…
                        </span>
                      )}
                    </div>

                    <ImageUpload
                      value={customLinkCover}
                      onChange={(url) => {
                        setCustomLinkCover(url);
                        // Escolha manual manda: a próxima busca automática não a sobrescreve.
                        setCoverIsManual(true);
                      }}
                      label="Capa do link"
                      hideLabel
                      folder="trilha"
                      aspect="wide"
                      className="max-w-xs"
                      description="Puxamos a imagem que o próprio site publica. Envie outra para substituir."
                    />

                    {previewState === 'failed' && LOOKS_LIKE_URL.test(customLinkUrl.trim()) && (
                      <p className="text-xs font-semibold text-warning">
                        Não conseguimos ler a imagem desse endereço. Envie uma capa para o conteúdo não entrar sem imagem na trilha.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {filteredContents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredContents.map(item => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleSelect(item.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-accent bg-accent/5 shadow-sm'
                            : 'border-border/60 bg-surface hover:border-border hover:shadow-sm'
                        }`}
                      >
                        <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border transition-colors shrink-0 ${
                          isSelected ? 'bg-accent border-accent' : 'border-border/80 bg-surface'
                        }`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getIconForType(item.type)}
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                              {TYPE_LABELS[item.type] ?? 'Conteúdo'}
                            </span>
                            {item.estimatedDurationMin && (
                              <span className="text-xs font-semibold text-muted">· {item.estimatedDurationMin} min</span>
                            )}
                          </div>
                          <h4 className={`font-semibold text-sm truncate ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                            {item.title}
                          </h4>
                          {item.category && (
                            <p className="text-xs text-muted mt-0.5 truncate">{item.category}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : activeTab !== 'external_link' ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted">
                  <Inbox size={40} className="mb-4 opacity-20" />
                  <p className="font-semibold">
                    {search ? 'Nenhum conteúdo encontrado para sua busca.' : 'Nenhum conteúdo publicado nesta categoria ainda.'}
                  </p>
                  {!search && <p className="mt-1 text-xs text-muted">Publique cursos, módulos ou artigos para poder mapeá-los aqui.</p>}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="border-t border-border/40 p-5 bg-surface flex items-center justify-between">
              <span className="text-sm font-medium text-muted">
                {selectedIds.size === 1 ? '1 item selecionado' : `${selectedIds.size} itens selecionados`}
                {customLinkTitle && customLinkUrl ? ' + 1 link personalizado' : ''}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg font-semibold text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdd}
                  disabled={selectedIds.size === 0 && (!customLinkTitle || !customLinkUrl)}
                  className="px-6 py-2.5 rounded-lg font-bold bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
                >
                  Adicionar à Opção
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
