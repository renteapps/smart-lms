"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowDown, ArrowLeft, ArrowUp, BookOpen, Check, ChevronDown,
  ChevronRight, Database, Eye, FileText, History, Loader2, LockKeyhole,
  Plus, Save, Search, Sparkles, Trash2, Upload, UserRound,
} from "lucide-react";
import { toast } from "@heroui/react";
import {
  deletePersonalizedLessonDocument,
  discardPersonalizedLessonDraft,
  publishPersonalizedLessonDraft,
  savePersonalizedLessonDraft,
  searchPersonalizedLessonSources,
} from "@/app/actions/admin/personalizedLessons";
import { AssistantAvatar } from "@/components/platform-assistant/AssistantAvatar";
import TagInputField from "@/components/admin/TagInputField";
import LessonPrerequisitePicker from "@/components/admin/LessonPrerequisitePicker";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  compileGuidedPrompt, createQuestionKey, GUIDED_SECTION_LABELS, GUIDED_TONE_LABELS,
} from "@/lib/personalizedLessonAuthoring";
import type { Lesson, Module } from "@/types/course";
import type {
  PersonalizedAuthoringMode, PersonalizedGuidedConfig, PersonalizedLessonAdminData,
  PersonalizedLessonBasicDraft, PersonalizedLessonDocument, PersonalizedLessonQuestion,
  PersonalizedLessonSection, PersonalizedSourceKind, PersonalizedSourceRef,
  PersonalizedVariableBinding,
} from "@/types/personalizedLesson";

const INPUT_CLASS = "w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt", "md", "markdown"]);
const SECTION_IDS = ["basic", "ai", "personalization", "knowledge"] as const;
type SectionId = typeof SECTION_IDS[number];

const SECTION_META: Record<SectionId, { title: string; description: string; icon: typeof BookOpen }> = {
  basic: { title: "Informações da aula", description: "Nome, objetivo e organização dentro do curso", icon: BookOpen },
  ai: { title: "O que a IA deve criar", description: "Conteúdo, abordagem e formato da aula", icon: Sparkles },
  personalization: { title: "Como personalizar para o aluno", description: "Dados disponíveis e perguntas antes da geração", icon: UserRound },
  knowledge: { title: "Conhecimento da IA", description: "Conteúdos do LMS, documentos e orientações extras", icon: Database },
};

const SOURCE_LABELS: Record<PersonalizedSourceKind, string> = {
  course: "Curso", module: "Módulo", lesson: "Aula", article: "Artigo",
};

function emptyQuestion(order: number, usedKeys: string[]): PersonalizedLessonQuestion {
  return { id: crypto.randomUUID(), key: createQuestionKey("resposta do aluno", usedKeys), label: "", type: "short_text", required: false, options: [], order };
}

function safeFileName(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-160);
}

function inferMimeType(file: File, extension: string) {
  if (extension === "pdf") return "application/pdf";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "md" || extension === "markdown") return "text/markdown";
  return file.type || "text/plain";
}

function SectionCard({ id, active, complete, error, onOpen, children }: {
  id: SectionId; active: boolean; complete: boolean; error?: string; onOpen: () => void; children: React.ReactNode;
}) {
  const meta = SECTION_META[id];
  const Icon = meta.icon;
  return (
    <section id={`personalized-section-${id}`} tabIndex={-1} className={cn("overflow-hidden rounded-2xl border bg-surface shadow-sm transition outline-none", active ? "border-accent/50 shadow-elev-2" : "border-border")}>
      <button type="button" onClick={onOpen} aria-expanded={active} className="flex w-full items-center gap-3 p-4 text-left sm:p-5">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", complete ? "bg-success-soft text-success" : error ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent")}>
          {complete ? <Check className="size-5" /> : <Icon className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-foreground">{meta.title}</span>
          <span className="mt-0.5 block text-sm text-muted">{error || meta.description}</span>
        </span>
        {active ? <ChevronDown className="size-5 text-muted" /> : <ChevronRight className="size-5 text-muted" />}
      </button>
      {active && <div className="border-t border-border p-4 sm:p-6">{children}</div>}
    </section>
  );
}

