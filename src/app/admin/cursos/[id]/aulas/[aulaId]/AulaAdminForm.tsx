"use client";

import { ArrowLeft, Film, Link2, Save, Tv, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Switch } from "@heroui/react";
import type { Lesson, Module } from "@/types/course";
import { saveLesson } from "@/app/actions/admin/catalog";
import { PandaVideoSelector } from "@/components/admin/integracoes/PandaVideoSelector";
import PandaVideoPlayer from "@/components/classroom/PandaVideoPlayer";
import TagInputField from "@/components/admin/TagInputField";
import LessonPrerequisitePicker from "@/components/admin/LessonPrerequisitePicker";
import { extractYouTubeId, youtubeEmbedUrl } from "@/lib/editor/youtube";
import { secondsToLessonMinutes } from "@/lib/pandavideo";
import { cn } from "@/lib/utils";

const LessonBlockEditor = dynamic(() => import("@/components/admin/editor/LessonBlockEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-48 animate-pulse rounded-lg border border-border bg-surface p-4 text-xs text-muted">
      Carregando editor de blocos...
    </div>
  ),
});

type VideoProvider = "youtube" | "panda" | "url";

const VIDEO_PROVIDERS: Array<{ value: VideoProvider; label: string; icon: typeof Tv }> = [
  { value: "youtube", label: "YouTube", icon: Tv },
  { value: "panda", label: "PandaVideo", icon: Film },
  { value: "url", label: "Outro link", icon: Link2 },
];

function detectProvider(lesson: Partial<Lesson>): VideoProvider {
  if (lesson.pandavideoId) return "panda";
  if (lesson.videoUrl && extractYouTubeId(lesson.videoUrl)) return "youtube";
  if (lesson.videoUrl) return "url";
  return "youtube";
}

const EMPTY_LESSON: Partial<Lesson> = {
  title: "",
  type: "video",
  content: "",
  blocks: [],
  videoUrl: "",
  pandavideoId: "",
  transcription: "",
  durationInMinutes: 10,
  shortDescription: "",
  topics: [],
  solves: [],
  level: "iniciante",
  objective: "",
  audience: "",
  prerequisites: [],
  isEligibleForTrail: true,
};

interface AulaAdminFormProps {
  courseId: string;
  aulaId: string;
  moduleId: string | null;
  modules: Module[];
  initialLesson: Lesson | null;
}

