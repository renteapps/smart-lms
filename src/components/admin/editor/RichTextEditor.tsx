"use client";

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
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
          class: 'text-primary underline cursor-pointer',
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
    { label: 'Primária', value: 'var(--primary)' },
    { label: 'Erro', value: 'var(--error)' },
    { label: 'Sucesso', value: '#10b981' },
    { label: 'Cinza', value: 'var(--text-soft)' },
  ];

  return (
    <div 
      className="relative w-full" 
      ref={containerRef}
      onKeyDown={onKeyDown} // Bubble events up
    >
      {editor && (
        <BubbleMenu 
          editor={editor} 
          className="flex items-center gap-1 bg-surface-card border border-border rounded-lg shadow-lg p-1"
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-md hover:bg-surface-hover transition-colors ${editor.isActive('bold') ? 'bg-primary/10 text-primary' : 'text-text-soft'}`}
            title="Negrito"
          >
            <Bold className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-md hover:bg-surface-hover transition-colors ${editor.isActive('italic') ? 'bg-primary/10 text-primary' : 'text-text-soft'}`}
            title="Itálico"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            onClick={setLink}
            className={`p-1.5 rounded-md hover:bg-surface-hover transition-colors ${editor.isActive('link') ? 'bg-primary/10 text-primary' : 'text-text-soft'}`}
            title="Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-border mx-1"></div>

          {/* Highlight Colors */}
          <div className="relative group">
            <button
              className={`p-1.5 rounded-md hover:bg-surface-hover transition-colors ${editor.isActive('highlight') ? 'bg-primary/10 text-primary' : 'text-text-soft'}`}
              title="Marca-texto"
            >
              <Highlighter className="w-4 h-4" />
            </button>
            <div className="absolute top-full left-0 mt-1 hidden group-hover:flex bg-surface-card border border-border p-1 rounded-md shadow-lg gap-1 z-50">
              <button 
                onClick={() => editor.chain().focus().unsetHighlight().run()}
                className="w-6 h-6 rounded border border-border flex items-center justify-center text-xs text-text-soft hover:bg-surface-hover"
                title="Remover"
              >
                ✕
              </button>
              {highlightColors.map(color => (
                <button
                  key={color.value}
                  onClick={() => editor.chain().focus().setHighlight({ color: color.value }).run()}
                  className="w-6 h-6 rounded border border-black/10 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Text Colors */}
          <div className="relative group">
            <button
              className="p-1.5 rounded-md hover:bg-surface-hover transition-colors text-text-soft"
              title="Cor do Texto"
            >
              <Palette className="w-4 h-4" />
            </button>
            <div className="absolute top-full left-0 mt-1 hidden group-hover:flex bg-surface-card border border-border p-1 rounded-md shadow-lg gap-1 z-50">
              {textColors.map(color => (
                <button
                  key={color.label}
                  onClick={() => {
                    if (color.value) {
                      editor.chain().focus().setColor(color.value).run();
                    } else {
                      editor.chain().focus().unsetColor().run();
                    }
                  }}
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform flex items-center justify-center"
                  style={{ color: color.value || 'inherit', backgroundColor: color.value ? `${color.value}10` : 'transparent' }}
                  title={color.label}
                >
                  <span className="text-xs font-bold font-serif">A</span>
                </button>
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
          color: var(--text-soft);
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