export default function PersonalizedLessonEditor({
  lessonId, courseId, initialData, initiallyPublished, modules, initialLesson, courseLayout,
}: {
  lessonId: string;
  courseId: string;
  initialData: PersonalizedLessonAdminData;
  initiallyPublished: boolean;
  modules: Module[];
  initialLesson: Lesson;
  courseLayout: "modules" | "gallery";
}) {
  const router = useRouter();
  const draft = initialData.draft;
  const [basic, setBasic] = useState<PersonalizedLessonBasicDraft>(draft.basic);
  const [authoringMode, setAuthoringMode] = useState<PersonalizedAuthoringMode>(draft.authoringMode);
  const [guided, setGuided] = useState<PersonalizedGuidedConfig>(draft.guidedConfig);
  const [promptTemplate, setPromptTemplate] = useState(draft.promptTemplate);
  const [context, setContext] = useState(draft.context);
  const [model, setModel] = useState(draft.model);
  const [questions, setQuestions] = useState<PersonalizedLessonQuestion[]>(draft.questions);
  const [bindings, setBindings] = useState<PersonalizedVariableBinding[]>(draft.variableBindings);
  const [sources, setSources] = useState<PersonalizedSourceRef[]>(draft.sourceRefs);
  const [documents, setDocuments] = useState(initialData.documents);
  const [draftVersion, setDraftVersion] = useState(draft.draftVersion);
  const [publishedDraftVersion, setPublishedDraftVersion] = useState(draft.publishedDraftVersion);
  const [revision, setRevision] = useState(initialData.config?.revision ?? 0);
  const [isPublished, setIsPublished] = useState(initiallyPublished);
  const [activeSection, setActiveSection] = useState<SectionId>("basic");
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<SectionId | "publish", string>>>({});
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isPublishing, startPublishing] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceKind, setSourceKind] = useState<PersonalizedSourceKind | "all">("all");
  const [sourceResults, setSourceResults] = useState(initialData.sourceOptions.slice(0, 20));
  const [sourcePage, setSourcePage] = useState(0);
  const [hasMoreSources, setHasMoreSources] = useState(initialData.sourceOptions.length >= 20);
  const [isSearchingSources, startSourceSearch] = useTransition();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const activeQuestionKeys = useMemo(() => new Map((initialData.config?.questions ?? []).map((question) => [question.id, question.key])), [initialData.config]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const compiledPrompt = useMemo(() => compileGuidedPrompt({ basic, guided, questions, bindings }), [basic, guided, questions, bindings]);
  const draftDocuments = documents.filter((document) => document.inDraft);
  const sectionComplete: Record<SectionId, boolean> = {
    basic: Boolean(basic.title.trim() && basic.objective.trim() && basic.moduleId),
    ai: Boolean(model && (authoringMode === "guided" ? guided.coreInstructions.trim() : promptTemplate.trim())),
    personalization: questions.every((question) => question.label.trim() && question.key && ((question.type !== "single" && question.type !== "multiple") || question.options.length >= 2)),
    knowledge: draftDocuments.every((document) => document.status === "ready"),
  };
  const completedCount = SECTION_IDS.filter((id) => sectionComplete[id]).length;
  const readyToPublish = completedCount === SECTION_IDS.length;
  const draftDocumentIds = new Set(documents.filter((document) => document.inDraft).map((document) => document.id));
  const publishedDocumentIds = new Set(documents.filter((document) => document.inPublished).map((document) => document.id));
  const documentsChanged = draftDocumentIds.size !== publishedDocumentIds.size
    || [...draftDocumentIds].some((id) => !publishedDocumentIds.has(id));
  const hasPendingDraft = isDirty || draftVersion !== publishedDraftVersion || documentsChanged;
  const status = isPublished ? (hasPendingDraft ? "Publicado com alterações pendentes" : "Publicado") : "Rascunho";

  const touch = () => setIsDirty(true);
  const patchBasic = (patch: Partial<PersonalizedLessonBasicDraft>) => { setBasic((current) => ({ ...current, ...patch })); touch(); };
  const patchGuided = (patch: Partial<PersonalizedGuidedConfig>) => { setGuided((current) => ({ ...current, ...patch })); touch(); };
  const updateQuestion = (id: string, patch: Partial<PersonalizedLessonQuestion>) => {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...patch } : question)); touch();
  };

  const buildSaveInput = (section: SectionId | "all", expectedDraftVersion = draftVersion) => ({
    lessonId, courseId, expectedDraftVersion, section, basic, authoringMode, guidedConfig: guided,
    promptTemplate: authoringMode === "guided" ? compiledPrompt : promptTemplate,
    context, model, questions: questions.map((question, order) => ({ ...question, order })),
    variableBindings: bindings, sourceRefs: sources,
    documentIds: draftDocuments.map((document) => document.id),
  });

  const saveSection = async (section: SectionId | "all", advance = false) => {
    const result = await savePersonalizedLessonDraft(buildSaveInput(section));
    if (!result.success) {
      const target = section === "all" ? activeSection : section;
      setErrors((current) => ({ ...current, [target]: result.message }));
      setFieldError(result.field ? { field: result.field, message: result.message } : null);
      setActiveSection(target);
      requestAnimationFrame(() => {
        const field = result.field ? document.getElementById(`personalized-${result.field}`) : null;
        (field ?? document.getElementById(`personalized-section-${target}`))?.focus();
      });
      if (result.conflict) window.location.reload();
      return result;
    }
    setDraftVersion(result.draftVersion);
    if (authoringMode === "guided") setPromptTemplate(result.promptTemplate);
    setIsDirty(false);
    setFieldError(null);
    setErrors((current) => ({ ...current, [section === "all" ? activeSection : section]: undefined, publish: undefined }));
    if (advance && section !== "all") {
      const next = SECTION_IDS[SECTION_IDS.indexOf(section) + 1];
      if (next) setActiveSection(next);
    }
    toast.success("Rascunho salvo.");
    return result;
  };

  const handleSave = (section: SectionId) => startSaving(async () => { await saveSection(section, true); });

  const handlePublish = () => startPublishing(async () => {
    if (!readyToPublish) return setErrors((current) => ({ ...current, publish: "Conclua as seções pendentes antes de publicar." }));
    let version = draftVersion;
    if (isDirty || draftVersion === 0) {
      const saved = await saveSection("all");
      if (!saved.success) return;
      version = saved.draftVersion;
    }
    const result = await publishPersonalizedLessonDraft({ lessonId, courseId, expectedDraftVersion: version });
    if (!result.success) return setErrors((current) => ({ ...current, publish: result.message }));
    setRevision(result.revision); setPublishedDraftVersion(version); setIsPublished(true);
    setErrors((current) => ({ ...current, publish: undefined }));
    toast.success(initiallyPublished ? "Nova versão publicada." : "Aula publicada para os alunos.");
    router.refresh();
  });

  const handleDiscard = () => startSaving(async () => {
    const result = await discardPersonalizedLessonDraft({ lessonId, courseId });
    if (!result.success) { toast.danger(result.message); return; }
    toast.success("Alterações do rascunho descartadas."); setIsDirty(false); window.location.reload();
  });

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next.map((question, order) => ({ ...question, order })); }); touch();
  };

  const insertVariable = (key: string) => {
    const token = `{{${key}}}`; const textarea = promptRef.current;
    if (!textarea) setPromptTemplate((current) => `${current}${current ? " " : ""}${token}`);
    else { const start = textarea.selectionStart; const end = textarea.selectionEnd; setPromptTemplate((current) => `${current.slice(0, start)}${token}${current.slice(end)}`); requestAnimationFrame(() => textarea.setSelectionRange(start + token.length, start + token.length)); }
    touch();
  };

  const searchSources = (page = 0) => startSourceSearch(async () => {
    const result = await searchPersonalizedLessonSources({ lessonId, query: sourceQuery, kind: sourceKind, page });
    if (!result.success) return;
    const nextResults = result.data.map((item) => ({ ...item, groupLabel: SOURCE_LABELS[item.kind] }));
    setSourceResults((current) => page === 0 ? nextResults : [
      ...current,
      ...nextResults.filter((item) => !current.some((currentItem) => currentItem.kind === item.kind && currentItem.id === item.id)),
    ]);
    setSourcePage(page);
    setHasMoreSources(result.hasMore);
  });

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    if (draftDocuments.length + files.length > 10) { toast.danger("A aula pode usar no máximo 10 documentos."); return; }
    setIsUploading(true); const supabase = createClient();
    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXTENSIONS.has(extension) || file.size < 1 || file.size > MAX_FILE_BYTES) { toast.danger(`${file.name}: use PDF, DOCX, TXT ou Markdown de até 10 MB.`); continue; }
      const mimeType = inferMimeType(file, extension); const storagePath = `personalized-lessons/${lessonId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      try {
        const { error } = await supabase.storage.from("secure-documents").upload(storagePath, file, { contentType: mimeType, upsert: false });
        if (error) throw error;
        const response = await fetch("/api/admin/personalized-lessons/documents/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId, storagePath, fileName: file.name, mimeType }) });
        const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Falha ao processar o documento.");
        setDocuments((current) => [...current, { id: payload.id, fileName: file.name, mimeType, sizeBytes: file.size, status: "ready", createdAt: new Date().toISOString(), inDraft: true, inPublished: false }]); touch();
      } catch (error) { await supabase.storage.from("secure-documents").remove([storagePath]); toast.danger(error instanceof Error ? error.message : `Falha ao enviar ${file.name}.`); }
    }
    setIsUploading(false);
  };

  const removeDocument = async (document: PersonalizedLessonDocument) => {
    const result = await deletePersonalizedLessonDocument({ lessonId, documentId: document.id, courseId });
    if (!result.success) { toast.danger(result.message); return; }
    setDocuments((current) => current.flatMap((item) => item.id !== document.id ? [item] : item.inPublished ? [{ ...item, inDraft: false }] : [])); touch();
  };

  const selectedBindingKeys = new Set(bindings.map((binding) => `${binding.source}:${binding.sourceRef}`));

  return (
    <div className="mx-auto max-w-7xl pb-28 lg:pb-12">
      <header className="mb-6">
        <Link href={`/admin/cursos/${courseId}/modulos`} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-accent"><ArrowLeft className="size-4" /> Voltar para módulos</Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="mb-2 flex flex-wrap items-center gap-2"><span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", isPublished && !hasPendingDraft ? "bg-success-soft text-success" : hasPendingDraft && isPublished ? "bg-warning-soft text-warning" : "bg-accent-soft text-accent")}>{status}</span>{revision > 0 && <span className="text-xs text-muted">Versão publicada {revision}</span>}</div><h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{basic.title || initialLesson.title || "Nova aula personalizada"}</h1><p className="mt-2 max-w-2xl text-sm text-muted">Configure a experiência em linguagem simples. Os detalhes técnicos ficam disponíveis apenas quando você precisar.</p></div>
          <Link href={`/admin/aulas-personalizadas?lesson=${lessonId}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-hover"><History className="size-4 text-accent" /> Histórico de gerações</Link>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${completedCount * 25}%` }} /></div><p className="mt-2 text-xs text-muted">{completedCount} de 4 seções prontas para publicação</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <main className="space-y-4">
          <SectionCard id="basic" active={activeSection === "basic"} complete={sectionComplete.basic} error={errors.basic} onOpen={() => setActiveSection("basic")}>
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-semibold">
                  Título da aula
                  <input id="personalized-title" value={basic.title} onChange={(event) => patchBasic({ title: event.target.value })} aria-invalid={fieldError?.field === "title"} className={INPUT_CLASS} placeholder="Ex.: Liderança em conversas difíceis" />
                  <FieldError show={fieldError?.field === "title"} message={fieldError?.message} />
                </label>
                <label className="space-y-1.5 text-sm font-semibold">
                  Módulo
                  <select id="personalized-moduleId" value={basic.moduleId} onChange={(event) => patchBasic({ moduleId: event.target.value })} aria-invalid={fieldError?.field === "moduleId"} className={INPUT_CLASS}>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select>
                  <FieldError show={fieldError?.field === "moduleId"} message={fieldError?.message} />
                </label>
              </div>
              <label className="block space-y-1.5 text-sm font-semibold">
                O que o aluno deverá aprender ou conseguir fazer?
                <textarea id="personalized-objective" rows={3} value={basic.objective} onChange={(event) => patchBasic({ objective: event.target.value })} aria-invalid={fieldError?.field === "objective"} className={INPUT_CLASS} placeholder="Ex.: conduzir uma conversa difícil com clareza e empatia" />
                <FieldError show={fieldError?.field === "objective"} message={fieldError?.message} />
              </label>
              <div className="grid gap-4 sm:grid-cols-[1fr_10rem]"><label className="space-y-1.5 text-sm font-semibold">Descrição curta<textarea rows={2} maxLength={200} value={basic.shortDescription} onChange={(event) => patchBasic({ shortDescription: event.target.value })} className={INPUT_CLASS} placeholder="Uma frase para apresentar a aula" /></label><label className="space-y-1.5 text-sm font-semibold">Duração<input type="number" min={1} value={basic.durationInMinutes} onChange={(event) => patchBasic({ durationInMinutes: Number(event.target.value) })} className={INPUT_CLASS} /></label></div>
              <details className="rounded-xl border border-border bg-background p-4"><summary className="cursor-pointer text-sm font-bold">Opções adicionais de organização e recomendação</summary><div className="mt-5 space-y-5">{courseLayout === "gallery" && <ImageUpload label="Capa vertical da aula" value={basic.coverUrl} onChange={(url) => patchBasic({ coverUrl: url ?? "" })} folder="lessons" aspect="portrait" />}<div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-semibold">Nível<select value={basic.level} onChange={(event) => patchBasic({ level: event.target.value as PersonalizedLessonBasicDraft["level"] })} className={INPUT_CLASS}><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option></select></label><label className="space-y-1.5 text-sm font-semibold">Público-alvo<input value={basic.audience} onChange={(event) => patchBasic({ audience: event.target.value })} className={INPUT_CLASS} placeholder="Ex.: novos gestores" /></label></div><label className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-sm"><input type="checkbox" checked={basic.isEligibleForTrail} onChange={(event) => patchBasic({ isEligibleForTrail: event.target.checked })} className="mt-1" /><span><span className="block font-semibold">Considerar no ClassRank</span><span className="mt-0.5 block text-xs text-muted">Esta aula pode influenciar trilhas e recomendações inteligentes.</span></span></label><TagInputField label="Tópicos abordados" values={basic.topics} onChange={(topics) => patchBasic({ topics })} placeholder="Ex.: feedback, escuta ativa" /><TagInputField label="Problemas que a aula resolve" values={basic.solves} onChange={(solves) => patchBasic({ solves })} placeholder="Ex.: evitar conflitos" /><LessonPrerequisitePicker modules={modules} currentLessonId={lessonId} value={basic.prerequisites} onChange={(prerequisites) => patchBasic({ prerequisites })} /></div></details>
              <SaveSectionButton busy={isSaving} onClick={() => handleSave("basic")} />
            </div>
          </SectionCard>

          <SectionCard id="ai" active={activeSection === "ai"} complete={sectionComplete.ai} error={errors.ai} onOpen={() => setActiveSection("ai")}>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-background p-1"><button type="button" onClick={() => { setAuthoringMode("guided"); touch(); }} className={cn("rounded-lg px-3 py-2.5 text-sm font-bold", authoringMode === "guided" ? "bg-surface text-accent shadow-sm" : "text-muted")}>Editor guiado</button><button type="button" onClick={() => { setAuthoringMode("advanced"); setPromptTemplate(promptTemplate || compiledPrompt); touch(); }} className={cn("rounded-lg px-3 py-2.5 text-sm font-bold", authoringMode === "advanced" ? "bg-surface text-accent shadow-sm" : "text-muted")}>Prompt avançado</button></div>
              {authoringMode === "guided" ? <>
                <label className="block space-y-1.5 text-sm font-semibold">
                  Que conteúdo e situações a IA deve abordar?
                  <textarea id="personalized-coreInstructions" rows={6} value={guided.coreInstructions} onChange={(event) => patchGuided({ coreInstructions: event.target.value })} aria-invalid={fieldError?.field === "coreInstructions"} className={INPUT_CLASS} placeholder="Explique os assuntos, exemplos e limites importantes para esta aula..." />
                  <FieldError show={fieldError?.field === "coreInstructions"} message={fieldError?.message} />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold">Como o conteúdo deve ser adaptado para cada aluno? <span className="font-normal text-muted">(opcional)</span><textarea rows={3} value={guided.personalizationInstructions} onChange={(event) => patchGuided({ personalizationInstructions: event.target.value })} className={INPUT_CLASS} placeholder="Ex.: use situações próximas ao cargo e ao desafio atual do aluno" /></label>
                <label className="block space-y-1.5 text-sm font-semibold">Tom da aula<select value={guided.tone} onChange={(event) => patchGuided({ tone: event.target.value as PersonalizedGuidedConfig["tone"] })} className={INPUT_CLASS}>{Object.entries(GUIDED_TONE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <fieldset><legend className="mb-2 text-sm font-semibold">Estrutura desejada</legend><div className="grid gap-2 sm:grid-cols-2">{Object.entries(GUIDED_SECTION_LABELS).map(([value, label]) => { const selected = guided.sections.includes(value as PersonalizedLessonSection); return <label key={value} className={cn("flex items-start gap-2 rounded-xl border p-3 text-sm", selected ? "border-accent/40 bg-accent-soft" : "border-border")}><input type="checkbox" checked={selected} onChange={() => patchGuided({ sections: selected ? guided.sections.filter((item) => item !== value) : [...guided.sections, value as PersonalizedLessonSection] })} className="mt-0.5" /><span>{label}</span></label>; })}</div></fieldset>
              </> : <div className="space-y-3"><label className="text-sm font-semibold">Prompt completo<textarea id="personalized-promptTemplate" ref={promptRef} rows={14} maxLength={20_000} value={promptTemplate} onChange={(event) => { setPromptTemplate(event.target.value); touch(); }} aria-invalid={fieldError?.field === "promptTemplate"} className={INPUT_CLASS} placeholder="Escreva as instruções completas para a IA..." /><FieldError show={fieldError?.field === "promptTemplate"} message={fieldError?.message} /></label><p className="text-xs text-muted">Use variáveis como <code>{"{{cargo}}"}</code> ou <code>{"{{cargo|não informado}}"}</code>.</p></div>}
              <details className="rounded-xl border border-border bg-background p-4"><summary className="cursor-pointer text-sm font-bold">Configurações avançadas</summary><div className="mt-4 space-y-4"><label className="block space-y-1.5 text-sm font-semibold">Modelo de IA<select id="personalized-model" value={model} onChange={(event) => { setModel(event.target.value); touch(); }} aria-invalid={fieldError?.field === "model"} className={INPUT_CLASS}><option value="">Selecione um modelo</option>{initialData.models.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><FieldError show={fieldError?.field === "model"} message={fieldError?.message} /></label>{authoringMode === "guided" && <label className="block space-y-1.5 text-sm font-semibold">Prompt técnico gerado<textarea readOnly rows={10} value={compiledPrompt} className={cn(INPUT_CLASS, "bg-background text-muted")} /></label>}</div></details>
              <SaveSectionButton busy={isSaving} onClick={() => handleSave("ai")} />
            </div>
          </SectionCard>

          <SectionCard id="personalization" active={activeSection === "personalization"} complete={sectionComplete.personalization} error={errors.personalization} onOpen={() => setActiveSection("personalization")}>
            <div className="space-y-6">
              <div><h3 className="font-bold">Dados que a plataforma já conhece</h3><p className="mt-1 text-sm text-muted">Marque somente o que realmente ajuda a personalizar esta aula.</p></div>
              <div className="grid gap-2 sm:grid-cols-2">{initialData.variableOptions.map((option) => { const selected = selectedBindingKeys.has(`${option.source}:${option.sourceRef}`); return <label key={`${option.source}:${option.sourceRef}`} className={cn("flex items-start gap-3 rounded-xl border p-3", selected ? "border-accent/40 bg-accent-soft" : "border-border")}><input type="checkbox" checked={selected} onChange={() => { setBindings((current) => selected ? current.filter((item) => !(item.source === option.source && item.sourceRef === option.sourceRef)) : [...current, { key: option.key, label: option.label, source: option.source, sourceRef: option.sourceRef }]); touch(); }} className="mt-1" /><span className="min-w-0"><span className="block text-sm font-semibold">{option.label}</span><span className="text-xs text-muted">{option.groupLabel}</span>{authoringMode === "advanced" && selected && <button type="button" onClick={(event) => { event.preventDefault(); insertVariable(option.key); }} className="mt-1 block text-xs font-bold text-accent">Inserir no prompt</button>}</span></label>; })}</div>
              <div className="rounded-xl border border-success/25 bg-success-soft p-4 text-sm"><p className="font-bold text-foreground">Privacidade por padrão</p><p className="mt-1 text-muted">E-mail, telefone, nascimento e gênero nunca são enviados. A IA recebe apenas os {bindings.length} dados marcados e as respostas abaixo.</p></div>
              <div className="border-t border-border pt-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold">Perguntas antes de gerar</h3><p className="text-sm text-muted">O aluno responde quando abrir esta aula.</p></div><button type="button" onClick={() => { setQuestions((current) => [...current, emptyQuestion(current.length, [...current.map((item) => item.key), ...bindings.map((item) => item.key)])]); touch(); }} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold"><Plus className="size-4" /> Pergunta</button></div><div className="mt-4 space-y-3">{questions.length === 0 && <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">Nenhuma pergunta. A aula usará somente os dados já selecionados.</div>}{questions.map((question, index) => <QuestionCard key={question.id} question={question} index={index} count={questions.length} keyLocked={activeQuestionKeys.has(question.id)} authoringMode={authoringMode} bindings={bindings} questions={questions} updateQuestion={updateQuestion} moveQuestion={moveQuestion} remove={() => { setQuestions((current) => current.filter((item) => item.id !== question.id)); touch(); }} insertVariable={insertVariable} />)}</div></div>
              <SaveSectionButton busy={isSaving} onClick={() => handleSave("personalization")} />
            </div>
          </SectionCard>

          <SectionCard id="knowledge" active={activeSection === "knowledge"} complete={sectionComplete.knowledge} error={errors.knowledge} onOpen={() => setActiveSection("knowledge")}>
            <div className="space-y-6">
              <div><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold">Conteúdos da plataforma</h3><p className="text-sm text-muted">Escolha materiais que a IA poderá consultar.</p></div><button type="button" onClick={() => setSourcePickerOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold"><Plus className="size-4" /> Adicionar fonte</button></div>{sourcePickerOpen && <div className="mt-3 rounded-xl border border-border bg-background p-4"><div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]"><input value={sourceQuery} onChange={(event) => setSourceQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && searchSources()} className={INPUT_CLASS} placeholder="Buscar pelo título" /><select value={sourceKind} onChange={(event) => setSourceKind(event.target.value as typeof sourceKind)} className={INPUT_CLASS}><option value="all">Todos</option>{Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" onClick={() => searchSources(0)} className="grid size-11 place-items-center rounded-xl bg-accent text-on-primary">{isSearchingSources ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}</button></div><div className="mt-3 max-h-64 space-y-1 overflow-auto">{sourceResults.map((option) => { const selected = sources.some((source) => source.kind === option.kind && source.id === option.id); return <label key={`${option.kind}:${option.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface"><input type="checkbox" checked={selected} onChange={() => { setSources((current) => selected ? current.filter((item) => !(item.kind === option.kind && item.id === option.id)) : [...current, { kind: option.kind, id: option.id, title: option.title }]); touch(); }} /><span className="min-w-0 flex-1 truncate text-sm">{option.title}</span><span className="text-xs text-muted">{SOURCE_LABELS[option.kind]}</span></label>; })}</div></div>}<div className="mt-3 flex flex-wrap gap-2">{sources.map((source) => <span key={`${source.kind}:${source.id}`} className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold"><span>{SOURCE_LABELS[source.kind]}: {source.title}</span><button type="button" aria-label={`Remover ${source.title}`} onClick={() => { setSources((current) => current.filter((item) => !(item.kind === source.kind && item.id === source.id))); touch(); }}>×</button></span>)}{sources.length === 0 && <p className="text-sm text-muted">Nenhum conteúdo selecionado.</p>}</div></div>
              <DocumentsEditor documents={documents} draftDocuments={draftDocuments} isUploading={isUploading} uploadFiles={uploadFiles} removeDocument={removeDocument} />
              <label className="block space-y-1.5 border-t border-border pt-5 text-sm font-semibold">Notas e orientações adicionais <span className="font-normal text-muted">(opcional)</span><textarea rows={5} maxLength={120_000} value={context} onChange={(event) => { setContext(event.target.value); touch(); }} className={INPUT_CLASS} placeholder="Fatos, limites ou instruções que não estão nas fontes..." /></label>
              <SaveSectionButton busy={isSaving || isUploading} label="Salvar seção" onClick={() => handleSave("knowledge")} />
            </div>
          </SectionCard>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><div className="flex items-center gap-3"><AssistantAvatar config={initialData.assistant} className="size-11 rounded-xl" /><div><p className="font-bold">{initialData.assistant.displayName}</p><p className="text-xs text-muted">Vai escrever esta aula</p></div></div><Link href="/admin/chat" className="mt-3 inline-block text-xs font-bold text-accent">Alterar identidade do assistente</Link></div>
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><h2 className="font-bold">Pronto para publicar?</h2><div className="mt-3 space-y-2">{SECTION_IDS.map((id) => <button key={id} type="button" onClick={() => setActiveSection(id)} className="flex w-full items-center gap-2 text-left text-sm"><span className={cn("grid size-5 place-items-center rounded-full", sectionComplete[id] ? "bg-success text-white" : "bg-border text-muted")}>{sectionComplete[id] ? <Check className="size-3" /> : SECTION_IDS.indexOf(id) + 1}</span><span className={sectionComplete[id] ? "text-foreground" : "text-muted"}>{SECTION_META[id].title}</span></button>)}</div>{errors.publish && <p role="alert" className="mt-3 flex gap-2 rounded-lg bg-danger-soft p-3 text-xs text-danger"><AlertCircle className="size-4 shrink-0" />{errors.publish}</p>}</div>
          <details className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><summary className="flex cursor-pointer list-none items-center gap-2 font-bold"><Eye className="size-4 text-accent" /> Prévia do aluno</summary><div className="mt-4 rounded-xl border border-border bg-background p-4"><p className="text-xs font-bold uppercase tracking-wide text-accent">Aula personalizada</p><h3 className="mt-1 font-bold">{basic.title || "Título da aula"}</h3><p className="mt-2 text-xs text-muted">Antes de gerar, o aluno verá:</p><div className="mt-3 space-y-2">{questions.length ? questions.map((question) => <div key={question.id} className="rounded-lg bg-surface p-2.5 text-xs"><span className="font-semibold">{question.label || "Pergunta ainda sem enunciado"}</span>{question.required && <span className="ml-1 text-danger">*</span>}</div>) : <p className="text-xs text-muted">Nenhuma pergunta adicional.</p>}</div><div className="mt-3 rounded-lg bg-accent px-3 py-2 text-center text-xs font-bold text-on-primary">Gerar aula personalizada</div></div></details>
          <div className="hidden space-y-2 lg:block"><button type="button" disabled={isPublishing || isUploading || !readyToPublish} onClick={handlePublish} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-40">{isPublishing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{isPublished ? "Republicar alterações" : "Publicar aula"}</button>{hasPendingDraft && initialData.config && <button type="button" disabled={isSaving} onClick={handleDiscard} className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-muted hover:bg-background">Descartar alterações</button>}</div>
        </aside>
      </div>
      <div className="fixed inset-x-3 bottom-3 z-30 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-elev-3 backdrop-blur lg:hidden"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{status}</p><p className="text-xs text-muted">{completedCount}/4 seções prontas</p></div><button type="button" disabled={isPublishing || isUploading || !readyToPublish} onClick={handlePublish} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-on-primary disabled:opacity-40">{isPublishing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{isPublished ? "Republicar" : "Publicar"}</button></div>
    </div>
  );
}

function SaveSectionButton({ busy, onClick, label = "Salvar e continuar" }: { busy: boolean; onClick: () => void; label?: string }) {
  return <div className="flex justify-end"><button type="button" disabled={busy} onClick={onClick} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{label}</button></div>;
}

function QuestionCard({ question, index, count, keyLocked, authoringMode, bindings, questions, updateQuestion, moveQuestion, remove, insertVariable }: {
  question: PersonalizedLessonQuestion; index: number; count: number; keyLocked: boolean; authoringMode: PersonalizedAuthoringMode;
  bindings: PersonalizedVariableBinding[]; questions: PersonalizedLessonQuestion[];
  updateQuestion: (id: string, patch: Partial<PersonalizedLessonQuestion>) => void;
  moveQuestion: (index: number, direction: -1 | 1) => void; remove: () => void; insertVariable: (key: string) => void;
}) {
  return <article className="rounded-xl border border-border bg-background p-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]"><label className="space-y-1 text-xs font-bold text-muted">Pergunta<input value={question.label} onChange={(event) => { const label = event.target.value; const used = questions.filter((item) => item.id !== question.id).map((item) => item.key).concat(bindings.map((item) => item.key)); updateQuestion(question.id, { label, ...(!keyLocked ? { key: createQuestionKey(label, used) } : {}) }); }} className={INPUT_CLASS} placeholder="Ex.: Qual desafio você precisa resolver?" /></label><label className="space-y-1 text-xs font-bold text-muted">Tipo<select value={question.type} onChange={(event) => updateQuestion(question.id, { type: event.target.value as PersonalizedLessonQuestion["type"] })} className={INPUT_CLASS}><option value="short_text">Resposta curta</option><option value="long_text">Resposta longa</option><option value="single">Escolha única</option><option value="multiple">Múltipla escolha</option></select></label></div>{(question.type === "single" || question.type === "multiple") && <label className="mt-3 block space-y-1 text-xs font-bold text-muted">Opções, uma por linha<textarea rows={3} value={question.options.join("\n")} onChange={(event) => updateQuestion(question.id, { options: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} className={INPUT_CLASS} /></label>}<div className="mt-3 flex flex-wrap items-center gap-2"><label className="mr-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(question.id, { required: event.target.checked })} /> Resposta obrigatória</label><details className="relative"><summary className="cursor-pointer list-none rounded-lg px-2 py-1 text-xs font-bold text-muted">Opções avançadas</summary><div className="absolute bottom-8 right-0 z-10 w-64 rounded-xl border border-border bg-surface p-3 shadow-elev-3"><label className="text-xs font-bold text-muted">Chave técnica<input disabled={keyLocked} value={question.key} onChange={(event) => updateQuestion(question.id, { key: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} className={cn(INPUT_CLASS, "mt-1")} /></label>{keyLocked && <p className="mt-1 text-xs text-muted"><LockKeyhole className="mr-1 inline size-3" /> Bloqueada após a publicação.</p>}{authoringMode === "advanced" && <button type="button" onClick={() => insertVariable(question.key)} className="mt-2 text-xs font-bold text-accent">Inserir no prompt</button>}</div></details><button type="button" aria-label="Mover pergunta para cima" disabled={index === 0} onClick={() => moveQuestion(index, -1)} className="rounded-lg p-2 disabled:opacity-30"><ArrowUp className="size-4" /></button><button type="button" aria-label="Mover pergunta para baixo" disabled={index === count - 1} onClick={() => moveQuestion(index, 1)} className="rounded-lg p-2 disabled:opacity-30"><ArrowDown className="size-4" /></button><button type="button" aria-label="Excluir pergunta" onClick={remove} className="rounded-lg p-2 text-danger"><Trash2 className="size-4" /></button></div></article>;
}

function DocumentsEditor({ documents, draftDocuments, isUploading, uploadFiles, removeDocument }: {
  documents: PersonalizedLessonDocument[]; draftDocuments: PersonalizedLessonDocument[]; isUploading: boolean;
  uploadFiles: (files: File[]) => Promise<void>; removeDocument: (document: PersonalizedLessonDocument) => Promise<void>;
}) {
  return <div className="border-t border-border pt-5"><div><h3 className="font-bold">Documentos privados</h3><p className="text-sm text-muted">PDF, DOCX, TXT ou Markdown; até 10 arquivos de 10 MB.</p></div><label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void uploadFiles([...event.dataTransfer.files]); }} className="mt-3 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-border bg-background p-7 text-center hover:border-accent/50"><Upload className="mb-2 size-6 text-accent" /><span className="text-sm font-bold">Arraste arquivos ou clique para selecionar</span><span className="mt-1 text-xs text-muted">Você pode enviar vários de uma vez</span><input type="file" multiple className="sr-only" disabled={isUploading} accept=".pdf,.docx,.txt,.md,.markdown" onChange={(event) => { void uploadFiles([...(event.target.files ?? [])]); event.target.value = ""; }} /></label>{isUploading && <p className="mt-2 flex items-center gap-2 text-sm text-accent"><Loader2 className="size-4 animate-spin" /> Processando documentos...</p>}<div className="mt-3 space-y-2">{documents.filter((document) => document.inDraft || document.inPublished).map((document) => <div key={document.id} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5", document.inDraft ? "border-border" : "border-warning/30 bg-warning-soft")}><FileText className="size-4 text-accent" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{document.fileName}</p><p className="text-xs text-muted">{document.inDraft ? document.status === "ready" ? "Pronto para a próxima publicação" : document.status === "processing" ? "Processando" : `Falha: ${document.errorMessage ?? "não foi possível ler"}` : "Será removido na próxima publicação"}</p></div>{document.inDraft && <button type="button" aria-label={`Remover ${document.fileName}`} onClick={() => removeDocument(document)} className="rounded-lg p-2 text-danger"><Trash2 className="size-4" /></button>}</div>)}{draftDocuments.length === 0 && <p className="text-sm text-muted">Nenhum documento selecionado para o rascunho.</p>}</div></div>;
}

function FieldError({ show, message }: { show: boolean; message?: string }) {
  if (!show || !message) return null;
  return <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-danger"><AlertCircle className="size-4" /> {message}</p>;
}
