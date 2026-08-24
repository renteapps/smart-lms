"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  Clock,
  Edit2,
  FileText,
  Globe,
  Headphones,
  Image as ImageIcon,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
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
import { AuthorModal } from "@/components/admin/blog/AuthorModal";
import { createClient } from "@/lib/supabase/client";
import { saveArticle, deleteArticle } from "@/app/actions/admin/content";
import { getArticleCategories } from "@/app/actions/admin/categories";
import { getArticleAuthors } from "@/app/actions/admin/authors";
import {
  isoToSaoPauloLocalInput,
  saoPauloLocalInputToIso,
  formatPlatformDateTime,
  PLATFORM_TIMEZONE,
} from "@/lib/timezone";
import type { CategoryRow } from "@/app/actions/admin/categories";
import type { LessonContentBlock } from "@/types/course";
import type { ArticleFormat, ArticleAuthor } from "@/types/blog";
import { cn } from "@/lib/utils";

const LessonBlockEditor = dynamic(() => import("@/components/admin/editor/LessonBlockEditor"), { ssr: false });

type CourseOption = { id: string; title: string };
type PublishMode = "now" | "scheduled" | "draft";

type ArticleFormState = {
  title: string;
  slug: string;
  excerpt: string;
  cover: string;
  category: string;
  author: string;
  authorId: string | null;
  format: ArticleFormat;
  blocks: LessonContentBlock[];
  readingTime: number;
  audioUrl: string;
  audioDuration: number;
  audioTranscript: string;
  relatedCourseId: string | null;
  featured: boolean;
  premium: boolean;
  publishMode: PublishMode;
  publishedAtLocal: string; // Formato YYYY-MM-DDTHH:mm no fuso de São Paulo
};

