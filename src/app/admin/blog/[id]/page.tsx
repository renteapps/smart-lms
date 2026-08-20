"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Headphones, Image as ImageIcon, Save, Sparkles, Trash2, Type } from "lucide-react";
import {
  Button,
  Card,
  Description,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  Switch,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { createClient } from "@/lib/supabase/client";
import { saveArticle, deleteArticle } from "@/app/actions/admin/content";
import { getArticleCategories } from "@/app/actions/admin/categories";
import type { CategoryRow } from "@/app/actions/admin/categories";
import type { LessonContentBlock } from "@/types/course";
import type { ArticleFormat } from "@/types/blog";

const LessonBlockEditor = dynamic(() => import("@/components/admin/editor/LessonBlockEditor"), { ssr: false });

type CourseOption = { id: string; title: string };

type ArticleFormState = {
  title: string;
  slug: string;
  excerpt: string;
  cover: string;
  category: string;
  author: string;
  format: ArticleFormat;
  blocks: LessonContentBlock[];
  readingTime: number;
  audioUrl: string;
  audioDuration: number;
  audioTranscript: string;
  relatedCourseId: string | null;
  featured: boolean;
  premium: boolean;
  isPublished: boolean;
};

const EMPTY_ARTICLE: ArticleFormState = {
  title: "",
  slug: "",
  excerpt: "",
  cover: "",
  category: "",
  author: "Equipe",
  format: "text",
  blocks: [],
  readingTime: 5,
  audioUrl: "",
  audioDuration: 0,
  audioTranscript: "",
  relatedCourseId: null,
  featured: false,
  premium: false,
  isPublished: true,
};

function slugify(text: string) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");
}

const FORMAT_OPTIONS: { id: ArticleFormat; label: string }[] = [
  { id: "text", label: "Texto" },
  { id: "audio", label: "Áudio" },
  { id: "both", label: "Texto + Áudio" },
];

