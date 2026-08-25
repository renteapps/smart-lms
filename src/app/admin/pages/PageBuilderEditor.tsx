"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@heroui/react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileText,
  GalleryHorizontal,
  GripVertical,
  ImageIcon,
  Layers3,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/ui/editorial";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { PandaVideoSelector } from "@/components/admin/integracoes/PandaVideoSelector";
import { PageRenderer } from "@/components/page-builder/PageRenderer";
import { createSection, PAGE_KEYS, PAGE_LABELS } from "@/lib/pageBuilder";
import { cn } from "@/lib/utils";
import type { ContentSource, PageBuilderData, PageCta, PageDraft, PageKey, PageSection } from "@/types/pageBuilder";
import { publishPage, savePageDraft } from "./actions";

const SECTION_LIBRARY: Array<{ type: PageSection["type"]; label: string; icon: typeof Sparkles }> = [
  { type: "hero", label: "Hero", icon: Sparkles },
  { type: "text-cta", label: "Texto + CTA", icon: FileText },
  { type: "video", label: "Vídeo", icon: Video },
  { type: "image-gallery", label: "Galeria de imagens", icon: ImageIcon },
  { type: "course-carousel", label: "Cursos", icon: BookOpen },
  { type: "gallery-course-carousel", label: "Cursos galeria", icon: GalleryHorizontal },
  { type: "article-carousel", label: "Artigos", icon: FileText },
  { type: "profile-test-carousel", label: "Testes de perfil", icon: Layers3 },
];

const sectionLabel = (type: PageSection["type"]) => SECTION_LIBRARY.find((item) => item.type === type)?.label ?? type;

type DraftMap = Record<PageKey, PageDraft>;