const EMPTY_ARTICLE: ArticleFormState = {
  title: "",
  slug: "",
  excerpt: "",
  cover: "",
  category: "",
  author: "Equipe",
  authorId: null,
  format: "text",
  blocks: [],
  readingTime: 5,
  audioUrl: "",
  audioDuration: 0,
  audioTranscript: "",
  relatedCourseId: null,
  featured: false,
  premium: false,
  publishMode: "now",
  publishedAtLocal: isoToSaoPauloLocalInput(new Date()),
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
  const [authors, setAuthors] = useState<ArticleAuthor[]>([]);

  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [authorToEdit, setAuthorToEdit] = useState<ArticleAuthor | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const supabase = createClient();

      const [categoriesResult, coursesResult, authorsResult] = await Promise.all([
        getArticleCategories(),
        supabase.from("courses").select("id, title").order("title"),
        getArticleAuthors(),
      ]);

      if (!active) return;
      setCategories(categoriesResult);
      setCourses((coursesResult.data ?? []) as CourseOption[]);
      setAuthors(authorsResult);

      if (!isNew) {
        const { data } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
        if (!active) return;
        if (data) {
          let resolvedAuthorId = data.author_id ?? null;
          if (!resolvedAuthorId && data.author) {
            const match = authorsResult.find((a) => a.name.toLowerCase() === data.author.toLowerCase());
            if (match) resolvedAuthorId = match.id;
          }

          const rawPublishedAt = data.published_at || new Date().toISOString();
          const pubTime = new Date(rawPublishedAt).getTime();
          const isFuture = pubTime > Date.now();

          let mode: PublishMode = "now";
          if (!data.is_published) {
            mode = "draft";
          } else if (isFuture) {
            mode = "scheduled";
          } else {
            mode = "now";
          }

          setFormData({
            title: data.title ?? "",
            slug: data.slug ?? "",
            excerpt: data.excerpt ?? "",
            cover: data.cover ?? "",
            category: data.category ?? "",
            author: data.author ?? "Equipe",
            authorId: resolvedAuthorId,
            format: (data.format ?? "text") as ArticleFormat,
            blocks: data.blocks ?? [],
            readingTime: data.reading_time ?? 5,
            audioUrl: data.audio_url ?? "",
            audioDuration: data.audio_duration ?? 0,
            audioTranscript: data.audio_transcript ?? "",
            relatedCourseId: data.related_course_id ?? null,
            featured: data.featured ?? false,
            premium: data.premium ?? false,
            publishMode: mode,
            publishedAtLocal: isoToSaoPauloLocalInput(rawPublishedAt),
          });
          setSlugTouched(true);
        }
      } else {
        if (authorsResult.length > 0) {
          const defaultAuthor = authorsResult.find((a) => a.name.toLowerCase() === "equipe") || authorsResult[0];
          setFormData((prev) => ({
            ...prev,
            author: defaultAuthor.name,
            authorId: defaultAuthor.id,
            publishedAtLocal: isoToSaoPauloLocalInput(new Date()),
          }));
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

  const handleAuthorSaved = (savedAuthor: ArticleAuthor) => {
    setAuthors((prev) => {
      const exists = prev.some((a) => a.id === savedAuthor.id);
      if (exists) {
        return prev.map((a) => (a.id === savedAuthor.id ? savedAuthor : a));
      }
      return [...prev, savedAuthor];
    });

    setFormData((prev) => ({
      ...prev,
      authorId: savedAuthor.id,
      author: savedAuthor.name,
    }));
  };

  const setQuickSchedule = (offsetDays: number, hour: number, minute: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, minute, 0, 0);
    setFormData((prev) => ({
      ...prev,
      publishMode: "scheduled",
      publishedAtLocal: isoToSaoPauloLocalInput(d),
    }));
  };

  const selectedAuthor = authors.find((a) => a.id === formData.authorId) ||
    authors.find((a) => a.name.toLowerCase() === formData.author.toLowerCase()) || null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!formData.title.trim()) {
      setSaveError("Informe um título para o artigo.");
      return;
    }

    const isPublished = formData.publishMode !== "draft";
    let finalPublishedAtIso = saoPauloLocalInputToIso(formData.publishedAtLocal);

    if (formData.publishMode === "now" && isNew) {
      finalPublishedAtIso = new Date().toISOString();
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
        authorId: formData.authorId,
        readingTime: Number(formData.readingTime) || undefined,
        format: formData.format,
        blocks: formData.blocks,
        audioUrl: formData.audioUrl || undefined,
        audioDuration: Number(formData.audioDuration) || undefined,
        audioTranscript: formData.audioTranscript || undefined,
        relatedCourseId: formData.relatedCourseId,
        featured: formData.featured,
        premium: formData.premium,
        isPublished,
        publishedAt: finalPublishedAtIso,
      });

      if (result.success) {
        if (formData.publishMode === "scheduled") {
          toast.success("Artigo agendado com sucesso!");
        } else if (formData.publishMode === "draft") {
          toast.success("Rascunho salvo");
        } else {
          toast.success(isNew ? "Artigo criado e publicado" : "Artigo atualizado");
        }
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
            {isSaving ? "Salvando..." : formData.publishMode === "scheduled" ? "Agendar publicação" : "Salvar"}
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
          {/* Card de Publicação & Agendamento */}
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <CalendarClock className="size-5 text-accent" aria-hidden="true" />
                Publicação & Agendamento
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-5">
              {/* Seletor de Modo de Publicação */}
              <div className="space-y-2">
                <Label>Status da publicação</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        publishMode: "now",
                        publishedAtLocal: isoToSaoPauloLocalInput(new Date()),
                      }))
                    }
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-xs font-semibold transition-all",
                      formData.publishMode === "now"
                        ? "border-accent bg-accent/10 text-accent ring-2 ring-accent/20"
                        : "border-border bg-surface-secondary/40 text-muted hover:border-muted",
                    )}
                  >
                    <Globe className="size-4" />
                    <span>Publicar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => {
                        const current = saoPauloLocalInputToIso(prev.publishedAtLocal);
                        const isPast = new Date(current).getTime() <= Date.now();
                        const nextDate = isPast ? new Date(Date.now() + 24 * 60 * 60 * 1000) : new Date(current);
                        nextDate.setHours(9, 0, 0, 0);
                        return {
                          ...prev,
                          publishMode: "scheduled",
                          publishedAtLocal: isoToSaoPauloLocalInput(nextDate),
                        };
                      })
                    }
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-xs font-semibold transition-all",
                      formData.publishMode === "scheduled"
                        ? "border-accent bg-accent/10 text-accent ring-2 ring-accent/20"
                        : "border-border bg-surface-secondary/40 text-muted hover:border-muted",
                    )}
                  >
                    <Clock className="size-4" />
                    <span>Agendar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        publishMode: "draft",
                      }))
                    }
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-xs font-semibold transition-all",
                      formData.publishMode === "draft"
                        ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20"
                        : "border-border bg-surface-secondary/40 text-muted hover:border-muted",
                    )}
                  >
                    <FileText className="size-4" />
                    <span>Rascunho</span>
                  </button>
                </div>
              </div>

              {/* Data e Hora de Publicação com fuso de São Paulo */}
              <div className="space-y-2 rounded-xl border border-border bg-surface-secondary/30 p-3.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Data e hora ({PLATFORM_TIMEZONE})</Label>
                  <Chip size="sm" variant="soft" color="default" className="text-[10px]">
                    GMT-3 Brasília
                  </Chip>
                </div>

                <input
                  type="datetime-local"
                  value={formData.publishedAtLocal}
                  onChange={(e) => {
                    const val = e.target.value;
                    const iso = saoPauloLocalInputToIso(val);
                    const isFuture = new Date(iso).getTime() > Date.now();
                    setFormData((prev) => ({
                      ...prev,
                      publishedAtLocal: val,
                      publishMode: prev.publishMode === "draft" ? "draft" : isFuture ? "scheduled" : "now",
                    }));
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />

                {/* Atalhos rápidos para agendamento */}
                {formData.publishMode === "scheduled" && (
                  <div className="mt-3 space-y-1.5 border-t border-border pt-2.5">
                    <p className="text-[11px] font-medium text-muted">Atalhos rápidos:</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQuickSchedule(0, 18, 0)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted hover:border-accent hover:text-foreground"
                      >
                        Hoje 18:00
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickSchedule(1, 9, 0)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted hover:border-accent hover:text-foreground"
                      >
                        Amanhã 09:00
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickSchedule(3, 9, 0)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted hover:border-accent hover:text-foreground"
                      >
                        Em 3 dias
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickSchedule(7, 9, 0)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted hover:border-accent hover:text-foreground"
                      >
                        Em 1 semana
                      </button>
                    </div>
                  </div>
                )}

                {/* Mensagem explicativa do status */}
                <div className="mt-2 text-xs">
                  {formData.publishMode === "scheduled" ? (
                    <p className="text-accent">
                      🕒 Será publicado automaticamente em{" "}
                      <strong>
                        {formatPlatformDateTime(saoPauloLocalInputToIso(formData.publishedAtLocal))}
                      </strong>.
                    </p>
                  ) : formData.publishMode === "draft" ? (
                    <p className="text-amber-600 dark:text-amber-400">
                      📝 Salvo como rascunho. Oculto para leitores em /blog.
                    </p>
                  ) : (
                    <p className="text-emerald-600 dark:text-emerald-400">
                      ✅ Visível imediatamente para todos os visitantes.
                    </p>
                  )}
                </div>
              </div>

              {/* Destaque e Premium */}
              <div className="space-y-4 pt-2">
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
                    <span className="mt-1 block text-xs font-normal text-muted">Aparece no topo do blog.</span>
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
                    <span className="mt-1 block text-xs font-normal text-muted">Reservado para assinantes.</span>
                  </Switch.Content>
                </Switch>
              </div>
            </Card.Content>
          </Card>

          {/* Metadados: Categoria, Autor, CTA */}
          <Card>
            <Card.Header>
              <Card.Title>Metadados</Card.Title>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Autor</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-accent hover:text-accent-hover"
                    onClick={() => {
                      setAuthorToEdit(null);
                      setIsAuthorModalOpen(true);
                    }}
                  >
                    <Plus className="size-3.5" />
                    Novo autor
                  </Button>
                </div>

                <Select
                  selectedKey={formData.authorId || (selectedAuthor ? selectedAuthor.id : null)}
                  onSelectionChange={(k) => {
                    const authorId = String(k);
                    const matched = authors.find((a) => a.id === authorId);
                    if (matched) {
                      setFormData((prev) => ({
                        ...prev,
                        authorId: matched.id,
                        author: matched.name,
                      }));
                    }
                  }}
                  placeholder="Selecione um autor..."
                >
                  <Label className="sr-only">Autor do artigo</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {authors.map((a) => (
                        <ListBoxItem key={a.id} id={a.id} textValue={a.name}>
                          <div className="flex items-center gap-2.5 py-1">
                            {a.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={a.avatarUrl}
                                alt=""
                                className="size-6 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent-soft-foreground">
                                {a.name.charAt(0)}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{a.name}</p>
                              {a.title && <p className="truncate text-xs text-muted">{a.title}</p>}
                            </div>
                          </div>
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                {selectedAuthor && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-surface-secondary/60 p-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {selectedAuthor.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedAuthor.avatarUrl}
                          alt=""
                          className="size-8 shrink-0 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent-soft-foreground">
                          {selectedAuthor.name.charAt(0)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">{selectedAuthor.name}</p>
                        {selectedAuthor.title && (
                          <p className="truncate text-[11px] text-muted">{selectedAuthor.title}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      aria-label="Editar autor"
                      className="size-7 shrink-0 text-muted hover:text-foreground"
                      onClick={() => {
                        setAuthorToEdit(selectedAuthor);
                        setIsAuthorModalOpen(true);
                      }}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>

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
        </div>
      </div>

      <AuthorModal
        isOpen={isAuthorModalOpen}
        onClose={() => setIsAuthorModalOpen(false)}
        onSaved={handleAuthorSaved}
        authorToEdit={authorToEdit}
      />
    </form>
  );
}
