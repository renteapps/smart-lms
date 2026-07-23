"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Upload, Type, Image as ImageIcon, Tag, FileText } from "lucide-react";

export default function AdminCursoEditarPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link href={`/admin/cursos/${id}`} className="inline-flex items-center gap-2 text-text-soft hover:text-primary transition-colors text-sm font-medium mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Curso
          </Link>
          <h1 className="text-3xl font-display font-black text-primary">Editar Curso</h1>
          <p className="text-text-soft mt-1">Atualize as informações, capa e configurações do curso #{id}.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link 
            href={`/admin/cursos/${id}`}
            className="flex-1 md:flex-none text-center bg-canvas-soft hover:bg-surface-hover text-ink px-6 py-3 rounded-lg font-semibold border border-border transition-all"
          >
            Cancelar
          </Link>
          <button className="flex-1 md:flex-none bg-primary hover:bg-primary-active text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-transform hover:scale-[1.02] active:scale-95">
            <Save className="w-5 h-5" />
            Salvar
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
                  defaultValue="Inteligência Emocional no Trabalho"
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  placeholder="Ex: Formação em Liderança"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Descrição Curta</label>
                <textarea 
                  rows={3}
                  defaultValue="Aprenda a gerenciar suas emoções e construir relacionamentos mais saudáveis no ambiente de trabalho."
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink resize-none"
                  placeholder="Um resumo rápido sobre o curso"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Descrição Detalhada</label>
                <textarea 
                  rows={6}
                  defaultValue="Neste curso, você vai descobrir como a inteligência emocional pode ser o seu maior diferencial na carreira. Com exercícios práticos e teoria aplicada, cobriremos tópicos de autoconhecimento, empatia e habilidades sociais."
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
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text">Imagem de Capa (Thumbnail)</label>
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-surface-hover hover:border-primary/50 transition-colors cursor-pointer group bg-canvas-soft">
                  <div className="w-14 h-14 rounded-full bg-primary-pale flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-ink">Clique para enviar a capa do curso</p>
                    <p className="text-xs text-text-mute mt-1">Recomendado: 1280x720px (16:9), máximo de 5MB</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Link do Vídeo Promocional (Opcional)</label>
                <input 
                  type="url" 
                  defaultValue="https://youtube.com/watch?v=exemplo"
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
                  defaultValue="Publicado"
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
                  defaultValue="Comportamental"
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink appearance-none"
                >
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
                  defaultValue="inteligência emocional, soft skills, carreira"
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
