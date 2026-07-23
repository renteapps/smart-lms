import React, { useEffect, useRef } from 'react';
import { Type, Heading1, Heading2, Video, HelpCircle, Lightbulb, Quote, Table } from 'lucide-react';

export type BlockType = 'paragraph' | 'h1' | 'h2' | 'video' | 'quiz' | 'reflexao' | 'citacao' | 'table';

interface SlashMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
  filter: string;
}

export const MENU_ITEMS = [
  { id: 'paragraph', label: 'Texto Normal', icon: Type, type: 'paragraph' as BlockType, shortcut: 'text' },
  { id: 'h1', label: 'Título 1', icon: Heading1, type: 'h1' as BlockType, shortcut: 'h1' },
  { id: 'h2', label: 'Título 2', icon: Heading2, type: 'h2' as BlockType, shortcut: 'h2' },
  { id: 'video', label: 'Vídeo', icon: Video, type: 'video' as BlockType, shortcut: 'video' },
  { id: 'table', label: 'Tabela', icon: Table, type: 'table' as BlockType, shortcut: 'table' },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, type: 'quiz' as BlockType, shortcut: 'quiz' },
  { id: 'reflexao', label: 'Reflexão', icon: Lightbulb, type: 'reflexao' as BlockType, shortcut: 'reflexao' },
  { id: 'citacao', label: 'Citação', icon: Quote, type: 'citacao' as BlockType, shortcut: 'citacao' },
];

export default function SlashMenu({ x, y, isOpen, onSelect, onClose, filter, selectedIndex = 0 }: SlashMenuProps & { selectedIndex?: number }) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredItems = MENU_ITEMS.filter(item => 
    item.label.toLowerCase().includes(filter.toLowerCase()) || 
    item.shortcut.includes(filter.toLowerCase())
  );

  if (filteredItems.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-64 bg-surface/90 backdrop-blur-md border border-border rounded-xl shadow-xl py-2 flex flex-col max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
      style={{ top: y, left: x }}
    >
      <div className="px-3 pb-2 text-xs font-semibold text-text-soft uppercase tracking-wider mb-1 border-b border-border">
        Blocos Básicos
      </div>
      {filteredItems.map((item, idx) => (
        <button
          key={item.id}
          className={`flex items-center gap-3 px-4 py-2 text-left transition-colors ${
            idx === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-surface-hover text-text-soft'
          }`}
          onClick={() => onSelect(item.type)}
        >
          <div className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
            idx === selectedIndex ? 'bg-primary border-primary text-white' : 'bg-surface-card border-border'
          }`}>
            <item.icon className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-sm font-medium ${idx === selectedIndex ? 'text-primary' : 'text-text'}`}>
              {item.label}
            </div>
            <div className={`text-xs ${idx === selectedIndex ? 'text-primary/70' : 'text-text-soft'}`}>
              Atalho: /{item.shortcut}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