export default function AdminArticlePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "novo";

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ArticleFormState>(EMPTY_ARTICLE);
  const [slugTouched, setSlugTouched] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);

  useEffect(() => {
    let active = true;

    (async () => {
      const supabase = createClient();

      const [categoriesResult, coursesResult] = await Promise.all([
        getArticleCategories(),
        supabase.from("courses").select("id, title").order("title"),
      ]);

      if (!active) return;
      setCategories(categoriesResult);
      setCourses((coursesResult.data ?? []) as CourseOption[]);

      if (!isNew) {
        const { data } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
        if (!active) return;
        if (data) {
          setFormData({
            title: data.title ?? "",
            slug: data.slug ?? "",
            excerpt: data.excerpt ?? "",
            cover: data.cover ?? "",
            category: data.category ?? "",
            author: data.author ?? "Equipe",
            format: (data.format ?? "text") as ArticleFormat,
            blocks: data.blocks ?? [],
            readingTime: data.reading_time ?? 5,
            audioUrl: data.audio_url ?? "",
            audioDuration: data.audio_duration ?? 0,
            audioTranscript: data.audio_transcript ?? "",
            relatedCourseId: data.related_course_id ?? null,
            featured: data.featured ?? false,
            premium: data.premium ?? false,
            isPublished: data.is_published ?? true,
          });
          setSlugTouched(true);
        }
      }
      setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [id, isNew]);

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({ ...prev, title, slug: slugTouched ? prev.slug : slugify(title) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!formData.title.trim()) {
      setSaveError("Informe um título para o artigo.");
      return;
    }

    startSaving(async () => {
      const result = await saveArticle({
        id: isNew ? undefined : id,
        slug: formData.slug || undefined,
        title: formData.title,
        excerpt: formData.excerpt,
        cover: formData.cover || undefined,
        category: formData.category || "Geral",
        author: formData.author,
        readingTime: Number(formData.readingTime) || undefined,
        format: formData.format,
        blocks: formData.blocks,
        audioUrl: formData.audioUrl || undefined,
        audioDuration: Number(formData.audioDuration) || undefined,
        audioTranscript: formData.audioTranscript || undefined,
        relatedCourseId: formData.relatedCourseId,
        featured: formData.featured,
        premium: formData.premium,
        isPublished: formData.isPublished,
      });

      if (result.success) {
        toast.success(isNew ? "Artigo criado" : "Artigo atualizado");
        router.push("/admin/blog");
        router.refresh();
      } else {
        setSaveError(result.message ?? "Não foi possível salvar o artigo.");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Tem certeza que deseja excluir o artigo "${formData.title}"?`)) return;
    startDeleting(async () => {
      const result = await deleteArticle(id);
      if (result.success) {
        toast.success("Artigo excluído");
        router.push("/admin/blog");
        router.refresh();
      } else {
        toast.danger("Erro ao excluir", { description: result.message });
      }
    });
  };

  if (isLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">Carregando artigo…</div>;
  }

  const showAudioFields = formData.format === "audio" || formData.format === "both";

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-8 pb-16">
      <header className="sticky top-[92px] z-10 -mx-1 flex flex-col gap-4 rounded-xl border border-border bg-surface/95 p-4 shadow-elev-2 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href="/admin/blog"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para o blog
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
            {isNew ? "Novo artigo" : "Editar artigo"}
          </h1>
          {saveError && <p className="mt-2 text-sm font-medium text-danger">{saveError}</p>}
        </div>
        <div className="flex w-full gap-3 md:w-auto">
          {!isNew && (
            <Button
              type="button"
              variant="danger-soft"
              isDisabled={isSaving || isDeleting}
              onClick={handleDelete}
              className="gap-2"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Excluir
            </Button>
          )}
          <Button type="submit" variant="primary" isDisabled={isSaving} className="flex-1 gap-2 md:flex-none">
            <Save className="size-4" aria-hidden="true" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Formulário principal */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Type className="size-5 text-accent" aria-hidden="true" />
                Informações básicas
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <TextField value={formData.title} onChange={handleTitleChange} isRequired>
                <Label>Título do artigo</Label>
                <Input placeholder="Ex.: Prática deliberada: como aprender fazendo" />
              </TextField>
              <TextField
                value={formData.slug}
                onChange={(value) => {
                  setSlugTouched(true);
                  setFormData((prev) => ({ ...prev, slug: slugify(value) }));
                }}
              >
                <Label>Slug (URL)</Label>
                <Input placeholder="pratica-deliberada" />
                <Description>Endereço final: /blog/{formData.slug || "..."}</Description>
              </TextField>
              <TextField
                value={formData.excerpt}
                onChange={(value) => setFormData((prev) => ({ ...prev, excerpt: value }))}
              >
                <Label>Resumo</Label>
                <TextArea rows={3} placeholder="Um resumo curto que aparece nos cards do blog" className="resize-none" />
              </TextField>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <ImageIcon className="size-5 text-accent" aria-hidden="true" />
                Capa
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ImageUpload
                label="Imagem de capa"
                value={formData.cover}
                onChange={(url) => setFormData((prev) => ({ ...prev, cover: url ?? "" }))}
                folder="blog"
                aspect="wide"
                description="Recomendado: 1600x686px (21:9), máximo de 5MB."
              />
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <FileText className="size-5 text-accent" aria-hidden="true" />
                Conteúdo
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="overflow-hidden rounded-lg border border-border">
                <LessonBlockEditor
                  initialBlocks={formData.blocks}
                  onChange={(blocks) => setFormData((prev) => ({ ...prev, blocks }))}
                />
              </div>
            </Card.Content>
          </Card>

          {showAudioFields && (
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <Headphones className="size-5 text-accent" aria-hidden="true" />
                  Áudio
                </Card.Title>
              </Card.Header>
              <Card.Content className="space-y-4">
                <TextField
                  value={formData.audioUrl}
                  onChange={(value) => setFormData((prev) => ({ ...prev, audioUrl: value }))}
                  type="url"
                >
                  <Label>URL do áudio</Label>
                  <Input placeholder="https://..." />
                </TextField>
                <TextField
                  value={String(formData.audioDuration)}
                  onChange={(value) => setFormData((prev) => ({ ...prev, audioDuration: Number(value) || 0 }))}
                  type="number"
                >
                  <Label>Duração (segundos)</Label>
                  <Input placeholder="0" />
                </TextField>
                <TextField
                  value={formData.audioTranscript}
                  onChange={(value) => setFormData((prev) => ({ ...prev, audioTranscript: value }))}
                >
                  <Label>Transcrição (acessibilidade)</Label>
                  <TextArea rows={4} placeholder="Transcrição do áudio" />
                </TextField>
              </Card.Content>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>Publicação</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <Select
                selectedKey={formData.category || null}
                onSelectionChange={(k) => setFormData((prev) => ({ ...prev, category: String(k) }))}
                placeholder="Selecione uma categoria..."
              >
                <Label>Categoria</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {categories.map((cat) => (
                      <ListBoxItem key={cat.id} id={cat.name}>
                        {cat.name}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <TextField
                value={formData.author}
                onChange={(value) => setFormData((prev) => ({ ...prev, author: value }))}
              >
                <Label>Autor</Label>
                <Input placeholder="Equipe" />
              </TextField>

              <Select
                selectedKey={formData.format}
                onSelectionChange={(k) => setFormData((prev) => ({ ...prev, format: k as ArticleFormat }))}
              >
                <Label>Formato</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {FORMAT_OPTIONS.map((opt) => (
                      <ListBoxItem key={opt.id} id={opt.id}>
                        {opt.label}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <TextField
                value={String(formData.readingTime)}
                onChange={(value) => setFormData((prev) => ({ ...prev, readingTime: Number(value) || 0 }))}
                type="number"
              >
                <Label>Tempo de leitura (min)</Label>
                <Input placeholder="5" />
              </TextField>

              <Select
                selectedKey={formData.relatedCourseId ?? "none"}
                onSelectionChange={(k) =>
                  setFormData((prev) => ({ ...prev, relatedCourseId: k === "none" ? null : String(k) }))
                }
              >
                <Label>Curso relacionado (CTA)</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBoxItem id="none">Nenhum</ListBoxItem>
                    {courses.map((c) => (
                      <ListBoxItem key={c.id} id={c.id}>
                        {c.title}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Sparkles className="size-5 text-accent" aria-hidden="true" />
                Visibilidade
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-5">
              <Switch
                isSelected={formData.isPublished}
                onChange={(value) => setFormData((prev) => ({ ...prev, isPublished: value }))}
                className="items-start gap-4"
              >
                <Switch.Control className="mt-0.5">
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Content className="text-left">
                  <span className="block text-sm font-bold text-foreground">Publicado</span>
                  <span className="mt-1 block text-sm font-normal text-muted">Visível em /blog para todos.</span>
                </Switch.Content>
              </Switch>

              <Switch
                isSelected={formData.featured}
                onChange={(value) => setFormData((prev) => ({ ...prev, featured: value }))}
                className="items-start gap-4"
              >
                <Switch.Control className="mt-0.5">
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Content className="text-left">
                  <span className="block text-sm font-bold text-foreground">Destaque</span>
                  <span className="mt-1 block text-sm font-normal text-muted">Aparece no topo da página do blog.</span>
                </Switch.Content>
              </Switch>

              <Switch
                isSelected={formData.premium}
                onChange={(value) => setFormData((prev) => ({ ...prev, premium: value }))}
                className="items-start gap-4"
              >
                <Switch.Control className="mt-0.5">
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Content className="text-left">
                  <span className="block text-sm font-bold text-foreground">Premium</span>
                  <span className="mt-1 block text-sm font-normal text-muted">Reservado para assinantes (uso futuro).</span>
                </Switch.Content>
              </Switch>
            </Card.Content>
          </Card>
        </div>
      </div>
    </form>
  );
}
