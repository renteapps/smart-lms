"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, FileText, History, Loader2, Plus, Save, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "@heroui/react";
import { deletePersonalizedLessonDocument, savePersonalizedLessonConfig } from "@/app/actions/admin/personalizedLessons";
import { AssistantAvatar } from "@/components/platform-assistant/AssistantAvatar";
import { createClient } from "@/lib/supabase/client";
import type {
  PersonalizedLessonAdminData,
  PersonalizedLessonQuestion,
  PersonalizedSourceRef,
  PersonalizedVariableBinding,
} from "@/types/personalizedLesson";

const INPUT_CLASS = "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt", "md", "markdown"]);

function emptyQuestion(order: number): PersonalizedLessonQuestion {
  return {
    id: crypto.randomUUID(),
    key: "",
    label: "",
    type: "short_text",
    required: false,
    options: [],
    order,
  };
}

function safeFileName(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-160);
}

function groupByLabel<T extends { groupLabel: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(item.groupLabel, [...(groups.get(item.groupLabel) ?? []), item]);
  return groups;
}

function inferMimeType(file: File, extension: string) {
  if (extension === "pdf") return "application/pdf";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "md" || extension === "markdown") return "text/markdown";
  return file.type || "text/plain";
}

export default function PersonalizedLessonEditor({
  lessonId,
  courseId,
  initialData,
  initiallyPublished,
}: {
  lessonId: string;
  courseId: string;
  initialData: PersonalizedLessonAdminData;
  initiallyPublished: boolean;
}) {
  const config = initialData.config;
  const [promptTemplate, setPromptTemplate] = useState(config?.promptTemplate ?? "");
  const [context, setContext] = useState(config?.context ?? "");
  const [model, setModel] = useState(config?.model ?? initialData.models[0]?.id ?? "");
  const [questions, setQuestions] = useState<PersonalizedLessonQuestion[]>(config?.questions ?? []);
  const [bindings, setBindings] = useState<PersonalizedVariableBinding[]>(config?.variableBindings ?? []);
  const [sources, setSources] = useState<PersonalizedSourceRef[]>(config?.sourceRefs ?? []);
  const [documents, setDocuments] = useState(initialData.documents);
  const [publish, setPublish] = useState(initiallyPublished);
  const [revision, setRevision] = useState(config?.revision ?? 0);
  const [isSaving, startSaving] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const groupedVariables = useMemo(() => groupByLabel(initialData.variableOptions), [initialData.variableOptions]);
  const groupedSources = useMemo(() => groupByLabel(initialData.sourceOptions), [initialData.sourceOptions]);
  const selectedBindingKeys = new Set(bindings.map((binding) => `${binding.source}:${binding.sourceRef}`));
  const selectedSourceKeys = new Set(sources.map((source) => `${source.kind}:${source.id}`));

  const updateQuestion = (id: string, patch: Partial<PersonalizedLessonQuestion>) => {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...patch } : question));
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((question, order) => ({ ...question, order }));
    });
  };

  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    const textarea = promptRef.current;
    if (!textarea) return setPromptTemplate((current) => `${current}${current ? " " : ""}${token}`);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setPromptTemplate((current) => `${current.slice(0, start)}${token}${current.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSave = () => startSaving(async () => {
    const result = await savePersonalizedLessonConfig({
      lessonId,
      courseId,
      promptTemplate,
      context,
      model,
      questions: questions.map((question, order) => ({ ...question, order })),
      variableBindings: bindings,
      sourceRefs: sources,
      publish,
    });
    if (!result.success) {
      toast.danger(result.message);
      return;
    }
    setRevision(result.revision);
    toast.success(publish ? "Configuração salva e aula publicada." : "Configuração salva como rascunho.");
  });

  const handleUpload = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(extension)) return toast.danger("Use PDF, DOCX, TXT ou Markdown.");
    if (file.size < 1 || file.size > MAX_FILE_BYTES) return toast.danger("O arquivo deve ter no máximo 10 MB.");
    if (documents.length >= 10) return toast.danger("Cada aula aceita no máximo 10 documentos.");
    setIsUploading(true);
    const mimeType = inferMimeType(file, extension);
    const storagePath = `personalized-lessons/${lessonId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const supabase = createClient();
    try {
      const { error } = await supabase.storage.from("secure-documents").upload(storagePath, file, {
        contentType: mimeType,
        upsert: false,
      });
      if (error) throw error;
      const response = await fetch("/api/admin/personalized-lessons/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, storagePath, fileName: file.name, mimeType }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao processar o documento.");
      setDocuments((current) => [...current, {
        id: payload.id,
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
        status: "ready",
        createdAt: new Date().toISOString(),
      }]);
      if (payload.revision) setRevision(Number(payload.revision));
      toast.success("Documento processado e pronto para a IA.");
    } catch (error) {
      await supabase.storage.from("secure-documents").remove([storagePath]);
      toast.danger(error instanceof Error ? error.message : "Falha no upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="mt-8 space-y-6 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Etapa 2</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">Configurar personalização</h2>
          <p className="mt-1 text-sm text-muted">Prompt, perguntas e fontes ficam privados no servidor.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/admin/aulas-personalizadas?lesson=${lessonId}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground hover:bg-background">
            <History className="size-4 text-accent" /> Ver histórico
          </Link>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
            <AssistantAvatar config={initialData.assistant} className="size-10 rounded-xl" />
            <div>
              <p className="text-sm font-semibold text-foreground">{initialData.assistant.displayName}</p>
              <p className="text-xs text-muted">Identidade herdada de /admin/chat</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <label htmlFor="personalized-model" className="text-sm font-semibold text-foreground">Modelo de IA</label>
            <p className="text-xs text-muted">Somente modelos habilitados e com preço configurado.</p>
          </div>
          {revision > 0 && <span className="text-xs text-muted">Revisão {revision}</span>}
        </div>
        <select id="personalized-model" value={model} onChange={(event) => setModel(event.target.value)} className={INPUT_CLASS}>
          <option value="">Selecione...</option>
          {initialData.models.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.id}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="personalized-prompt" className="text-sm font-semibold text-foreground">Prompt da aula</label>
        <textarea
          ref={promptRef}
          id="personalized-prompt"
          rows={10}
          maxLength={20_000}
          value={promptTemplate}
          onChange={(event) => setPromptTemplate(event.target.value)}
          placeholder="Ex.: Crie uma aula sobre liderança para {{first_name}}, considerando o cargo {{career_role|não informado}}..."
          className={INPUT_CLASS}
        />
        <p className="text-xs text-muted">Use <code>{"{{chave}}"}</code> ou <code>{"{{chave|valor padrão}}"}</code>. Clique numa variável abaixo para inserir.</p>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Variáveis autorizadas</h3>
          <p className="text-xs text-muted">E-mail, telefone, nascimento e gênero não são oferecidos.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[...groupedVariables.entries()].map(([group, options]) => (
            <fieldset key={group} className="rounded-xl border border-border p-3">
              <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted">{group}</legend>
              <div className="mt-1 max-h-48 space-y-1 overflow-y-auto">
                {options.map((option) => {
                  const selected = selectedBindingKeys.has(`${option.source}:${option.sourceRef}`);
                  return (
                    <div key={`${option.source}:${option.sourceRef}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-background">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => setBindings((current) => selected
                          ? current.filter((item) => !(item.source === option.source && item.sourceRef === option.sourceRef))
                          : [...current, { key: option.key, label: option.label, source: option.source, sourceRef: option.sourceRef }])}
                      />
                      <button type="button" onClick={() => insertVariable(option.key)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm text-foreground">{option.label}</span>
                        <code className="text-xs text-accent">{`{{${option.key}}}`}</code>
                      </button>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Perguntas ao aluno</h3>
            <p className="text-xs text-muted">As respostas ficam salvas pela chave e podem ser reutilizadas.</p>
          </div>
          <button type="button" onClick={() => setQuestions((current) => [...current, emptyQuestion(current.length)])} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-background">
            <Plus className="size-4" /> Pergunta
          </button>
        </div>
        {questions.map((question, index) => (
          <div key={question.id} className="space-y-3 rounded-xl border border-border bg-background p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-muted">Enunciado
                <input value={question.label} onChange={(event) => updateQuestion(question.id, { label: event.target.value })} className={INPUT_CLASS} placeholder="Qual situação você quer resolver?" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-muted">Chave da variável
                <input value={question.key} onChange={(event) => updateQuestion(question.id, { key: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} className={INPUT_CLASS} placeholder="situacao_atual" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-muted">Tipo
                <select value={question.type} onChange={(event) => updateQuestion(question.id, { type: event.target.value as PersonalizedLessonQuestion["type"] })} className={INPUT_CLASS}>
                  <option value="short_text">Resposta curta</option>
                  <option value="long_text">Resposta longa</option>
                  <option value="single">Escolha única</option>
                  <option value="multiple">Múltipla escolha</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pt-5 text-sm text-foreground">
                <input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(question.id, { required: event.target.checked })} /> Obrigatória
              </label>
            </div>
            {(question.type === "single" || question.type === "multiple") && (
              <label className="block space-y-1 text-xs font-semibold text-muted">Opções, uma por linha
                <textarea rows={3} value={question.options.join("\n")} onChange={(event) => updateQuestion(question.id, { options: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} className={INPUT_CLASS} />
              </label>
            )}
            <div className="flex items-center justify-end gap-1">
              {question.key && <button type="button" onClick={() => insertVariable(question.key)} className="mr-auto text-xs font-semibold text-accent">Inserir {`{{${question.key}}}`} no prompt</button>}
              <button type="button" aria-label="Mover pergunta para cima" disabled={index === 0} onClick={() => moveQuestion(index, -1)} className="rounded p-2 hover:bg-surface disabled:opacity-30"><ArrowUp className="size-4" /></button>
              <button type="button" aria-label="Mover pergunta para baixo" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} className="rounded p-2 hover:bg-surface disabled:opacity-30"><ArrowDown className="size-4" /></button>
              <button type="button" aria-label="Excluir pergunta" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id).map((item, order) => ({ ...item, order })))} className="rounded p-2 text-danger hover:bg-danger-soft"><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-border pt-5">
        <label htmlFor="personalized-context" className="text-sm font-semibold text-foreground">Contexto complementar</label>
        <textarea id="personalized-context" rows={6} maxLength={120_000} value={context} onChange={(event) => setContext(event.target.value)} className={INPUT_CLASS} placeholder="Orientações, fatos e limites específicos desta aula..." />
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Fontes do LMS</h3>
          <p className="text-xs text-muted">Somente os itens marcados poderão entrar no contexto.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[...groupedSources.entries()].map(([group, options]) => (
            <fieldset key={group} className="rounded-xl border border-border p-3">
              <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted">{group}</legend>
              <div className="mt-1 max-h-44 space-y-1 overflow-y-auto">
                {options.map((option) => {
                  const selected = selectedSourceKeys.has(`${option.kind}:${option.id}`);
                  return (
                    <label key={`${option.kind}:${option.id}`} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-background">
                      <input type="checkbox" checked={selected} onChange={() => setSources((current) => selected ? current.filter((item) => !(item.kind === option.kind && item.id === option.id)) : [...current, { kind: option.kind, id: option.id, title: option.title }])} className="mt-0.5" />
                      <span>{option.title}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Documentos privados</h3>
            <p className="text-xs text-muted">PDF, DOCX, TXT ou Markdown; até 10 MB e 10 arquivos.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-background">
            {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {isUploading ? "Processando..." : "Enviar documento"}
            <input type="file" className="sr-only" disabled={isUploading} accept=".pdf,.docx,.txt,.md,.markdown" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void handleUpload(file); }} />
          </label>
        </div>
        <div className="space-y-2">
          {documents.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">Nenhum documento enviado.</p>}
          {documents.map((document) => (
            <div key={document.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
              <FileText className="size-4 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{document.fileName}</p>
                <p className="text-xs text-muted">{document.status === "ready" ? "Pronto" : document.status === "processing" ? "Processando" : `Falha: ${document.errorMessage ?? "erro de leitura"}`}</p>
              </div>
              <button type="button" aria-label={`Excluir ${document.fileName}`} onClick={async () => { const result = await deletePersonalizedLessonDocument({ lessonId, documentId: document.id, courseId }); if (!result.success) return toast.danger(result.message); setDocuments((current) => current.filter((item) => item.id !== document.id)); if (result.revision) setRevision(result.revision); }} className="rounded p-2 text-danger hover:bg-danger-soft"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} className="mt-1" />
          <span><span className="block text-sm font-semibold text-foreground">Publicar para os alunos</span><span className="block text-xs text-muted">Configurações inválidas ou documentos pendentes bloqueiam a publicação.</span></span>
        </label>
        <button type="button" disabled={isSaving || isUploading} onClick={handleSave} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50">
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : publish ? <Sparkles className="size-4" /> : <Save className="size-4" />}
          {isSaving ? "Salvando..." : publish ? "Salvar e publicar" : "Salvar rascunho"}
        </button>
      </div>
    </section>
  );
}
