"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Check,
  Code,
  Copy,
  Download,
  Eye,
  FileCode,
  HelpCircle,
  Laptop,
  Mail,
  RefreshCw,
  RotateCcw,
  Send,
  Smartphone,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  Modal,
  Popover,
  Separator,
  Tabs,
  TextField,
  Tooltip,
} from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import {
  CustomEmailTemplate,
  EmailTemplateType,
  EmailTemplateVariable,
} from "@/types/resend";
import {
  getDefaultTemplateDefinitions,
  interpolateVariables,
  EmailTemplateData,
} from "@/lib/emailTemplates";
import { getSiteUrl } from "@/lib/siteUrl";
import { useAppearance } from "@/contexts/AppearanceContext";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { UserVariablePicker } from "@/components/admin/UserVariablePicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface EmailTemplateEditorProps {
  initialType?: EmailTemplateType;
  onBack?: () => void;
}

export function EmailTemplateEditor({
  initialType = "welcome",
  onBack,
}: EmailTemplateEditorProps) {
  const [templates, setTemplates] = useState<Record<string, CustomEmailTemplate>>({});
  const [selectedType, setSelectedType] = useState<EmailTemplateType>(initialType);
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isCustomized, setIsCustomized] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeEditorTab, setActiveEditorTab] = useState<"editor" | "preview" | "split">("split");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Dados de exemplo da prévia: marca e endereços reais da plataforma, para a
  // prévia mostrar exatamente o nome, a cor e os links que o aluno vai receber.
  const appearance = useAppearance();
  const siteUrl = getSiteUrl();
  const sampleData: EmailTemplateData = {
    nome: "Carlos",
    email: "carlos@empresa.com",
    appName: appearance.platformName,
    nome_plataforma: appearance.platformName,
    cor_marca: appearance.primaryColor,
    link_plataforma: siteUrl,
    link_login: `${siteUrl}/auth/confirm?token_hash=exemplo&type=recovery`,
    link_recuperacao: `${siteUrl}/auth/confirm?token_hash=exemplo&type=recovery`,
    curso: "Plano Anual",
    nome_curso: "Liderança na Prática",
    link_curso: `${siteUrl}/cursos`,
    codigo_certificado: "G6-8F3A21",
    link_certificado: `${siteUrl}/certificados/exemplo`,
    nome_plano: "Plano Anual",
    nome_empresa: "Acme Ltda",
    link_convite: `${siteUrl}/convite/exemplo`,
    dias_inativo: 7,
    titulo_notificacao: "Novo módulo liberado",
    mensagem_notificacao: "Adicionamos 4 aulas práticas ao seu curso.\nReserve 20 minutos esta semana para assistir.",
    link_acao: `${siteUrl}/minha-trilha`,
    texto_acao: "Ver as novas aulas",
  };

  // Test Email Modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyTemplate = (template: CustomEmailTemplate) => {
    setSubject(template.subject);
    setPreviewText(template.previewText);
    setHtmlContent(template.html);
    setIsCustomized(!!template.isCustomized);
  };

  /*
   * Os modelos vêm do banco (`email_templates` sobre os padrões do código) —
   * é de lá que o envio real lê. Antes esta tela lia o localStorage, e o admin
   * via um e-mail diferente do que os alunos recebiam.
   */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/integracoes/resend")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.success || !data.templates) throw new Error(data?.error);
        const loaded = data.templates as Record<string, CustomEmailTemplate>;
        setTemplates(loaded);
        applyTemplate(loaded[selectedType] ?? getDefaultTemplateDefinitions()[0]);
      })
      .catch(() => {
        if (cancelled) return;
        const defaults = Object.fromEntries(getDefaultTemplateDefinitions().map((t) => [t.type, t]));
        setTemplates(defaults);
        applyTemplate(defaults[selectedType] ?? getDefaultTemplateDefinitions()[0]);
        toast.danger("Não foi possível carregar os modelos salvos. Exibindo os padrões.");
      });
    return () => { cancelled = true; };
    // Carrega uma vez; a troca de modelo usa o estado já carregado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectTemplate = (type: EmailTemplateType) => {
    setSelectedType(type);
    const t = templates[type] || getDefaultTemplateDefinitions().find((d) => d.type === type);
    if (t) applyTemplate(t);
  };

  const currentTemplate = templates[selectedType] || getDefaultTemplateDefinitions().find((d) => d.type === selectedType);
  const availableVariables: EmailTemplateVariable[] = currentTemplate?.variables || [];

  // Insert tag at cursor or copy
  const handleInsertTag = (tag: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const updated = text.substring(0, start) + tag + text.substring(end);
      setHtmlContent(updated);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    } else {
      navigator.clipboard.writeText(tag);
    }

    setCopiedTag(tag);
    toast.success(`Variável ${tag} copiada e inserida!`);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  // Upload HTML File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".html") && !file.name.endsWith(".htm") && !file.type.includes("html")) {
      toast.danger("Por favor, selecione um arquivo no formato .html ou .htm");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setHtmlContent(content);
        toast.success(`Arquivo "${file.name}" carregado com sucesso!`, {
          description: `Tamanho: ${(file.size / 1024).toFixed(1)} KB`,
        });
      }
    };
    reader.onerror = () => {
      toast.danger("Erro ao ler o arquivo HTML.");
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!currentTemplate) return;
    setIsSaving(true);
    try {
      const updatedTemplate: CustomEmailTemplate = {
        ...currentTemplate,
        subject,
        previewText,
        html: htmlContent,
        isCustomized: true,
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch("/api/admin/integracoes/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_template", template: updatedTemplate }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Erro ao salvar o modelo de e-mail.");

      const saved = (data.template as CustomEmailTemplate) ?? updatedTemplate;
      setTemplates((prev) => ({ ...prev, [selectedType]: saved }));
      setIsCustomized(true);
      toast.success(`Modelo "${currentTemplate.name}" salvo. Os próximos envios já usam esta versão.`);
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Erro ao salvar o modelo de e-mail.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleConfirmReset = async () => {
    try {
      const res = await fetch("/api/admin/integracoes/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_template", templateType: selectedType }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Erro ao restaurar o modelo.");

      const reset = getDefaultTemplateDefinitions().find((d) => d.type === selectedType);
      if (reset) {
        setTemplates((prev) => ({ ...prev, [selectedType]: reset }));
        applyTemplate(reset);
        toast.success(`Modelo "${reset.name}" restaurado para o padrão.`);
      }
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Erro ao restaurar o modelo.");
    } finally {
      setIsResetConfirmOpen(false);
    }
  };

  // Send Test Email
  const handleSendTest = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes("@")) {
      toast.danger("Informe um endereço de e-mail válido para o teste.");
      return;
    }

    setIsSendingTest(true);
    try {
      const interpolatedSubject = interpolateVariables(subject, sampleData);
      const interpolatedHtml = interpolateVariables(htmlContent, sampleData);

      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmailRecipient,
          subject: `[TESTE] ${interpolatedSubject}`,
          html: interpolatedHtml,
        }),
      });
      const res = await response.json();

      if (res.success) {
        toast.success(`E-mail de teste enviado para ${testEmailRecipient}!`, {
          description: res.simulated ? "Envio registrado em modo Sandbox (Simulado)." : "Disparo realizado via Resend API.",
        });
        setTestModalOpen(false);
      } else {
        toast.danger(res.error || "Erro ao enviar e-mail de teste.");
      }
    } catch {
      toast.danger("Falha ao comunicar com o serviço de envio.");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Render live preview HTML with interpolated sample data
  const livePreviewHtml = interpolateVariables(htmlContent, sampleData);

  const defaultList = getDefaultTemplateDefinitions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors mb-3 cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Voltar</span>
          </button>
        )}
        <PageHeader
          eyebrow="Comunicação • E-mails Transacionais"
          title="Editor de E-mails & Upload de HTML"
          description="Personalize o assunto, variáveis dinâmicas ou faça upload de arquivos HTML customizados para cada notificação da plataforma."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              {/* File Upload Hidden Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,text/html"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Upload de arquivo HTML"
              />

              <Button
                variant="outline"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 font-semibold"
              >
                <Upload className="size-4" aria-hidden="true" />
                <span>Subir arquivo HTML</span>
              </Button>

              {isCustomized && (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="gap-2 text-warning hover:text-warning"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  <span>Restaurar Padrão</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="md"
                onClick={() => setTestModalOpen(true)}
                className="gap-2"
              >
                <Send className="size-4" aria-hidden="true" />
                <span>Enviar Teste</span>
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                isDisabled={isSaving}
                className="gap-2 font-bold"
              >
                {isSaving ? <RefreshCw className="size-4 animate-spin" /> : <Check className="size-4" />}
                <span>Salvar Modelo</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Template Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-separator">
        {defaultList.map((tpl) => {
          const isSelected = selectedType === tpl.type;
          const isCustom = templates[tpl.type]?.isCustomized;

          return (
            <button
              key={tpl.type}
              type="button"
              onClick={() => handleSelectTemplate(tpl.type)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border",
                isSelected
                  ? "bg-accent-soft text-accent-soft-foreground border-accent shadow-xs"
                  : "bg-surface text-muted border-border hover:border-accent/50 hover:text-foreground",
              )}
            >
              <Mail className="size-3.5 shrink-0" />
              <span>{tpl.name}</span>
              {isCustom && (
                <span className="size-1.5 rounded-full bg-accent" title="Modelo customizado" />
              )}
            </button>
          );
        })}
      </div>

      {/* Meta Fields: Subject & Preview Text */}
      <Card>
        <Card.Content className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold text-foreground">
                {currentTemplate?.name}
              </h2>
              <Chip
                size="sm"
                variant="soft"
                color={isCustomized ? "accent" : "default"}
                className="text-3xs font-bold"
              >
                {isCustomized ? "Personalizado" : "Layout Padrão"}
              </Chip>
            </div>
            <p className="text-xs text-muted hidden sm:block">
              {currentTemplate?.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField value={subject} onChange={setSubject} isRequired>
              <Label className="text-xs font-semibold text-foreground">Assunto do E-mail</Label>
              <Input placeholder="Ex.: Boas-vindas à plataforma!" />
            </TextField>

            <TextField value={previewText} onChange={setPreviewText}>
              <Label className="text-xs font-semibold text-foreground">Texto de Prévia (Inbox Preheader)</Label>
              <Input placeholder="Ex.: Comece agora seus estudos..." />
            </TextField>
          </div>

          {/* Dynamic Variables Bar */}
          <div className="space-y-2 border-t border-separator pt-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted">
                <Sparkles className="size-3.5 text-accent" />
                <span className="font-semibold text-foreground">Campos Personalizados (Tags Dinâmicas):</span>
                <span className="hidden sm:inline">Clique para inserir no código ou copiar</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {availableVariables.map((v) => (
                <Tooltip.Root key={v.tag}>
                  <Tooltip.Trigger>
                    <button
                      type="button"
                      onClick={() => handleInsertTag(v.tag)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition-all border cursor-pointer",
                        copiedTag === v.tag
                          ? "bg-success-soft text-success border-success"
                          : "bg-background-secondary text-foreground border-border hover:border-accent hover:bg-accent-soft",
                      )}
                    >
                      <span>{v.tag}</span>
                      <Copy className="size-3 text-muted" />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p className="font-semibold">{v.label}</p>
                    <p className="text-xs text-muted">{v.description}</p>
                    <p className="text-xs text-accent mt-0.5">Exemplo: {v.example}</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              ))}
            </div>
            <UserVariablePicker onSelect={handleInsertTag} compact />
          </div>
        </Card.Content>
      </Card>

      {/* Editor & Preview Split Panel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-bold text-foreground">
              Estrutura HTML do E-mail
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => setActiveViewMode("desktop")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  activeViewMode === "desktop"
                    ? "bg-accent-soft text-accent-soft-foreground shadow-xs"
                    : "text-muted hover:text-foreground",
                )}
              >
                <Laptop className="size-3.5" />
                <span>Desktop (580px)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode("mobile")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  activeViewMode === "mobile"
                    ? "bg-accent-soft text-accent-soft-foreground shadow-xs"
                    : "text-muted hover:text-foreground",
                )}
              >
                <Smartphone className="size-3.5" />
                <span>Mobile (375px)</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* HTML Code Editor */}
          <Card className="flex flex-col h-[600px] overflow-hidden">
            <Card.Header className="py-2.5 px-4 bg-background-secondary border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Code className="size-4 text-accent" />
                <span>Editor de Código HTML</span>
              </div>
              <span className="text-2xs text-muted font-mono">
                {htmlContent.length.toLocaleString()} caracteres
              </span>
            </Card.Header>
            <Card.Content className="p-0 flex-1 relative bg-surface">
              <textarea
                ref={textareaRef}
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Cole ou edite o código HTML do e-mail aqui..."
                spellCheck={false}
                className="w-full h-full p-4 font-mono text-xs leading-relaxed bg-surface text-foreground resize-none border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              />
            </Card.Content>
          </Card>

          {/* Rendered Live Preview Frame */}
          <Card className="flex flex-col h-[600px] overflow-hidden">
            <Card.Header className="py-2.5 px-4 bg-background-secondary border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Eye className="size-4 text-accent" />
                <span>Prévia em Tempo Real (Com Dados Simulados)</span>
              </div>
              <span className="text-2xs text-muted">
                {activeViewMode === "desktop" ? "580px (Largura padrão)" : "375px (Mobile)"}
              </span>
            </Card.Header>
            <Card.Content className="p-4 flex-1 overflow-auto bg-background-secondary/40 flex justify-center items-start">
              <div
                className={cn(
                  "h-full rounded-xl overflow-hidden shadow-sm border border-border bg-white transition-all duration-300",
                  activeViewMode === "desktop" ? "w-full max-w-[580px]" : "w-[375px]",
                )}
              >
                <iframe
                  srcDoc={livePreviewHtml}
                  title="Prévia do E-mail"
                  className="w-full h-full min-h-[520px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Send Test Email Modal */}
      <Modal.Root isOpen={testModalOpen} onOpenChange={setTestModalOpen}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>Disparo de Teste</Modal.Header>
              <Modal.Body className="space-y-4">
                <p className="text-xs text-muted">
                  Envie uma cópia de teste deste modelo para verificar a renderização real no seu leitor de e-mails (Gmail, Outlook, Apple Mail).
                </p>

                <TextField
                  value={testEmailRecipient}
                  onChange={setTestEmailRecipient}
                  isRequired
                >
                  <Label className="text-xs font-semibold">E-mail Destinatário de Teste</Label>
                  <Input type="email" placeholder="seu-email@dominio.com" />
                </TextField>

                <div className="rounded-xl border border-border bg-background-secondary p-3 text-xs space-y-1">
                  <span className="font-semibold text-foreground">Assunto Gerado:</span>
                  <p className="text-muted italic">{interpolateVariables(subject, sampleData)}</p>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onClick={() => setTestModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSendTest}
                  isDisabled={isSendingTest}
                  className="gap-2 font-bold"
                >
                  {isSendingTest ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
                  <span>Enviar E-mail de Teste</span>
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        title="Restaurar layout original"
        description={`Deseja realmente restaurar o modelo "${templates[selectedType]?.name || "selecionado"}" para o layout original? As customizações atuais serão perdidas.`}
        confirmLabel="Restaurar padrão"
        variant="warning"
        onConfirm={handleConfirmReset}
      />
    </div>
  );
}