export function PageBuilderEditor({ initialDrafts, catalog }: { initialDrafts: DraftMap; catalog: PageBuilderData }) {
  const [drafts, setDrafts] = useState<DraftMap>(initialDrafts);
  const [selectedKey, setSelectedKey] = useState<PageKey>("public-home");
  const [dirty, setDirty] = useState<Set<PageKey>>(new Set());
  const [preview, setPreview] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [status, setStatus] = useState<{ tone: "success" | "danger" | "neutral"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const draft = drafts[selectedKey];

  const setSections = (sections: PageSection[]) => {
    setDrafts((current) => ({
      ...current,
      [selectedKey]: { ...current[selectedKey], document: { ...current[selectedKey].document, sections } },
    }));
    setDirty((current) => new Set(current).add(selectedKey));
    setStatus(null);
  };

  const patchSection = (sectionId: string, patch: Partial<PageSection>) => {
    setSections(draft.document.sections.map((section) => section.id === sectionId ? ({ ...section, ...patch } as PageSection) : section));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = draft.document.sections.findIndex((section) => section.id === active.id);
    const newIndex = draft.document.sections.findIndex((section) => section.id === over.id);
    if (oldIndex >= 0 && newIndex >= 0) setSections(arrayMove(draft.document.sections, oldIndex, newIndex));
  };

  const handleSave = () => startTransition(async () => {
    const result = await savePageDraft(selectedKey, draft.document, draft.revision);
    setStatus({ tone: result.success ? "success" : "danger", message: result.message });
    if (result.success && result.revision !== undefined) {
      setDrafts((current) => ({ ...current, [selectedKey]: { ...current[selectedKey], revision: result.revision!, updatedAt: result.updatedAt ?? new Date().toISOString() } }));
      setDirty((current) => { const next = new Set(current); next.delete(selectedKey); return next; });
    }
  });

  const handlePublish = () => {
    if (!window.confirm(`Publicar “${PAGE_LABELS[selectedKey].title}” agora?`)) return;
    startTransition(async () => {
      const result = await publishPage(selectedKey, draft.revision);
      setStatus({ tone: result.success ? "success" : "danger", message: result.message });
    });
  };

  const previewWidth = preview === "mobile" ? "max-w-[390px]" : preview === "tablet" ? "max-w-[820px]" : "max-w-none";

  return (
    <div className="space-y-7 pb-20">
      <PageHeader eyebrow="Plataforma" title="Páginas" description="Monte a experiência de visitantes e de usuários que ainda não possuem produtos." />

      <div className="grid gap-4 md:grid-cols-2">
        {PAGE_KEYS.map((key) => (
          <button key={key} type="button" onClick={() => { setSelectedKey(key); setStatus(null); }} className={cn(
            "rounded-2xl border p-5 text-left transition",
            selectedKey === key ? "border-accent bg-accent-soft shadow-elev-2" : "border-border bg-surface hover:border-accent/40",
          )}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-extrabold text-foreground">{PAGE_LABELS[key].title}</h2>
              {dirty.has(key) ? <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning-soft-foreground">Não salvo</span> : <Check className="size-4 text-success" />}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{PAGE_LABELS[key].description}</p>
          </button>
        ))}
      </div>

      <div className="sticky top-[76px] z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-elev-2 backdrop-blur-xl">
        <div>
          <p className="font-display font-extrabold text-foreground">{PAGE_LABELS[selectedKey].title}</p>
          <p className="text-xs text-muted">Revisão {draft.revision || "nova"}{draft.updatedAt ? ` · salva em ${new Date(draft.updatedAt).toLocaleString("pt-BR")}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onPress={handleSave} isDisabled={isPending || !dirty.has(selectedKey)}><Save className="size-4" /> Salvar rascunho</Button>
          <Button variant="primary" onPress={handlePublish} isDisabled={isPending || dirty.has(selectedKey) || draft.revision === 0}>Publicar</Button>
        </div>
      </div>

      {status && <div role="status" className={cn("rounded-xl border px-4 py-3 text-sm font-semibold", status.tone === "success" ? "border-success/30 bg-success-soft text-success-soft-foreground" : status.tone === "danger" ? "border-danger/30 bg-danger-soft text-danger-soft-foreground" : "border-border bg-default text-foreground")}>{status.message}</div>}

      <div className="grid gap-7 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="font-display font-extrabold text-foreground">Adicionar seção</h3>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {SECTION_LIBRARY.map(({ type, label, icon: Icon }) => <Button key={type} variant="outline" className="justify-start" onPress={() => setSections([...draft.document.sections, createSection(type)])}><Icon className="size-4" />{label}</Button>)}
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={draft.document.sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {draft.document.sections.map((section) => (
                  <SortableSectionCard
                    key={section.id}
                    section={section}
                    catalog={catalog}
                    onPatch={(patch) => patchSection(section.id, patch)}
                    onDuplicate={() => {
                      const copy = structuredClone(section);
                      copy.id = `${section.type}-${crypto.randomUUID()}`;
                      const index = draft.document.sections.findIndex((item) => item.id === section.id);
                      const next = [...draft.document.sections]; next.splice(index + 1, 0, copy); setSections(next);
                    }}
                    onDelete={() => window.confirm("Remover esta seção?") && setSections(draft.document.sections.filter((item) => item.id !== section.id))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="min-w-0">
          <div className="sticky top-[164px] overflow-hidden rounded-2xl border border-border bg-default shadow-elev-3">
            <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground"><Eye className="size-4" /> Prévia</div>
              <div className="flex gap-1">
                {([{ id: "desktop", icon: Monitor, label: "Desktop" }, { id: "tablet", icon: Tablet, label: "Tablet" }, { id: "mobile", icon: Smartphone, label: "Celular" }] as const).map(({ id, icon: Icon, label }) => <Button key={id} isIconOnly size="sm" variant={preview === id ? "primary" : "ghost"} aria-label={label} onPress={() => setPreview(id)}><Icon className="size-4" /></Button>)}
              </div>
            </div>
            <div className="max-h-[calc(100vh-230px)] overflow-auto bg-background-secondary p-3">
              <div className={cn("mx-auto overflow-hidden rounded-xl bg-background shadow-elev-2 transition-[max-width]", previewWidth)}>
                <PageRenderer document={draft.document} data={catalog} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableSectionCard({ section, catalog, onPatch, onDuplicate, onDelete }: { section: PageSection; catalog: PageBuilderData; onPatch: (patch: Partial<PageSection>) => void; onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("rounded-2xl border border-border bg-surface shadow-elev-1", isDragging && "z-20 opacity-70 shadow-elev-3")}>
      <div className="flex items-center gap-2 p-3">
        <button type="button" className="cursor-grab rounded-lg p-2 text-muted hover:bg-default" aria-label="Reordenar seção" {...attributes} {...listeners}><GripVertical className="size-4" /></button>
        <button type="button" onClick={() => setOpen((value) => !value)} className="min-w-0 flex-1 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-accent">{sectionLabel(section.type)}</p>
          <p className="truncate font-display font-extrabold text-foreground">{section.title}</p>
        </button>
        <Button isIconOnly size="sm" variant="ghost" aria-label={section.visible ? "Ocultar" : "Exibir"} onPress={() => onPatch({ visible: !section.visible } as Partial<PageSection>)}>{section.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</Button>
        <Button isIconOnly size="sm" variant="ghost" aria-label="Duplicar" onPress={onDuplicate}><Copy className="size-4" /></Button>
        <Button isIconOnly size="sm" variant="ghost" aria-label="Remover" className="text-danger" onPress={onDelete}><Trash2 className="size-4" /></Button>
      </div>
      {open && <div className="space-y-5 border-t border-border p-4"><SectionFields section={section} catalog={catalog} onPatch={onPatch} /></div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-foreground">{label}</span>{children}</label>;
}
const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent";

function SectionFields({ section, catalog, onPatch }: { section: PageSection; catalog: PageBuilderData; onPatch: (patch: Partial<PageSection>) => void }) {
  const update = (key: string, value: unknown) => onPatch({ [key]: value } as Partial<PageSection>);
  return <>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Fundo"><select className={inputClass} value={section.style.background} onChange={(event) => onPatch({ style: { ...section.style, background: event.target.value as typeof section.style.background } } as Partial<PageSection>)}><option value="default">Padrão</option><option value="muted">Suave</option><option value="accent">Cor da marca</option><option value="dark">Escuro</option></select></Field>
      <Field label="Largura"><select className={inputClass} value={section.style.width} onChange={(event) => onPatch({ style: { ...section.style, width: event.target.value as typeof section.style.width } } as Partial<PageSection>)}><option value="narrow">Estreita</option><option value="normal">Normal</option><option value="wide">Ampla</option></select></Field>
      <Field label="Espaçamento"><select className={inputClass} value={section.style.spacing} onChange={(event) => onPatch({ style: { ...section.style, spacing: event.target.value as typeof section.style.spacing } } as Partial<PageSection>)}><option value="compact">Compacto</option><option value="normal">Normal</option><option value="spacious">Amplo</option></select></Field>
      <Field label="Alinhamento"><select className={inputClass} value={section.style.alignment} onChange={(event) => onPatch({ style: { ...section.style, alignment: event.target.value as typeof section.style.alignment } } as Partial<PageSection>)}><option value="left">Esquerda</option><option value="center">Centro</option></select></Field>
    </div>
    {"eyebrow" in section && <Field label="Chamada curta"><input className={inputClass} value={section.eyebrow ?? ""} onChange={(event) => update("eyebrow", event.target.value)} maxLength={100} /></Field>}
    {"title" in section && <Field label="Título"><input className={inputClass} value={section.title} onChange={(event) => update("title", event.target.value)} maxLength={180} /></Field>}
    {"text" in section && <Field label="Texto"><textarea className={cn(inputClass, "min-h-24 resize-y")} value={section.text ?? ""} onChange={(event) => update("text", event.target.value)} maxLength={section.type === "text-cta" ? 4000 : 1200} /></Field>}

    {section.type === "hero" && <HeroFields section={section} onPatch={onPatch} />}
    {section.type === "text-cta" && <CtaEditor value={section.cta} onChange={(cta) => update("cta", cta)} />}
    {section.type === "video" && <VideoFields section={section} onPatch={onPatch} />}
    {section.type === "image-gallery" && <GalleryFields section={section} onPatch={onPatch} />}
    {["course-carousel", "gallery-course-carousel", "article-carousel", "profile-test-carousel"].includes(section.type) && <SourceEditor section={section as Extract<PageSection, { source: ContentSource }>} catalog={catalog} onPatch={onPatch} />}
  </>;
}

function HeroFields({ section, onPatch }: { section: Extract<PageSection, { type: "hero" }>; onPatch: (patch: Partial<PageSection>) => void }) {
  const mediaType = section.media?.type ?? "none";
  return <>
    <Field label="Mídia"><select className={inputClass} value={mediaType} onChange={(event) => onPatch({ media: event.target.value === "none" ? undefined : { type: event.target.value as "image" | "video", url: "", provider: event.target.value === "video" ? "youtube" : undefined } } as Partial<PageSection>)}><option value="none">Sem mídia</option><option value="image">Imagem</option><option value="video">Vídeo</option></select></Field>
    {section.media?.type === "image" && <ImageUpload label="Imagem do hero" value={section.media.url} onChange={(url) => onPatch({ media: { ...section.media!, url: url ?? "" } } as Partial<PageSection>)} folder="page-builder" aspect="wide" />}
    {section.media?.type === "video" && <><Field label="Provedor"><select className={inputClass} value={section.media.provider ?? "youtube"} onChange={(event) => onPatch({ media: { ...section.media!, provider: event.target.value as "youtube" | "panda" | "direct" } } as Partial<PageSection>)}><option value="youtube">YouTube</option><option value="panda">PandaVideo</option><option value="direct">URL/embed</option></select></Field><Field label="URL do vídeo"><input className={inputClass} value={section.media.url} onChange={(event) => onPatch({ media: { ...section.media!, url: event.target.value } } as Partial<PageSection>)} /></Field></>}
    <div className="space-y-3"><p className="text-xs font-bold text-foreground">Botões ({section.ctas.length}/2)</p>{section.ctas.map((cta, index) => <CtaEditor key={index} value={cta} onChange={(next) => { const ctas = [...section.ctas]; if (next) ctas[index] = next; else ctas.splice(index, 1); onPatch({ ctas } as Partial<PageSection>); }} />)}{section.ctas.length < 2 && <Button size="sm" variant="outline" onPress={() => onPatch({ ctas: [...section.ctas, { label: "Novo botão", href: "/", variant: "primary" }] } as Partial<PageSection>)}><Plus className="size-4" />Adicionar botão</Button>}</div>
  </>;
}

function CtaEditor({ value, onChange }: { value?: PageCta; onChange: (value: PageCta | undefined) => void }) {
  if (!value) return <Button size="sm" variant="outline" onPress={() => onChange({ label: "Novo botão", href: "/", variant: "primary" })}><Plus className="size-4" />Adicionar CTA</Button>;
  return <div className="grid gap-2 rounded-xl border border-border bg-default p-3 sm:grid-cols-[1fr_1.2fr_auto_auto]">
    <input aria-label="Texto do botão" className={inputClass} value={value.label} onChange={(event) => onChange({ ...value, label: event.target.value })} maxLength={80} />
    <input aria-label="Link do botão" className={inputClass} value={value.href} onChange={(event) => onChange({ ...value, href: event.target.value })} />
    <select aria-label="Estilo do botão" className={inputClass} value={value.variant} onChange={(event) => onChange({ ...value, variant: event.target.value as typeof value.variant })}><option value="primary">Primário</option><option value="secondary">Secundário</option></select>
    <Button isIconOnly variant="ghost" aria-label="Remover CTA" className="text-danger" onPress={() => onChange(undefined)}><Trash2 className="size-4" /></Button>
  </div>;
}

function VideoFields({ section, onPatch }: { section: Extract<PageSection, { type: "video" }>; onPatch: (patch: Partial<PageSection>) => void }) {
  return <><Field label="Provedor"><select className={inputClass} value={section.provider} onChange={(event) => onPatch({ provider: event.target.value as typeof section.provider, url: "" } as Partial<PageSection>)}><option value="youtube">YouTube</option><option value="panda">PandaVideo</option><option value="direct">URL/embed</option></select></Field>
    {section.provider === "panda" ? <PandaVideoSelector value="" currentVideoUrl={section.url} onChange={(video) => onPatch({ url: video?.videoPlayer ?? "" } as Partial<PageSection>)} /> : <Field label="URL do vídeo"><input className={inputClass} value={section.url} onChange={(event) => onPatch({ url: event.target.value } as Partial<PageSection>)} placeholder={section.provider === "youtube" ? "https://youtu.be/..." : "https://player..."} /></Field>}
  </>;
}

function GalleryFields({ section, onPatch }: { section: Extract<PageSection, { type: "image-gallery" }>; onPatch: (patch: Partial<PageSection>) => void }) {
  return <div className="space-y-3"><p className="text-xs font-bold text-foreground">Imagens ({section.images.length}/20)</p>{section.images.map((image, index) => <div key={image.id} className="rounded-xl border border-border p-3"><ImageUpload label={`Imagem ${index + 1}`} value={image.url} onChange={(url) => { const images = [...section.images]; images[index] = { ...image, url: url ?? "" }; onPatch({ images } as Partial<PageSection>); }} folder="page-builder" aspect="video" /><div className="mt-2 flex gap-2"><input aria-label="Texto alternativo" className={inputClass} value={image.alt} onChange={(event) => { const images = [...section.images]; images[index] = { ...image, alt: event.target.value }; onPatch({ images } as Partial<PageSection>); }} placeholder="Descrição da imagem" /><Button isIconOnly variant="ghost" className="text-danger" onPress={() => onPatch({ images: section.images.filter((item) => item.id !== image.id) } as Partial<PageSection>)}><Trash2 className="size-4" /></Button></div></div>)}{section.images.length < 20 && <Button size="sm" variant="outline" onPress={() => onPatch({ images: [...section.images, { id: crypto.randomUUID(), url: "", alt: "" }] } as Partial<PageSection>)}><Plus className="size-4" />Adicionar imagem</Button>}</div>;
}

function SourceEditor({ section, catalog, onPatch }: { section: Extract<PageSection, { source: ContentSource }>; catalog: PageBuilderData; onPatch: (patch: Partial<PageSection>) => void }) {
  const options = useMemo(() => {
    if (section.type === "course-carousel") return catalog.courses.map((item) => ({ id: item.id, label: item.title, category: item.category }));
    if (section.type === "gallery-course-carousel") return catalog.galleryRows.map((item) => ({ id: item.courseId, label: item.courseTitle, category: item.category }));
    if (section.type === "article-carousel") return catalog.articles.map((item) => ({ id: item.slug, label: item.title, category: item.category }));
    return catalog.profileTests.map((item) => ({ id: item.id, label: item.title, category: undefined }));
  }, [catalog, section.type]);
  const source = section.source;
  const patchSource = (patch: Partial<ContentSource>) => onPatch({ source: { ...source, ...patch } } as Partial<PageSection>);
  const categories = [...new Set(options.map((item) => item.category).filter(Boolean))] as string[];
  return <div className="space-y-4 rounded-xl border border-border bg-default p-4">
    <div className="grid grid-cols-2 gap-3"><Field label="Fonte"><select className={inputClass} value={source.mode} onChange={(event) => patchSource({ mode: event.target.value as ContentSource["mode"] })}><option value="automatic">Automática</option><option value="manual">Manual</option></select></Field><Field label="Quantidade"><input className={inputClass} type="number" min={1} max={20} value={source.limit} onChange={(event) => patchSource({ limit: Math.max(1, Math.min(20, Number(event.target.value) || 1)) })} /></Field></div>
    {source.mode === "automatic" ? <div className="grid grid-cols-2 gap-3"><Field label="Regra"><select className={inputClass} value={source.rule} onChange={(event) => patchSource({ rule: event.target.value as ContentSource["rule"] })}><option value="all">Todos</option><option value="featured">Destaques</option><option value="recent">Mais recentes</option>{categories.length > 0 && <option value="category">Categoria</option>}</select></Field>{source.rule === "category" && <Field label="Categoria"><select className={inputClass} value={source.category ?? ""} onChange={(event) => patchSource({ category: event.target.value })}><option value="">Selecione</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>}</div> : <ManualPicker options={options} selected={source.itemIds} onChange={(itemIds) => patchSource({ itemIds })} />}
  </div>;
}

function ManualPicker({ options, selected, onChange }: { options: Array<{ id: string; label: string }>; selected: string[]; onChange: (ids: string[]) => void }) {
  const available = options.filter((item) => !selected.includes(item.id));
  const [nextId, setNextId] = useState(available[0]?.id ?? "");
  const labels = new Map(options.map((item) => [item.id, item.label]));
  const move = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= selected.length) return; onChange(arrayMove(selected, index, target)); };
  return <div className="space-y-3"><div className="flex gap-2"><select aria-label="Adicionar item" className={inputClass} value={nextId} onChange={(event) => setNextId(event.target.value)}><option value="">Selecione um item</option>{available.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><Button variant="outline" isDisabled={!nextId} onPress={() => { if (nextId) { onChange([...selected, nextId]); setNextId(""); } }}><Plus className="size-4" />Adicionar</Button></div>{selected.map((itemId, index) => <div key={itemId} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"><span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{labels.get(itemId) ?? "Item indisponível"}</span><Button isIconOnly size="sm" variant="ghost" aria-label="Subir" isDisabled={index === 0} onPress={() => move(index, -1)}><ArrowUp className="size-3.5" /></Button><Button isIconOnly size="sm" variant="ghost" aria-label="Descer" isDisabled={index === selected.length - 1} onPress={() => move(index, 1)}><ArrowDown className="size-3.5" /></Button><Button isIconOnly size="sm" variant="ghost" aria-label="Remover" className="text-danger" onPress={() => onChange(selected.filter((id) => id !== itemId))}><Trash2 className="size-3.5" /></Button></div>)}</div>;
}
