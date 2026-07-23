"use client";

import { ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { MOCK_COURSE, Lesson, ContentBlock } from "@/lib/mockData";
import dynamic from 'next/dynamic';

const BlockEditor = dynamic(() => import("@/components/admin/editor/BlockEditor").then((mod) => mod.default), { ssr: false });

export default function AulaAdminFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const courseId = params.id as string;
  const aulaId = params.aulaId as string;
  const moduleId = searchParams.get("module");
  
  const isNew = aulaId === "nova";

  const [formData, setFormData] = useState<Partial<Lesson>>({
    title: "",
    type: "video",
    content: "",
    blocks: [],
    videoUrl: "",
    durationInMinutes: 10,
    slug: "",
    metaTitle: "",
    metaDescription: "",
  });

  useEffect(() => {
    if (!isNew) {
      // Find the lesson in MOCK_COURSE
      let foundLesson = null;
      for (const module of MOCK_COURSE.modules) {
        const lesson = module.lessons.find(l => l.id === aulaId);
        if (lesson) {
          foundLesson = lesson;
          break;
        }
      }
      if (foundLesson) {
        setFormData(foundLesson);
      }
    }
  }, [aulaId, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate save
    console.log("Saving lesson:", formData, "to module:", moduleId);
    // Redirect back to modules list
    router.push(`/admin/cursos/${courseId}/modulos`);
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <Link 
          href={`/admin/cursos/${courseId}/modulos`}
          className="inline-flex items-center gap-2 text-text-soft hover:text-primary transition-colors text-sm font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Módulos
        </Link>
        <h1 className="text-3xl font-display font-bold">
          {isNew ? "Criar Nova Aula" : "Editar Aula"}
        </h1>
        <p className="text-text-soft mt-2">
          {isNew ? "Preencha os detalhes da nova aula abaixo." : "Atualize os detalhes da aula."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-surface-card border border-border rounded-2xl p-6 shadow-sm">
        
        {/* Título */}
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-text">
            Título da Aula
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={formData.title}
            onChange={handleChange}
            placeholder="Ex: Introdução ao React"
            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Tipo e Duração */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="type" className="block text-sm font-medium text-text">
              Tipo de Aula
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            >
              <option value="video">Vídeo</option>
              <option value="text">Texto / Artigo</option>
              <option value="quiz">Questionário (Quiz)</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="durationInMinutes" className="block text-sm font-medium text-text">
              Duração (Minutos)
            </label>
            <input
              id="durationInMinutes"
              name="durationInMinutes"
              type="number"
              min="1"
              required
              value={formData.durationInMinutes}
              onChange={handleChange}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Video URL */}
        {formData.type === "video" && (
          <div className="space-y-2">
            <label htmlFor="videoUrl" className="block text-sm font-medium text-text">
              URL do Vídeo (Vimeo, YouTube, etc)
            </label>
            <input
              id="videoUrl"
              name="videoUrl"
              type="url"
              required
              value={formData.videoUrl}
              onChange={handleChange}
              placeholder="https://vimeo.com/..."
              className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        )}

        {/* Editor Block-based */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text">
            Conteúdo da Aula (Blocos)
          </label>
          <div className="border border-border rounded-lg p-4 bg-surface focus-within:border-primary transition-colors">
            <BlockEditor
              initialBlocks={formData.blocks || []}
              onChange={(blocks) => setFormData(prev => ({ ...prev, blocks }))}
            />
          </div>
        </div>

        {/* Metadados e SEO */}
        <div className="pt-6 border-t border-border space-y-6">
          <div className="mb-2">
            <h3 className="text-lg font-bold text-text">Metadados e SEO</h3>
            <p className="text-sm text-text-soft">Informações opcionais para otimização e organização interna da aula.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="slug" className="block text-sm font-medium text-text">
                Slug da URL (Opcional)
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                value={formData.slug || ""}
                onChange={handleChange}
                placeholder="ex: introducao-ao-react"
                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="metaTitle" className="block text-sm font-medium text-text">
                Meta Título (Opcional)
              </label>
              <input
                id="metaTitle"
                name="metaTitle"
                type="text"
                value={formData.metaTitle || ""}
                onChange={handleChange}
                placeholder="Título para SEO (ex: Aprenda Hooks)"
                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="metaDescription" className="block text-sm font-medium text-text">
              Meta Descrição (Opcional)
            </label>
            <textarea
              id="metaDescription"
              name="metaDescription"
              rows={3}
              value={formData.metaDescription || ""}
              onChange={handleChange}
              placeholder="Breve resumo da aula para motores de busca e cards sociais..."
              className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
            ></textarea>
          </div>
        </div>

        {/* Anexos (Mock visual) */}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text">Anexos e Materiais</label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-primary transition-colors cursor-pointer group">
            <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center text-text-soft group-hover:text-primary mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium group-hover:text-primary transition-colors">
              Clique para fazer upload de arquivos
            </p>
            <p className="text-xs text-text-soft mt-1">PDF, ZIP, Imagens (Max. 50MB)</p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="pt-6 border-t border-border flex items-center justify-end gap-3">
          <Link
            href={`/admin/cursos/${courseId}/modulos`}
            className="px-5 py-2.5 rounded-lg font-medium text-sm text-text hover:bg-surface transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar Aula
          </button>
        </div>
      </form>
    </div>
  );
}
