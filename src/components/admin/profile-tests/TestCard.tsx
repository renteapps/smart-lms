'use client';

import React from 'react';
import { ProfileTest } from '@/types/profileTest';
import { Edit3, Eye, Trash2, HelpCircle, Layers, Users, Copy } from 'lucide-react';
import Link from 'next/link';

interface TestCardProps {
  test: ProfileTest;
  onPreview: (test: ProfileTest) => void;
  onDelete: (testId: string) => void;
  onDuplicate: (test: ProfileTest) => void;
}

export const TestCard: React.FC<TestCardProps> = ({ test, onPreview, onDelete, onDuplicate }) => {
  const isPublished = test.status === 'published';

  return (
    <div className="bg-surface-card border border-border/60 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col group">
      
      {/* Thumbnail Header */}
      <div className="h-40 bg-gradient-to-r from-primary/10 via-accent-cyan/20 to-primary-pale relative overflow-hidden flex items-center justify-center">
        {test.coverUrl ? (
          <img
            src={test.coverUrl}
            alt={test.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="text-center p-4">
            <span className="text-4xl block mb-1">📊</span>
            <span className="text-xs font-semibold text-text-soft">Teste de Perfil</span>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${
              isPublished
                ? 'bg-positive/90 text-white'
                : 'bg-warning/90 text-yellow-950'
            }`}
          >
            {isPublished ? 'Publicado' : 'Rascunho'}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-display font-black text-xl text-ink-deep group-hover:text-primary transition-colors line-clamp-1 mb-2">
            {test.title}
          </h3>
          <p className="text-text-soft text-sm line-clamp-2 leading-relaxed">
            {test.description || 'Sem descrição.'}
          </p>
        </div>

        {/* Categories Chips preview */}
        {test.categories && test.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {test.categories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${cat.color}15`,
                  color: cat.color,
                }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/40 text-center">
          <div>
            <span className="text-xs font-semibold text-text-mute flex items-center justify-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Perguntas
            </span>
            <span className="text-sm font-extrabold text-ink-deep">{test.questions.length}</span>
          </div>

          <div>
            <span className="text-xs font-semibold text-text-mute flex items-center justify-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Perfis
            </span>
            <span className="text-sm font-extrabold text-ink-deep">{test.categories.length}</span>
          </div>

          <div>
            <span className="text-xs font-semibold text-text-mute flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5" /> Respostas
            </span>
            <span className="text-sm font-extrabold text-ink-deep">{test.completionsCount || 0}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Link
            href={`/admin/testes-perfil/${test.id}`}
            className="flex-1 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar
          </Link>

          <button
            type="button"
            onClick={() => onPreview(test)}
            className="p-2.5 rounded-xl border border-border/60 hover:bg-canvas-soft text-text-soft hover:text-text transition-colors"
            title="Preview do Aluno"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDuplicate(test)}
            className="p-2.5 rounded-xl border border-border/60 hover:bg-canvas-soft text-text-soft hover:text-text transition-colors"
            title="Duplicar Teste"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(test.id)}
            className="p-2.5 rounded-xl border border-border/60 hover:bg-negative/10 text-text-mute hover:text-negative transition-colors"
            title="Excluir Teste"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
