'use client';

import React from 'react';
import { ProfileCategory } from '@/types/profileTest';
import { Trash2, Plus, Sparkles, Award } from 'lucide-react';

interface CategoryEditorProps {
  categories: ProfileCategory[];
  onChange: (categories: ProfileCategory[]) => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#64748B', // Slate
];

const PRESET_EMOJIS = ['🚀', '💬', '⚡', '🌱', '🧘', '🛡️', '🧠', '👑', '🎯', '🔥', '💡', '🏆'];

export const CategoryEditor: React.FC<CategoryEditorProps> = ({ categories, onChange }) => {
  const handleAddCategory = () => {
    const newId = `cat-${Date.now()}`;
    const nextColor = PRESET_COLORS[categories.length % PRESET_COLORS.length];
    const nextEmoji = PRESET_EMOJIS[categories.length % PRESET_EMOJIS.length];

    const newCategory: ProfileCategory = {
      id: newId,
      name: `Novo Perfil ${categories.length + 1}`,
      emoji: nextEmoji,
      color: nextColor,
      description: 'Descreva os comportamentos, virtudes e características dominantes deste perfil de resultado.',
    };

    onChange([...categories, newCategory]);
  };

  const handleUpdateCategory = (id: string, updatedFields: Partial<ProfileCategory>) => {
    onChange(
      categories.map((cat) => (cat.id === id ? { ...cat, ...updatedFields } : cat))
    );
  };

  const handleRemoveCategory = (id: string) => {
    if (categories.length <= 1) {
      alert('O teste precisa ter pelo menos 1 categoria de perfil.');
      return;
    }
    onChange(categories.filter((cat) => cat.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-primary-pale/60 p-4 rounded-xl border border-primary/10">
        <div>
          <h3 className="font-bold text-ink-deep flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary" />
            Perfis & Resultados
          </h3>
          <p className="text-sm text-text-soft">
            Defina as categorias que o aluno pode tirar como resultado no teste. O perfil com mais pontos no final será o vencedor.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddCategory}
          className="bg-primary text-on-primary px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-active transition-all flex items-center gap-2 shadow-sm hover:shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          Adicionar Categoria
        </button>
      </div>

      <div className="space-y-8">
        {categories.map((cat, index) => (
          <div
            key={cat.id}
            className="bg-surface-card border border-border/60 rounded-3xl p-1 shadow-sm hover:shadow-md transition-all relative group grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden"
            style={{ borderLeft: `6px solid ${cat.color}` }}
          >
            
            {/* Left Column: Form Editor */}
            <div className="p-5 lg:p-6 space-y-5 lg:border-r border-border/30">
              <div className="flex items-center justify-between gap-3 border-b border-border/30 pb-3">
                <span className="text-xs font-bold text-text-mute uppercase tracking-wider">
                  Edição do Perfil #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat.id)}
                  className="text-text-mute hover:text-negative p-1.5 rounded-lg hover:bg-negative/10 transition-colors"
                  title="Excluir Categoria"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Emoji + Name */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    value={cat.emoji}
                    onChange={(e) => handleUpdateCategory(cat.id, { emoji: e.target.value })}
                    maxLength={4}
                    className="w-12 h-12 text-center text-2xl bg-canvas-soft border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
                  />
                </div>

                <div className="flex-1">
                  <label className="text-[10px] font-bold text-text-soft uppercase tracking-wider block mb-1">Nome do Perfil</label>
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => handleUpdateCategory(cat.id, { name: e.target.value })}
                    placeholder="Ex: Líder Visionário"
                    className="w-full bg-canvas-soft border border-border/50 rounded-xl px-4 py-2.5 font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Color Palette Selector */}
              <div>
                <label className="text-[10px] font-bold text-text-soft uppercase tracking-wider block mb-2">
                  Cor Representativa
                </label>
                <div className="flex items-center gap-2 flex-wrap bg-canvas-soft p-2 rounded-xl border border-border/50 w-fit">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleUpdateCategory(cat.id, { color: c })}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        cat.color === c ? 'ring-2 ring-offset-2 ring-text scale-110 shadow-sm' : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                  <div className="w-px h-6 bg-border/50 mx-1" />
                  <input
                    type="color"
                    value={cat.color}
                    onChange={(e) => handleUpdateCategory(cat.id, { color: e.target.value })}
                    className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0 shrink-0"
                    title="Cor personalizada"
                  />
                </div>
              </div>

              {/* Description / Outcome Text */}
              <div>
                <label className="text-[10px] font-bold text-text-soft uppercase tracking-wider block mb-2">
                  Descrição do Resultado
                </label>
                <textarea
                  value={cat.description}
                  onChange={(e) => handleUpdateCategory(cat.id, { description: e.target.value })}
                  rows={4}
                  placeholder="Explique os pontos fortes e de desenvolvimento deste perfil..."
                  className="w-full bg-canvas-soft border border-border/50 rounded-xl p-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                />
              </div>
            </div>

            {/* Right Column: Live Preview */}
            <div className="bg-canvas/50 p-5 lg:p-6 flex flex-col justify-center items-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${cat.color} 0%, transparent 70%)` }} />
              
              <div className="w-full max-w-sm">
                <span className="text-xs font-bold text-text-mute uppercase tracking-wider block mb-4 text-center">
                  Live Preview do Aluno
                </span>
                
                <div className="bg-surface rounded-2xl shadow-xl overflow-hidden border border-border/50 transform transition-all hover:scale-[1.02]">
                  <div className="p-6 text-center space-y-4">
                    <div
                      className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl shadow-md transition-colors"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      {cat.emoji || '🎯'}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-text-soft uppercase tracking-wider block mb-1">
                        Seu Perfil Dominante é:
                      </span>
                      <h3 className="text-2xl font-display font-black leading-tight transition-colors" style={{ color: cat.color }}>
                        {cat.name || 'Nome do Perfil'}
                      </h3>
                    </div>

                    <div className="bg-canvas-soft/80 border border-border/50 rounded-xl p-4 text-left space-y-2 relative">
                       <h4 className="font-bold text-xs text-text-soft uppercase tracking-wide flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-primary" />
                        O que isso significa?
                      </h4>
                      <p className="text-text leading-relaxed text-xs line-clamp-4">
                        {cat.description || 'A descrição do resultado aparecerá aqui, explicando os pontos fortes do aluno e como ele se destaca.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};
