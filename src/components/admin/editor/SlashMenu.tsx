"use client";

import React, { useEffect, useRef } from 'react';
import { Button } from '@heroui/react';
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
      role="listbox"
      aria-label="Blocos disponíveis"
      className="absolute z-50 flex max-h-64 w-64 flex-col overflow-y-auto rounded-xl border border-border bg-overlay py-2 shadow-overlay animate-in fade-in zoom-in-95 duration-200"
      style={{ top: y, left: x }}
    >
      <div className="mb-1 border-b border-border px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Blocos Básicos
      </div>
      {filteredItems.map((item, idx) => {
        const isActive = idx === selectedIndex;
        const MenuButton = Button as any;
        return (
          <MenuButton
            key={item.id}
            role="option"
            aria-selected={isActive}
            variant={isActive ? 'secondary' : 'ghost'}
            fullWidth
            className="h-auto justify-start gap-3 rounded-none px-4 py-2 text-left"
            onClick={() => onSelect(item.type)}
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-md border ${
                isActive ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-surface-secondary text-muted'
              }`}
            >
              <item.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className={`block truncate text-sm font-medium ${isActive ? 'text-accent' : 'text-foreground'}`}>
                {item.label}
              </span>
              <span className="block text-xs text-muted">
                Atalho: /{item.shortcut}
              </span>
            </span>
          </MenuButton>
        );
      })}
    </div>
  );
}