export default function AulaAdminForm({
  courseId,
  aulaId,
  moduleId,
  modules,
  initialLesson,
}: AulaAdminFormProps) {
  const router = useRouter();
  const isNew = aulaId === "nova";
  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Lesson>>(
    initialLesson ? { ...EMPTY_LESSON, ...initialLesson } : EMPTY_LESSON
  );
  const [videoProvider, setVideoProvider] = useState<VideoProvider>(() =>
    initialLesson ? detectProvider(initialLesson) : "youtube"
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProviderChange = (provider: VideoProvider) => {
    setVideoProvider(provider);
    setFormData((prev) => ({ ...prev, pandavideoId: undefined, videoUrl: "" }));
  };

  const handleYouTubeInput = (value: string) => {
    const id = extractYouTubeId(value);
    setFormData((prev) => ({ ...prev, videoUrl: id ? `https://www.youtube.com/watch?v=${id}` : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const targetModuleId = formData.moduleId || initialLesson?.moduleId || moduleId;
    if (!targetModuleId) {
      setSaveError("Não foi possível identificar o módulo desta aula.");
      return;
    }

    startSaving(async () => {
      const result = await saveLesson(targetModuleId, {
        ...formData,
        id: isNew ? undefined : aulaId,
        durationInMinutes: Number(formData.durationInMinutes) || 0,
      });

      if (result.success) {
        router.push(`/admin/cursos/${courseId}/modulos`);
        router.refresh();
      } else {
        setSaveError(result.message ?? "Não foi possível salvar a aula.");
      }
    });
  };

  const youtubeId = formData.videoUrl ? extractYouTubeId(formData.videoUrl) : null;

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <Link
          href={`/admin/cursos/${courseId}/modulos`}
          className="inline-flex items-center gap-2 text-muted hover:text-accent transition-colors text-sm font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Módulos
        </Link>
        <h1 className="text-3xl font-display font-bold">
          {isNew ? "Criar Nova Aula" : "Editar Aula"}
        </h1>
        <p className="text-muted mt-2">
          {isNew ? "Preencha os detalhes da nova aula abaixo." : "Atualize os detalhes da aula."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-surface border border-border rounded-2xl p-6 shadow-sm">
        {/* Título */}
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-foreground">
            Título da Aula
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={formData.title || ""}
            onChange={handleChange}
            placeholder="Ex: Introdução ao React"
            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Tipo e Duração */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="type" className="block text-sm font-medium text-foreground">
              Tipo de Aula
            </label>
            <select
              id="type"
              name="type"
              value={formData.type || "video"}
              onChange={handleChange}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
            >
              <option value="video">Vídeo</option>
              <option value="text">Texto / Artigo</option>
              <option value="quiz">Questionário (Quiz)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="durationInMinutes" className="block text-sm font-medium text-foreground">
              Duração (Minutos)
            </label>
            <input
              id="durationInMinutes"
              name="durationInMinutes"
              type="number"
              min="1"
              required
              value={formData.durationInMinutes || 10}
              onChange={handleChange}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Vídeo */}
        {formData.type === "video" && (
          <>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">Vídeo da Aula</label>

              <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-background p-1">
                {VIDEO_PROVIDERS.map((option) => {
                  const Icon = option.icon;
                  const active = videoProvider === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleProviderChange(option.value)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {videoProvider === "youtube" && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={formData.videoUrl || ""}
                    onChange={(e) => handleYouTubeInput(e.target.value)}
                    placeholder="https://youtu.be/... ou apenas o ID do vídeo"
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                  {youtubeId && (
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                      <iframe
                        src={youtubeEmbedUrl(youtubeId)}
                        className="size-full"
                        allowFullScreen
                        title="Pré-visualização do YouTube"
                      />
                    </div>
                  )}
                </div>
              )}

              {videoProvider === "panda" && (
                <div className="space-y-3">
                  <PandaVideoSelector
                    value={formData.pandavideoId}
                    currentVideoUrl={formData.videoUrl}
                    onChange={(video) => setFormData((prev) => video
                      ? {
                          ...prev,
                          pandavideoId: video.id,
                          videoUrl: video.videoPlayer,
                          durationInMinutes: secondsToLessonMinutes(video.length),
                        }
                      : { ...prev, pandavideoId: undefined, videoUrl: "" }
                    )}
                  />
                  {formData.videoUrl && (
                    <PandaVideoPlayer
                      embedUrl={formData.videoUrl}
                      className="aspect-video w-full overflow-hidden rounded-lg bg-black"
                    />
                  )}
                </div>
              )}

              {videoProvider === "url" && (
                <input
                  type="url"
                  value={formData.videoUrl || ""}
                  onChange={handleChange}
                  name="videoUrl"
                  placeholder="https://player.vimeo.com/video/..."
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="transcription" className="block text-sm font-medium text-foreground">
                Transcrição do Vídeo (Opcional)
              </label>
              <textarea
                id="transcription"
                name="transcription"
                rows={5}
                value={formData.transcription || ""}
                onChange={handleChange}
                placeholder="Cole aqui a transcrição do vídeo para melhorar a experiência do aluno e a indexação..."
                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors resize-y"
              ></textarea>
            </div>
          </>
        )}

        {/* Editor de blocos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Conteúdo da Aula
          </label>
          <p className="text-xs text-muted">
            Digite <kbd className="rounded border border-border bg-background px-1 font-sans">/</kbd> para inserir vídeo, quiz, destaque, imagem, tabela e mais.
          </p>
          <div className="rounded-lg border border-border bg-surface py-2 transition-colors focus-within:border-accent">
            <LessonBlockEditor
              key={aulaId}
              initialBlocks={initialLesson?.blocks || formData.blocks}
              onChange={(blocks) => setFormData((prev) => ({ ...prev, blocks }))}
            />
          </div>
        </div>

        {/* Detalhes Adicionais */}
        <div className="pt-6 border-t border-border space-y-6">
          <div className="mb-2">
            <h3 className="text-lg font-bold text-foreground">Detalhes Adicionais</h3>
            <p className="text-sm text-muted">Informações para melhor organização da aula.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="shortDescription" className="block text-sm font-medium text-foreground">
              Descrição Curta (Opcional, máx. 200 caracteres)
            </label>
            <textarea
              id="shortDescription"
              name="shortDescription"
              rows={3}
              maxLength={200}
              value={formData.shortDescription || ""}
              onChange={handleChange}
              placeholder="Breve resumo da aula (até 200 caracteres)..."
              className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
            ></textarea>
            <div className="text-xs text-muted text-right">
              {(formData.shortDescription || "").length}/200
            </div>
          </div>
        </div>

        {/* Metadados para o ClassRank */}
        <div className="pt-6 border-t border-border space-y-6">
          <div className="mb-2">
            <h3 className="text-lg font-bold text-foreground">Metadados para o ClassRank</h3>
            <p className="text-sm text-muted">
              Alimentam o algoritmo de sugestão de aulas — quanto mais preciso, melhor a trilha recomendada para cada aluno.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="level" className="block text-sm font-medium text-foreground">
                Nível
              </label>
              <select
                id="level"
                name="level"
                value={formData.level || "iniciante"}
                onChange={handleChange}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
              >
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="audience" className="block text-sm font-medium text-foreground">
                Público-alvo
              </label>
              <input
                id="audience"
                name="audience"
                type="text"
                value={formData.audience || ""}
                onChange={handleChange}
                placeholder="Ex: quem já sabe HTML e CSS básico"
                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="objective" className="block text-sm font-medium text-foreground">
              Objetivo da aula
            </label>
            <input
              id="objective"
              name="objective"
              type="text"
              value={formData.objective || ""}
              onChange={handleChange}
              placeholder="O que o aluno vai saber fazer depois desta aula"
              className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <TagInputField
            label="Tópicos abordados"
            hint="Palavras-chave do conteúdo — usadas para casar a aula com o interesse do aluno."
            placeholder="Ex: hooks, useState, componentes"
            values={formData.topics || []}
            onChange={(topics) => setFormData((prev) => ({ ...prev, topics }))}
          />

          <TagInputField
            label="Problemas que essa aula resolve"
            hint="O que o aluno consegue resolver depois de assistir — usado para recomendar quando ele travar em algo parecido."
            placeholder="Ex: componente não re-renderiza"
            values={formData.solves || []}
            onChange={(solves) => setFormData((prev) => ({ ...prev, solves }))}
          />

          <LessonPrerequisitePicker
            modules={modules}
            currentLessonId={isNew ? undefined : aulaId}
            value={formData.prerequisites || []}
            onChange={(prerequisites) => setFormData((prev) => ({ ...prev, prerequisites }))}
          />

          <Switch
            isSelected={formData.isEligibleForTrail ?? true}
            onChange={(value) => setFormData((prev) => ({ ...prev, isEligibleForTrail: value }))}
            className="items-start gap-4"
          >
            <Switch.Control className="mt-0.5">
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Content className="text-left">
              <span className="block text-sm font-bold text-foreground">Elegível para sugestão automática</span>
              <span className="mt-1 block text-sm font-normal text-muted">
                Permite que o ClassRank recomende esta aula na trilha de outros alunos.
              </span>
            </Switch.Content>
          </Switch>
        </div>

        {/* Anexos (Mock visual) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Anexos e Materiais</label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-accent transition-colors cursor-pointer group">
            <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center text-muted group-hover:text-accent mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium group-hover:text-accent transition-colors">
              Clique para fazer upload de arquivos
            </p>
            <p className="text-xs text-muted mt-1">PDF, ZIP, Imagens (Max. 50MB)</p>
          </div>
        </div>

        {saveError && (
          <p role="alert" className="text-sm text-danger">
            {saveError}
          </p>
        )}

        {/* Botões de Ação */}
        <div className="pt-6 border-t border-border flex items-center justify-end gap-3">
          <Link
            href={`/admin/cursos/${courseId}/modulos`}
            className="px-5 py-2.5 rounded-lg font-medium text-sm text-foreground hover:bg-surface transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium text-sm hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Salvando..." : "Salvar Aula"}
          </button>
        </div>
      </form>
    </div>
  );
}
