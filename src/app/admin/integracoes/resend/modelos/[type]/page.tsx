"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  RotateCcw,
  Check,
  Send,
  Code2,
  Eye,
  Sparkles,
  Laptop,
  Smartphone,
  Tag,
  Copy,
  RefreshCw,
  X,
} from "lucide-react";
import { CustomEmailTemplate, EmailTemplateType } from "@/types/resend";
import {
  getCustomTemplates,
  getDefaultTemplateDefinitions,
  interpolateVariables,
  saveCustomTemplate,
  resetCustomTemplate,
} from "@/lib/emailTemplates";

export default function ResendTemplateStudioPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as EmailTemplateType;

  const [template, setTemplate] = useState<CustomEmailTemplate | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedPreviewText, setEditedPreviewText] = useState("");
  const [editedHtml, setEditedHtml] = useState("");

  const [editorMode, setEditorMode] = useState<"split" | "code" | "preview">("split");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [useSampleData, setUseSampleData] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Quick Test Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTemplate() {
      try {
        const res = await fetch("/api/admin/integracoes/resend");
        const data = await res.json();
        let current: CustomEmailTemplate | undefined;

        if (data.success && data.templates && data.templates[type]) {
          current = data.templates[type];
        } else {
          const templates = getCustomTemplates();
          current = templates[type] || getDefaultTemplateDefinitions().find((t) => t.type === type);
        }

        if (isMounted) {
          if (current) {
            setTemplate(current);
            setEditedSubject(current.subject);
            setEditedPreviewText(current.previewText || "");
            setEditedHtml(current.html);
          } else {
            toast.error("Modelo de e-mail não encontrado.");
            router.push("/admin/integracoes/resend/modelos");
          }
        }
      } catch {
        if (isMounted) {
          const templates = getCustomTemplates();
          const current = templates[type] || getDefaultTemplateDefinitions().find((t) => t.type === type);
          if (current) {
            setTemplate(current);
            setEditedSubject(current.subject);
            setEditedPreviewText(current.previewText || "");
            setEditedHtml(current.html);
          }
        }
      }
    }

    loadTemplate();

    return () => {
      isMounted = false;
    };
  }, [type, router]);

  const handleSave = async () => {
    if (!template) return;

    setIsSaving(true);
    try {
      const updated: CustomEmailTemplate = {
        ...template,
        subject: editedSubject,
        previewText: editedPreviewText,
        html: editedHtml,
        isCustomized: true,
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch("/api/admin/integracoes/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_template", template: updated }),
      });

      const data = await res.json();
      if (data.success) {
        saveCustomTemplate(updated);
        setTemplate(updated);
        toast.success(`Modelo "${updated.name}" salvo com sucesso!`);
      } else {
        toast.error(data.error || "Erro ao salvar modelo.");
      }
    } catch {
      const fallback: CustomEmailTemplate = {
        ...template,
        subject: editedSubject,
        previewText: editedPreviewText,
        html: editedHtml,
        isCustomized: true,
      };
      saveCustomTemplate(fallback);
      setTemplate(fallback);
      toast.success("Modelo salvo localmente!");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!template) return;
    if (!confirm(`Deseja restaurar o modelo "${template.name}" para o HTML original do sistema?`)) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch("/api/admin/integracoes/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_template", templateType: type }),
      });

      const data = await res.json();
      if (data.success && data.template) {
        resetCustomTemplate(type);
        setTemplate(data.template);
        setEditedSubject(data.template.subject);
        setEditedPreviewText(data.template.previewText || "");
        setEditedHtml(data.template.html);
        toast.success("Modelo restaurado para o layout original!");
      } else {
        const reset = resetCustomTemplate(type);
        setTemplate(reset);
        setEditedSubject(reset.subject);
        setEditedPreviewText(reset.previewText || "");
        setEditedHtml(reset.html);
        toast.success("Modelo restaurado!");
      }
    } catch {
      const reset = resetCustomTemplate(type);
      setTemplate(reset);
      setEditedSubject(reset.subject);
      setEditedPreviewText(reset.previewText || "");
      setEditedHtml(reset.html);
      toast.success("Modelo restaurado localmente!");
    } finally {
      setIsResetting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".html") && !file.name.endsWith(".htm") && !file.type.includes("html")) {
      toast.error("Selecione um arquivo HTML válido (.html ou .htm).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setEditedHtml(content);
        toast.success(`Arquivo "${file.name}" importado com sucesso!`);
      }
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo selecionado.");
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInsertVariable = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedField(tag);
    toast.success(`Tag ${tag} copiada e inserida!`);
    setTimeout(() => setCopiedField(null), 2000);

    const textarea = codeTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + tag + text.substring(end);
      setEditedHtml(newText);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) {
      toast.error("Informe o e-mail de destino.");
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetch("/api/admin/integracoes/resend/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail, template: type }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setIsTestModalOpen(false);
      } else {
        toast.error(data.error || "Erro no envio de teste.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Erro no teste: " + msg);
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!template) {
    return (
      <div className="py-20 text-center text-text-mute">
        <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
        Carregando estúdio de e-mails...
      </div>
    );
  }

  // Dynamic preview interpolation
  const previewHtml = useSampleData
    ? interpolateVariables(editedHtml, {
        nome: "Carlos Silva",
        email: "carlos.silva@exemplo.com",
        nome_plataforma: "Smart LMS",
        nome_curso: "Especialista em Next.js & IA",
        link_curso: "https://smartlms.com/cursos/nextjs",
        link_login: "https://smartlms.com/login",
        link_recuperacao: "https://smartlms.com/recuperar-senha?token=exemplo123",
        codigo_certificado: "CERT-849201",
        link_certificado: "https://smartlms.com/certificados/849201",
        nome_plano: "Plano Pro Mensal",
        valor_plano: "R$ 59,90/mês",
        dias_inativo: 7,
        titulo_notificacao: "Novo Módulo Prático Liberado!",
        mensagem_notificacao:
          "Publicamos hoje a aula com o passo a passo completo sobre criação de Agentes de IA customizados no Smart LMS.",
        link_acao: "https://smartlms.com/cursos",
        texto_acao: "Acessar Aula Agora",
      })
    : editedHtml;

  const previewSubject = useSampleData
    ? interpolateVariables(editedSubject, {
        nome: "Carlos Silva",
        nome_plataforma: "Smart LMS",
        nome_curso: "Especialista em Next.js & IA",
        nome_plano: "Plano Pro Mensal",
        titulo_notificacao: "Novo Módulo Prático Liberado!",
      })
    : editedSubject;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        eyebrow="Resend • Studio de Modelos"
        title={template.name}
        description={template.description}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/integracoes/resend/modelos"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text hover:bg-canvas-soft transition-colors"
            >
              <ArrowLeft className="size-3.5" /> Voltar aos Modelos
            </Link>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".html,.htm,text/html"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text hover:bg-canvas-soft transition-colors"
              title="Subir arquivo HTML do seu computador"
            >
              <Upload className="size-3.5" /> Subir HTML (.html)
            </button>

            {template.isCustomized && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-mute hover:text-negative hover:border-negative/30 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="size-3.5" /> Restaurar Padrão
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text hover:bg-canvas-soft transition-colors"
            >
              <Send className="size-3.5 text-primary" /> Testar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-active transition-all shadow-sm disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Salvar Alterações
            </button>
          </div>
        }
      />

      {/* Metadata Configuration Bar */}
      <div className="editorial-card p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-1.5">
              Assunto do E-mail (Subject)
            </label>
            <input
              type="text"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              placeholder="Ex: Boas-vindas ao {{nome_plataforma}}!"
              className="w-full min-h-10 rounded-xl border border-border bg-canvas-soft px-3.5 text-xs font-mono text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
            />
            <p className="text-[10px] text-text-mute mt-1">
              Suporta variáveis dinâmicas como <code>{"{{nome}}"}</code> ou <code>{"{{nome_curso}}"}</code>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-mute mb-1.5">
              Texto de Prévia (Preheader / Snippet)
            </label>
            <input
              type="text"
              value={editedPreviewText}
              onChange={(e) => setEditedPreviewText(e.target.value)}
              placeholder="Resumo exibido ao lado do assunto..."
              className="w-full min-h-10 rounded-xl border border-border bg-canvas-soft px-3.5 text-xs font-mono text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
            />
            <p className="text-[10px] text-text-mute mt-1">
              Texto complementar que aparece antes de abrir o e-mail no Gmail / Apple Mail.
            </p>
          </div>
        </div>

        {/* Dynamic Variable Chips Drawer */}
        <div className="border-t border-border/60 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-text flex items-center gap-1.5">
              <Tag className="size-3.5 text-primary" /> Campos Personalizados Disponíveis
            </p>
            <span className="text-[10px] text-text-mute">
              Clique em uma tag para copiar ou inserir no código
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {template.variables.map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => handleInsertVariable(v.tag)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface hover:border-primary hover:bg-primary/5 text-xs font-mono text-text transition-all group shadow-2xs"
                title={`${v.label} - ${v.description} (Ex: ${v.example})`}
              >
                <span className="text-primary font-bold">{v.tag}</span>
                <span className="text-[10px] text-text-mute group-hover:text-text font-sans">
                  {v.label}
                </span>
                {copiedField === v.tag ? (
                  <Check className="size-3 text-success" />
                ) : (
                  <Copy className="size-3 text-text-mute opacity-40 group-hover:opacity-100" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor & Preview Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-2 rounded-xl border border-border">
        <div className="flex items-center gap-1 bg-canvas-soft p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setEditorMode("code")}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
              editorMode === "code"
                ? "bg-surface shadow-sm text-text font-bold"
                : "text-text-mute hover:text-text"
            }`}
          >
            <Code2 className="size-3.5" /> Código HTML
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("preview")}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
              editorMode === "preview"
                ? "bg-surface shadow-sm text-text font-bold"
                : "text-text-mute hover:text-text"
            }`}
          >
            <Eye className="size-3.5" /> Prévia Renderizada
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("split")}
            className={`hidden md:flex px-3 py-1.5 rounded-md items-center gap-1.5 transition-all ${
              editorMode === "split"
                ? "bg-surface shadow-sm text-text font-bold"
                : "text-text-mute hover:text-text"
            }`}
          >
            <Sparkles className="size-3.5" /> Lado a Lado
          </button>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-text-mute hover:text-text">
            <input
              type="checkbox"
              checked={useSampleData}
              onChange={(e) => setUseSampleData(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <span>Prévia com Dados de Exemplo</span>
          </label>

          <div className="flex items-center gap-1 border-l border-border pl-3">
            <button
              type="button"
              onClick={() => setPreviewDevice("desktop")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                previewDevice === "desktop"
                  ? "bg-primary-soft text-primary font-bold"
                  : "text-text-mute hover:text-text"
              }`}
              title="Desktop (580px)"
            >
              <Laptop className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice("mobile")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                previewDevice === "mobile"
                  ? "bg-primary-soft text-primary font-bold"
                  : "text-text-mute hover:text-text"
              }`}
              title="Mobile (360px)"
            >
              <Smartphone className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor & Live Preview Panes */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-12">
        {/* Code Editor Pane */}
        {(editorMode === "code" || editorMode === "split") && (
          <div className={editorMode === "split" ? "md:col-span-6 space-y-2" : "col-span-12 space-y-2"}>
            <div className="flex items-center justify-between text-[11px] text-text-mute font-mono px-1">
              <span>Editor de Código HTML</span>
              <span>{editedHtml.length} caracteres</span>
            </div>

            <div className="relative rounded-2xl border border-border overflow-hidden bg-slate-950 shadow-md">
              <textarea
                ref={codeTextareaRef}
                value={editedHtml}
                onChange={(e) => setEditedHtml(e.target.value)}
                rows={28}
                placeholder="Cole seu código HTML aqui ou arraste um arquivo..."
                className="w-full bg-slate-950 p-4 font-mono text-xs text-emerald-400 placeholder:text-slate-600 focus:outline-none leading-relaxed resize-y selection:bg-emerald-950 selection:text-emerald-200 min-h-[580px]"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* Live Preview Pane */}
        {(editorMode === "preview" || editorMode === "split") && (
          <div className={editorMode === "split" ? "md:col-span-6 space-y-2" : "col-span-12 space-y-2"}>
            <div className="flex items-center justify-between text-[11px] text-text-mute font-mono px-1">
              <span>Pré-visualização em Tempo Real</span>
              <span className="truncate max-w-[200px]" title={previewSubject}>
                Assunto: {previewSubject}
              </span>
            </div>

            <div
              className={`rounded-2xl border border-border bg-white shadow-md overflow-hidden flex flex-col mx-auto transition-all ${
                previewDevice === "mobile" ? "max-w-[360px]" : "w-full"
              }`}
            >
              {/* Fake Email Client Top Bar */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-400" />
                    <span className="size-2.5 rounded-full bg-amber-400" />
                    <span className="size-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="font-semibold ml-2 text-[11px]">
                    Smart LMS &lt;onboarding@resend.dev&gt;
                  </span>
                </div>
                <span className="text-slate-400 text-[10px]">Para: carlos@exemplo.com</span>
              </div>

              {/* Iframe Box */}
              <div className="p-1 bg-slate-50 min-h-[580px] overflow-y-auto">
                <iframe
                  title="Prévia do Modelo"
                  srcDoc={previewHtml}
                  className="w-full h-[560px] border-0 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary-soft text-primary grid place-items-center">
                  <Send className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-ink">Testar Envio: {template.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="p-1.5 text-text-mute hover:text-text rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSendTest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-text mb-1">E-mail de Destino</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="seu-email@teste.com"
                  required
                  className="w-full min-h-10 rounded-xl border border-border bg-canvas-soft px-3 text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
                />
                <p className="text-[10px] text-text-mute mt-1">
                  O e-mail será disparado com o HTML customizado e tags dinâmicas preenchidas.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 font-semibold text-text hover:bg-canvas-soft transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="flex-1 rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary-active transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSendingTest ? <RefreshCw className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Enviar Teste Agora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
