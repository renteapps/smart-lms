import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ContentBlock } from '@/lib/mockData';
import SlashMenu, { BlockType, MENU_ITEMS } from './SlashMenu';
import RichTextEditor from './RichTextEditor';
import TableBlockEditor from './TableBlockEditor';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

interface BlockEditorProps {
  initialBlocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

export default function BlockEditor({ initialBlocks, onChange }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks.length > 0 ? initialBlocks : [{ id: 'b_' + Date.now(), type: 'paragraph', content: '' }]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  
  const [slashMenuState, setSlashMenuState] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    blockIndex: number;
    filter: string;
    selectedIndex: number;
  }>({ isOpen: false, x: 0, y: 0, blockIndex: -1, filter: '', selectedIndex: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<(HTMLTextAreaElement | HTMLInputElement | HTMLDivElement | null)[]>([]);
  
  const historyRef = useRef<ContentBlock[][]>([blocks]);
  const historyIndexRef = useRef<number>(0);
  const isUndoRedoAction = useRef<boolean>(false);

  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
  }, [blocks]);

  const pushHistory = (newBlocks: ContentBlock[]) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(JSON.parse(JSON.stringify(newBlocks)));
    if (newHistory.length > 50) newHistory.shift();
    else historyIndexRef.current++;
    historyRef.current = newHistory;
    setBlocks(newBlocks);
    onChange(newBlocks);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent | any) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          if (historyIndexRef.current < historyRef.current.length - 1) {
            e.preventDefault();
            isUndoRedoAction.current = true;
            historyIndexRef.current++;
            const state = historyRef.current[historyIndexRef.current];
            setBlocks(state);
            onChange(state);
          }
        } else {
          if (historyIndexRef.current > 0) {
            e.preventDefault();
            isUndoRedoAction.current = true;
            historyIndexRef.current--;
            const state = historyRef.current[historyIndexRef.current];
            setBlocks(state);
            onChange(state);
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onChange]);

  useEffect(() => {
    if (focusedIndex !== null && blockRefs.current[focusedIndex]) {
      blockRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  const updateBlock = (index: number, newBlockData: Partial<ContentBlock>, saveHistory = true) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...newBlockData };
    if (saveHistory) {
      pushHistory(newBlocks);
    } else {
      setBlocks(newBlocks);
      onChange(newBlocks);
    }
  };

  const addBlock = (index: number, type: BlockType = 'paragraph') => {
    const newBlock: ContentBlock = {
      id: 'b_' + Date.now() + Math.random(),
      type,
      content: ''
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    pushHistory(newBlocks);
    setFocusedIndex(index + 1);
  };

  const deleteBlock = (index: number) => {
    if (blocks.length === 1) return;
    const newBlocks = blocks.filter((_, i) => i !== index);
    pushHistory(newBlocks);
    setFocusedIndex(Math.max(0, index - 1));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newBlocks = [...blocks];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      pushHistory(newBlocks);
      setFocusedIndex(index - 1);
    } else if (direction === 'down' && index < blocks.length - 1) {
      const newBlocks = [...blocks];
      [newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]];
      pushHistory(newBlocks);
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>, index: number) => {
    const block = blocks[index];

    if (slashMenuState.isOpen) {
      const filteredItems = MENU_ITEMS.filter(item => 
        item.label.toLowerCase().includes(slashMenuState.filter.toLowerCase()) || 
        item.shortcut.includes(slashMenuState.filter.toLowerCase())
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashMenuState(prev => ({ ...prev, selectedIndex: Math.min(filteredItems.length - 1, prev.selectedIndex + 1) }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashMenuState(prev => ({ ...prev, selectedIndex: Math.max(0, prev.selectedIndex - 1) }));
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (filteredItems.length > 0) {
          handleSelectSlashMenuItem(filteredItems[slashMenuState.selectedIndex].type);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashMenuState(prev => ({ ...prev, isOpen: false }));
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBlock(index);
    }

    if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault();
      deleteBlock(index);
    }

    if (e.key === 'ArrowUp' && !slashMenuState.isOpen) {
      if (index > 0) {
        e.preventDefault();
        setFocusedIndex(index - 1);
      }
    }

    if (e.key === 'ArrowDown' && !slashMenuState.isOpen) {
      if (index < blocks.length - 1) {
        e.preventDefault();
        setFocusedIndex(index + 1);
      }
    }
  };

  const handleRichTextChange = (html: string, text: string, index: number) => {
    const block = blocks[index];

    if (block.type === 'paragraph') {
      if (text === '# ') {
        updateBlock(index, { type: 'h1', content: '' }, true);
        return;
      }
      if (text === '## ') {
        updateBlock(index, { type: 'h2', content: '' }, true);
        return;
      }
      if (text === '> ') {
        updateBlock(index, { type: 'citacao', content: '' }, true);
        return;
      }
    }

    updateBlock(index, { content: html }, false);

    const slashIndex = text.lastIndexOf('/');
    if (slashIndex !== -1 && (slashIndex === 0 || text[slashIndex - 1] === ' ' || text[slashIndex - 1] === '\n')) {
      const filter = text.substring(slashIndex + 1);
      const rect = blockRefs.current[index]?.getBoundingClientRect() || { left: 0, bottom: 0 };
      const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
      
      setSlashMenuState(prev => ({
        isOpen: true,
        x: rect.left - containerRect.left + 20,
        y: rect.bottom - containerRect.top + 10,
        blockIndex: index,
        filter,
        selectedIndex: prev.isOpen ? prev.selectedIndex : 0
      }));
    } else {
      setSlashMenuState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>, index: number) => {
    const value = e.target.value;
    updateBlock(index, { content: value }, false);

    const slashIndex = value.lastIndexOf('/');
    if (slashIndex !== -1 && (slashIndex === 0 || value[slashIndex - 1] === ' ' || value[slashIndex - 1] === '\n')) {
      const filter = value.substring(slashIndex + 1);
      const rect = e.target.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
      
      setSlashMenuState(prev => ({
        isOpen: true,
        x: rect.left - containerRect.left + 20,
        y: rect.bottom - containerRect.top + 10,
        blockIndex: index,
        filter,
        selectedIndex: prev.isOpen ? prev.selectedIndex : 0
      }));
    } else {
      setSlashMenuState(prev => ({ ...prev, isOpen: false }));
    }

    if (e.target.tagName === 'TEXTAREA') {
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    }
  };

  const handleSelectSlashMenuItem = (type: BlockType) => {
    const index = slashMenuState.blockIndex;
    const block = blocks[index];
    const slashIndex = block.content.lastIndexOf('/');
    const newContent = block.content.substring(0, slashIndex);
    
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], type, content: newContent };
    pushHistory(newBlocks);
    setSlashMenuState(prev => ({ ...prev, isOpen: false }));
    setFocusedIndex(index);
  };

  const renderBlockInput = (block: ContentBlock, index: number) => {
    const commonProps = {
      ref: (el: any) => blockRefs.current[index] = el,
      value: block.content,
      onChange: (e: any) => handleChange(e, index),
      onKeyDown: (e: any) => handleKeyDown(e, index),
      onFocus: () => setFocusedIndex(index),
      className: "w-full bg-transparent border-none focus:outline-none resize-none overflow-hidden",
      placeholder: "Digite algo..."
    };

    switch (block.type) {
      case 'h1':
        return (
          <div ref={(el) => { blockRefs.current[index] = el; }} className="w-full">
            <RichTextEditor
              content={block.content}
              onChange={(html, text) => handleRichTextChange(html, text, index)}
              onKeyDown={(e: any) => handleKeyDown(e, index)}
              onFocus={() => setFocusedIndex(index)}
              className="text-3xl font-bold placeholder:font-normal w-full"
              placeholder="Título 1"
            />
          </div>
        );
      case 'h2':
        return (
          <div ref={(el) => { blockRefs.current[index] = el; }} className="w-full">
            <RichTextEditor
              content={block.content}
              onChange={(html, text) => handleRichTextChange(html, text, index)}
              onKeyDown={(e: any) => handleKeyDown(e, index)}
              onFocus={() => setFocusedIndex(index)}
              className="text-2xl font-bold placeholder:font-normal w-full"
              placeholder="Título 2"
            />
          </div>
        );
      case 'video':
        return (
          <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold text-primary mb-1">Bloco de Vídeo</div>
            <input
              type="text"
              className="w-full bg-surface-card border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="URL do Vídeo (Youtube, Vimeo...)"
              value={block.metadata?.url || ''}
              onChange={(e) => updateBlock(index, { metadata: { ...block.metadata, url: e.target.value } }, true)}
            />
            <textarea {...commonProps} className={`${commonProps.className} text-sm text-text-soft min-h-[40px]`} placeholder="Descrição opcional..." />
          </div>
        );
      case 'table':
        return <TableBlockEditor block={block} index={index} updateBlock={updateBlock} />;
      case 'quiz':
        const options = block.metadata?.options || ['', '', '', ''];
        const correctAnswer = block.metadata?.correctAnswer ?? 0;
        return (
          <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold text-primary mb-1">Bloco de Quiz</div>
            <textarea {...commonProps} className={`${commonProps.className} font-medium`} placeholder="Qual é a pergunta?" rows={2} />
            <div className="text-xs text-text-soft">Selecione o botão de rádio da resposta correta:</div>
            <div className="space-y-2 mt-2">
              {options.map((opt: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name={`quiz-${block.id}`}
                    checked={correctAnswer === i}
                    onChange={() => updateBlock(index, { metadata: { ...block.metadata, correctAnswer: i } }, true)}
                    className="w-4 h-4 text-primary cursor-pointer accent-primary" 
                    title="Marcar como correta"
                  />
                  <input
                    type="text"
                    className={`flex-1 bg-surface-card border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors ${correctAnswer === i ? 'border-primary/50' : 'border-border'}`}
                    placeholder={`Opção ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[i] = e.target.value;
                      updateBlock(index, { metadata: { ...block.metadata, options: newOpts } }, false);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      case 'reflexao':
        return (
          <div className="bg-tertiary-container border-l-4 border-primary rounded-r-lg p-4">
            <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Para Refletir</div>
            <div ref={(el) => { blockRefs.current[index] = el; }} className="w-full">
              <RichTextEditor
                content={block.content}
                onChange={(html, text) => handleRichTextChange(html, text, index)}
                onKeyDown={(e: any) => handleKeyDown(e, index)}
                onFocus={() => setFocusedIndex(index)}
                className="text-primary w-full"
                placeholder="Escreva um ponto de reflexão..."
              />
            </div>
          </div>
        );
      case 'citacao':
        return (
          <div className="border-l-4 border-border pl-4 italic">
            <div ref={(el) => { blockRefs.current[index] = el; }} className="w-full">
              <RichTextEditor
                content={block.content}
                onChange={(html, text) => handleRichTextChange(html, text, index)}
                onKeyDown={(e: any) => handleKeyDown(e, index)}
                onFocus={() => setFocusedIndex(index)}
                className="text-xl text-text-soft font-serif w-full"
                placeholder="Citação inspiradora..."
              />
            </div>
            <input
              type="text"
              className="mt-2 text-sm text-text bg-transparent border-none focus:outline-none"
              placeholder="- Autor"
              value={block.metadata?.author || ''}
              onChange={(e) => updateBlock(index, { metadata: { ...block.metadata, author: e.target.value } }, false)}
            />
          </div>
        );
      case 'paragraph':
      default:
        return (
          <div ref={(el) => { blockRefs.current[index] = el; }} className="w-full">
            <RichTextEditor
              content={block.content}
              onChange={(html, text) => handleRichTextChange(html, text, index)}
              onKeyDown={(e: any) => handleKeyDown(e, index)}
              onFocus={() => setFocusedIndex(index)}
              className="text-base leading-relaxed min-h-[24px] w-full"
              placeholder="Digite '/' para ver os comandos"
            />
          </div>
        );
    }
  };

  return (
    <div className="relative min-h-[300px]" ref={containerRef}>
      <SlashMenu
        isOpen={slashMenuState.isOpen}
        x={slashMenuState.x}
        y={slashMenuState.y}
        filter={slashMenuState.filter}
        selectedIndex={slashMenuState.selectedIndex}
        onSelect={handleSelectSlashMenuItem}
        onClose={() => setSlashMenuState(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="space-y-1">
        {blocks.map((block, index) => (
          <div 
            key={block.id} 
            className="group flex gap-2 items-start hover:bg-surface-hover/50 p-1 rounded-lg transition-colors"
          >
            <div className="flex flex-col gap-1 w-6 pt-1 opacity-0 group-hover:opacity-100 transition-opacity items-center flex-shrink-0">
              <button 
                type="button"
                className="text-border hover:text-primary transition-colors cursor-grab"
                title="Mover (não implementado)"
              >
                <GripVertical className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => addBlock(index)}
                className="text-border hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => deleteBlock(index)}
                className="text-border hover:text-error transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            
            <div className="flex-1 max-w-full">
              {renderBlockInput(block, index)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
