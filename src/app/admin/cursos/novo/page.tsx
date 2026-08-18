"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Plus, Type, Image as ImageIcon, Tag, FileText } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";

export default function AdminCursoNovoPage() {
  const [coverUrl, setCoverUrl] = useState("");

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16">
      <header className="sticky top-[76px] z-10 -mx-3 flex flex-col gap-4 rounded-[10px] border border-border bg-bg/95 p-4 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/admin/cursos" className="inline-flex items-center gap-2 text-text-soft hover:text-primary transition-colors text-sm font-medium mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Cursos
          </Link>
          <h1 className="text-3xl font-display font-black text-primary">Novo Curso</h1>
          <p className="text-text-soft mt-1">Preencha as informações básicas para criar um novo curso.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link 
            href="/admin/cursos"
            className="flex-1 md:flex-none text-center bg-canvas-soft hover:bg-surface-hover text-ink px-6 py-3 rounded-lg font-semibold border border-border transition-all"
          >
            Cancelar
          </Link>
          <button className="flex-1 md:flex-none bg-primary hover:bg-primary-active text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-transform hover:scale-[1.02] active:scale-95">
            <Plus className="w-5 h-5" />
            Criar Curso
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário Principal */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Seção: Informações Básicas */}
          <section className="bg-surface-card rounded-2xl p-6 md:p-8 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
              <Type className="w-5 h-5 text-primary" />
              Informações Básicas
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Título do Curso</label>
                <input 
                  type="text" 
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  placeholder="Ex: Formação em Liderança"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Descrição Curta</label>
                <textarea 
                  rows={3}
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink resize-none"
                  placeholder="Um resumo rápido sobre o curso"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Descrição Detalhada</label>
                <textarea 
                  rows={6}
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink resize-y"
                  placeholder="Descrição completa do que será ensinado"
                />
              </div>
            </div>
          </section>

          {/* Seção: Mídia */}
          <section className="bg-surface-card rounded-2xl p-6 md:p-8 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
              <ImageIcon className="w-5 h-5 text-primary" />
              Capa e Vídeo Promo
            </h2>
            
            <div className="space-y-6">
              <ImageUpload
                label="Imagem de Capa (Thumbnail)"
                value={coverUrl}
                onChange={(url) => setCoverUrl(url ?? "")}
                folder="courses"
                aspect="video"
                description="Recomendado: 1280x720px (16:9), máximo de 5MB."
              />
              
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Link do Vídeo Promocional (Opcional)</label>
                <input 
                  type="url" 
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  placeholder="https://youtube.com/..."
                />
                <p className="text-xs text-text-mute mt-1.5">URL do YouTube ou Vimeo para o vídeo de apresentação do curso.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="bg-surface-card rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 border border-border/40">
            <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
              <FileText className="w-5 h-5 text-primary" />
              Publicação
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Status</label>
                <select 
                  defaultValue="Rascunho"
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink appearance-none"
                >
                  <option value="Rascunho">Rascunho</option>
                  <option value="Publicado">Publicado</option>
                  <option value="Arquivado">Arquivado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Acesso</label>
                <select 
                  defaultValue="Pago"
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink appearance-none"
                >
                  <option value="Gratuito">Gratuito</option>
                  <option value="Pago">Pago</option>
                  <option value="Assinantes">Somente Assinantes</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-surface-card rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 border border-border/40">
            <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
              <Tag className="w-5 h-5 text-primary" />
              Categorização
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Categoria Principal</label>
                <select 
                  defaultValue=""
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink appearance-none"
                >
                  <option value="" disabled>Selecione uma categoria...</option>
                  <option value="Comportamental">Comportamental</option>
                  <option value="Liderança">Liderança</option>
                  <option value="Produtividade">Produtividade</option>
                  <option value="Técnico">Técnico</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Tags (separadas por vírgula)</label>
                <input 
                  type="text" 
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  placeholder="Ex: react, frontend, web"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
