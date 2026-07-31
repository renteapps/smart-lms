"use client";

import React, { useState, useEffect } from "react";
import { X, Layers, Image as ImageIcon, Sparkles, Check, Link2 } from "lucide-react";
import { Module } from "@/lib/mockData";

interface AddEditModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string; coverUrl: string }) => void;
  initialModule?: Module | null;
}

const PRESET_COVERS = [
  {
    name: "Tecnologia",
    url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop"
  },
  {
    name: "Código & Frontend",
    url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&auto=format&fit=crop"
  },
  {
    name: "Design & UX",
    url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=1200&auto=format&fit=crop"
  },
  {
    name: "Liderança & Negócios",
    url: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop"
  }
];

export default function AddEditModuleModal({
  isOpen,
  onClose,
  onSave,
  initialModule
}: AddEditModuleModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  useEffect(() => {
    if (initialModule) {
      setTitle(initialModule.title || "");
      setDescription(initialModule.description || "");
      setCoverUrl(initialModule.coverUrl || PRESET_COVERS[0].url);
    } else {
      setTitle("");
      setDescription("");
      setCoverUrl(PRESET_COVERS[0].url);
    }
  }, [initialModule, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      coverUrl: coverUrl.trim() || PRESET_COVERS[0].url
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">
                {initialModule ? "Editar Módulo" : "Adicionar Novo Módulo"}
              </h2>
              <p className="text-xs text-text-soft">
                Defina o nome, descrição detalhada e a capa em proporção 16:9.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-soft hover:text-ink hover:bg-canvas-soft rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          
          {/* Título do Módulo */}
          <div>
            <label className="block text-sm font-bold text-ink mb-1">
              Nome / Título do Módulo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Módulo 3: Gerenciamento Avançado de Estado"
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Descrição do Módulo */}
          <div>
            <label className="block text-sm font-bold text-ink mb-1">
              Descrição do Módulo
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os objetivos de aprendizagem e os tópicos abordados neste módulo..."
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Capa 16:9 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-ink flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" />
                Capa do Módulo (Proporção 16:9)
              </label>
              <span className="text-xs font-semibold text-text-soft bg-canvas-soft px-2.5 py-0.5 rounded-full border border-border">
                16:9 HD
              </span>
            </div>

            {/* Preview Box 16:9 */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border bg-canvas-soft group shadow-sm">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt="Prévia da capa 16:9"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PRESET_COVERS[0].url;
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-text-soft">
                  <ImageIcon className="w-8 h-8 mb-1 opacity-40" />
                  <span className="text-xs">Sem capa selecionada</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  Prévia em Proporção 16:9
                </span>
              </div>
            </div>

            {/* URL Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-soft">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem-capa-16x9.jpg"
                className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Preset Covers */}
            <div>
              <p className="text-xs font-bold text-text-soft mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Sugestões de Capas 16:9
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_COVERS.map((preset) => {
                  const isSelected = coverUrl === preset.url;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setCoverUrl(preset.url)}
                      className={`relative aspect-video rounded-lg overflow-hidden border transition-all text-left group ${
                        isSelected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 p-1.5 flex flex-col justify-between">
                        {isSelected && (
                          <div className="self-end bg-primary text-white p-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-white truncate drop-shadow mt-auto">
                          {preset.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Footer CTAs */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-bold text-text-soft hover:text-ink hover:bg-canvas-soft rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors shadow-sm hover:shadow flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              {initialModule ? "Salvar Alterações" : "Criar Módulo"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
