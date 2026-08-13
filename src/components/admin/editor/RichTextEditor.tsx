"use client";

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Button, Separator } from '@heroui/react';
import { Bold, Italic, Link as LinkIcon, Highlighter, Palette } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string, text: string) => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ content, onChange, onFocus, onKeyDown, placeholder, className }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false, // We use custom blocks for headings
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-accent underline cursor-pointer',
        },
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose-base focus:outline-none max-w-none ${className || ''}`,
        'data-placeholder': placeholder || '',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
    onFocus: () => {
      onFocus?.();
    },
  });

  // Keep content in sync if it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL do link', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const highlightColors = [
    { label: 'Amarelo', value: '#fef08a' },
    { label: 'Verde', value: '#bbf7d0' },
    { label: 'Azul', value: '#bfdbfe' },
    { label: 'Rosa', value: '#fbcfe8' },
    { label: 'Roxo', value: '#e9d5ff' },
  ];

  const textColors = [
    { label: 'Padrão', value: '' },
    { label: 'Destaque', value: 'var(--accent)' },
    { label: 'Erro', value: 'var(--danger)' },
    { label: 'Sucesso', value: 'var(--success)' },
    { label: 'Neutra', value: 'var(--muted)' },
  ];

  // Painéis de cor abrem no hover e no foco do gatilho: uma Popover do HeroUI seria
  // desmontada junto com a BubbleMenu do Tiptap ao tirar o foco do editor.
  const swatchPanelClass =
    'absolute left-0 top-full z-50 mt-1 hidden gap-1 rounded-md border border-border bg-overlay p-1 shadow-overlay group-hover:flex group-focus-within:flex';

  return (
    <div
      className="relative w-full"
      ref={containerRef}
      onKeyDown={onKeyDown} // Bubble events up
    >
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-1 rounded-lg border border-border bg-overlay p-1 shadow-overlay"
        >
          <Button
            isIconOnly
            size="sm"
            aria-label="Negrito"
            aria-pressed={editor.isActive('bold')}
            variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" aria-hidden="true" />
          </Button>

          <Button
            isIconOnly
            size="sm"
            aria-label="Itálico"
            aria-pressed={editor.isActive('italic')}
            variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" aria-hidden="true" />
          </Button>

          <Button
            isIconOnly
            size="sm"
            aria-label="Link"
            aria-pressed={editor.isActive('link')}
            variant={editor.isActive('link') ? 'secondary' : 'ghost'}
            onClick={setLink}
          >
            <LinkIcon className="size-4" aria-hidden="true" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-4" />

          {/* Highlight Colors */}
          <div className="group relative">
            <Button
              isIconOnly
              size="sm"
              aria-label="Marca-texto"
              aria-pressed={editor.isActive('highlight')}
              variant={editor.isActive('highlight') ? 'secondary' : 'ghost'}
            >
              <Highlighter className="size-4" aria-hidden="true" />
            </Button>
            <div className={swatchPanelClass}>
              <Button
                isIconOnly
                size="sm"
                variant="outline"
                aria-label="Remover marca-texto"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
              >
                <span aria-hidden="true">✕</span>
              </Button>
              {highlightColors.map(color => (
                <Button
                  key={color.value}
                  isIconOnly
                  size="sm"
                  variant="outline"
                  aria-label={`Marca-texto ${color.label}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => editor.chain().focus().setHighlight({ color: color.value }).run()}
                >
                  <span className="sr-only">{color.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Text Colors */}
          <div className="group relative">
            <Button isIconOnly size="sm" variant="ghost" aria-label="Cor do texto">
              <Palette className="size-4" aria-hidden="true" />
            </Button>
            <div className={swatchPanelClass}>
              {textColors.map(color => (
                <Button
                  key={color.label}
                  isIconOnly
                  size="sm"
                  variant="outline"
                  aria-label={`Cor do texto: ${color.label}`}
                  style={{ color: color.value || 'inherit' }}
                  onClick={() => {
                    if (color.value) {
                      editor.chain().focus().setColor(color.value).run();
                    } else {
                      editor.chain().focus().unsetColor().run();
                    }
                  }}
                >
                  <span className="font-serif text-xs font-bold" aria-hidden="true">A</span>
                </Button>
              ))}
            </div>
          </div>
        </BubbleMenu>
      )}

      {/* Placeholder logic using CSS since TipTap starter-kit doesn't include placeholder extension by default without another install */}
      <div className={`tiptap-container ${content.length === 0 ? 'is-empty' : ''}`} data-placeholder={placeholder}>
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .tiptap-container.is-empty .ProseMirror:before {
          content: attr(data-placeholder);
          float: left;
          color: var(--muted);
          pointer-events: none;
          height: 0;
          font-style: italic;
          opacity: 0.6;
        }
        .ProseMirror p {
          margin: 0;
        }
      `}</style>
    </div>
  );
}
