import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Video, Folder, BookOpen, FileText, Link as LinkIcon, Check, Plus } from 'lucide-react';
import { getMockContentByType, MockContentItem } from '@/lib/mocks/onboardingMocks';
import { ContentMapping } from '@/types/trilha';

interface ContentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMappings: (mappings: ContentMapping[]) => void;
}

const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'course', label: 'Cursos', icon: BookOpen },
  { id: 'module', label: 'Módulos', icon: Folder },
  { id: 'lesson', label: 'Aulas', icon: Video },
  { id: 'article', label: 'Artigos', icon: FileText },
  { id: 'external_link', label: 'Links Ext.', icon: LinkIcon },
];

export const ContentPickerModal: React.FC<ContentPickerModalProps> = ({ isOpen, onClose, onAddMappings }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // For external links manually added
  const [customLinkTitle, setCustomLinkTitle] = useState('');
  const [customLinkUrl, setCustomLinkUrl] = useState('');

  const contents = useMemo(() => getMockContentByType(activeTab), [activeTab]);

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
      const item = getMockContentByType('all').find(i => i.id === id);
      if (item) {
        newMappings.push({
          id: item.id,
          type: item.type,
          title: item.title,
          slug: item.slug,
          url: item.url,
          unlockAfterDays: 0 // default 0 days (imediato)
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
        unlockAfterDays: 0
      });
    }

    onAddMappings(newMappings);
    
    // Reset state and close
    setSelectedIds(newSet => new Set());
    setCustomLinkTitle('');
    setCustomLinkUrl('');
    onClose();
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'lesson': return <Video size={16} className="text-blue-400" />;
      case 'module': return <Folder size={16} className="text-yellow-400" />;
      case 'course': return <BookOpen size={16} className="text-green-400" />;
      case 'article': return <FileText size={16} className="text-purple-400" />;
      case 'external_link': return <LinkIcon size={16} className="text-gray-400" />;
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
            <div className="flex items-center justify-between border-b border-border/40 p-5 bg-surface-card">
              <h2 className="text-xl font-bold text-ink-deep flex items-center gap-2">
                <Plus size={20} className="text-primary" />
                Associar Conteúdo
              </h2>
              <button onClick={onClose} className="p-2 text-text-mute hover:text-text hover:bg-surface-hover rounded-full transition-colors">
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
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-text-mute hover:text-text'
                  }`}
                >
                  {tab.icon && <tab.icon size={16} />}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="p-5 border-b border-border/40 bg-surface-card/50">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mute" />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título ou categoria..."
                  className="w-full bg-bg border border-border/60 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary transition-colors text-text"
                />
              </div>
            </div>

            {/* Content List / Custom Form */}
            <div className="flex-1 overflow-y-auto p-5 bg-bg">
              {activeTab === 'external_link' && (
                <div className="mb-6 p-4 border border-primary/30 bg-primary/5 rounded-xl flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <LinkIcon size={16} />
                    Adicionar Link Personalizado
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      placeholder="Título do Link (ex: Entrar no Grupo VIP)"
                      value={customLinkTitle}
                      onChange={e => setCustomLinkTitle(e.target.value)}
                      className="bg-surface border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <input 
                      type="url" 
                      placeholder="https://..."
                      value={customLinkUrl}
                      onChange={e => setCustomLinkUrl(e.target.value)}
                      className="bg-surface border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    />
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
                            ? 'border-primary bg-primary/5 shadow-sm' 
                            : 'border-border/60 bg-surface hover:border-border hover:shadow-sm'
                        }`}
                      >
                        <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border transition-colors shrink-0 ${
                          isSelected ? 'bg-primary border-primary' : 'border-border/80 bg-surface'
                        }`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getIconForType(item.type)}
                            <span className="text-xs font-semibold uppercase tracking-wider text-text-mute">
                              {item.type}
                            </span>
                          </div>
                          <h4 className={`font-semibold text-sm truncate ${isSelected ? 'text-primary' : 'text-text'}`}>
                            {item.title}
                          </h4>
                          {item.category && (
                            <p className="text-xs text-text-soft mt-0.5">{item.category}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-text-mute">
                  <Search size={40} className="mb-4 opacity-20" />
                  <p>Nenhum conteúdo encontrado para sua busca.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/40 p-5 bg-surface-card flex items-center justify-between">
              <span className="text-sm font-medium text-text-soft">
                {selectedIds.size} item(s) selecionado(s)
                {customLinkTitle && customLinkUrl ? ' + 1 Link Pers.' : ''}
              </span>
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg font-semibold text-text-mute hover:text-text hover:bg-surface-hover transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAdd}
                  disabled={selectedIds.size === 0 && (!customLinkTitle || !customLinkUrl)}
                  className="px-6 py-2.5 rounded-lg font-bold bg-primary text-white hover:bg-primary-active disabled:opacity-50 transition-colors shadow-sm"
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
