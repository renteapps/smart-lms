"use client";

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button, Card, Input, Label, Radio, RadioGroup, TextArea, TextField } from '@heroui/react';
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

  /** Abre ou fecha o menu de comandos conforme a presença de "/" no texto do bloco. */
  const syncSlashMenu = (value: string, index: number, anchor: Element | null) => {
    const slashIndex = value.lastIndexOf('/');
    if (slashIndex !== -1 && (slashIndex === 0 || value[slashIndex - 1] === ' ' || value[slashIndex - 1] === '\n')) {
      const filter = value.substring(slashIndex + 1);
      const rect = anchor?.getBoundingClientRect() || { left: 0, bottom: 0 };
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
    syncSlashMenu(text, index, blockRefs.current[index]);
  };

  const handleContentChange = (value: string, index: number) => {
    updateBlock(index, { content: value }, false);

    const element = blockRefs.current[index];
    syncSlashMenu(value, index, element);

    if (element instanceof HTMLTextAreaElement) {
      element.style.height = 'auto';
      element.style.height = element.scrollHeight + 'px';
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
    /** Textarea "solta" dos blocos estruturados (vídeo / quiz), com o mesmo comportamento de teclado. */
    const renderContentTextArea = (props: { label: string; placeholder: string; rows?: number; className?: string }) => (
      <TextField
        aria-label={props.label}
        value={block.content}
        onChange={(value) => handleContentChange(value, index)}
      >
        <TextArea
          ref={(el) => { blockRefs.current[index] = el; }}
          rows={props.rows}
          placeholder={props.placeholder}
          className={props.className}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onFocus={() => setFocusedIndex(index)}
        />
      </TextField>
    );

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
          <Card variant="secondary">
            <Card.Header>
              <Card.Title className="text-sm text-accent">Bloco de Vídeo</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-3">
              <TextField
                value={block.metadata?.url || ''}
                onChange={(value) => updateBlock(index, { metadata: { ...block.metadata, url: value } }, true)}
              >
                <Label>URL do vídeo</Label>
                <Input type="url" placeholder="Youtube, Vimeo..." />
              </TextField>
              {renderContentTextArea({ label: 'Descrição do vídeo', placeholder: 'Descrição opcional...', rows: 2 })}
            </Card.Content>
          </Card>
        );
      case 'table':
        return <TableBlockEditor block={block} index={index} updateBlock={updateBlock} />;
      case 'quiz': {
        const options: string[] = block.metadata?.options || ['', '', '', ''];
        const correctAnswer: number = block.metadata?.correctAnswer ?? 0;
        return (
          <Card variant="secondary">
            <Card.Header>
              <Card.Title className="text-sm text-accent">Bloco de Quiz</Card.Title>
              <Card.Description>Marque o botão de rádio da resposta correta.</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
              {renderContentTextArea({ label: 'Pergunta do quiz', placeholder: 'Qual é a pergunta?', rows: 2, className: 'font-medium' })}

              <RadioGroup
                aria-label="Resposta correta"
                value={String(correctAnswer)}
                onChange={(value) => updateBlock(index, { metadata: { ...block.metadata, correctAnswer: Number(value) } }, true)}
                className="gap-2"
              >
                {options.map((opt: string, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <Radio value={String(i)} aria-label={`Marcar opção ${i + 1} como correta`}>
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                    </Radio>
                    <TextField
                      aria-label={`Texto da opção ${i + 1}`}
                      value={opt}
                      onChange={(value) => {
                        const newOpts = [...options];
                        newOpts[i] = value;
                        updateBlock(index, { metadata: { ...block.metadata, options: newOpts } }, false);
                      }}
                      className="flex-1"
                    >
                      <Input placeholder={`Opção ${i + 1}`} />
                    </TextField>
                  </div>
                ))}
              </RadioGroup>
            </Card.Content>
          </Card>
        );
      }
      case 'reflexao':
        return (
          <div className="rounded-r-lg border-l-4 border-accent bg-accent-soft p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-soft-foreground">Para Refletir</div>
            <div ref={(el) => { blockRefs.current[index] = el; }} className="w-full">
              <RichTextEditor
                content={block.content}
                onChange={(html, text) => handleRichTextChange(html, text, index)}
                onKeyDown={(e: any) => handleKeyDown(e, index)}
                onFocus={() => setFocusedIndex(index)}
                className="text-accent-soft-foreground w-full"
                placeholder="Escreva um ponto de reflexão..."
              />
            </div>
          </div>
        );
      case 'citacao':
        return (
          <div className="space-y-2 border-l-4 border-border pl-4 italic">
            <div ref={(el) => { blockRefs.current[index] = el; }} className="w-full">
              <RichTextEditor
                content={block.content}
                onChange={(html, text) => handleRichTextChange(html, text, index)}
                onKeyDown={(e: any) => handleKeyDown(e, index)}
                onFocus={() => setFocusedIndex(index)}
                className="text-xl text-muted font-serif w-full"
                placeholder="Citação inspiradora..."
              />
            </div>
            <TextField
              aria-label="Autor da citação"
              value={block.metadata?.author || ''}
              onChange={(value) => updateBlock(index, { metadata: { ...block.metadata, author: value } }, false)}
            >
              <Input placeholder="- Autor" />
            </TextField>
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
            className="group flex items-start gap-2 rounded-lg p-1 transition-colors hover:bg-surface-secondary"
          >
            <div className="flex w-9 shrink-0 flex-col items-center gap-1 pt-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Mover bloco (em breve)"
                isDisabled
                className="cursor-grab"
              >
                <GripVertical className="size-4" aria-hidden="true" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Adicionar bloco abaixo"
                onClick={() => addBlock(index)}
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Excluir bloco"
                isDisabled={blocks.length === 1}
                onClick={() => deleteBlock(index)}
              >
                <Trash2 className="size-4 text-danger" aria-hidden="true" />
              </Button>
            </div>

            <div className="max-w-full flex-1">
              {renderBlockInput(block, index)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
