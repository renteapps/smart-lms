"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "sonner";
import { type LucideIcon } from "lucide-react";
import {
  FileCode,
  Sparkles,
  Send,
  RotateCcw,
  Search,
  Tag,
  ArrowLeft,
  Mail,
  Shield,
  Award,
  CreditCard,
  Bell,
  Clock,
  X,
  RefreshCw,
} from "lucide-react";
import { CustomEmailTemplate, EmailTemplateType } from "@/types/resend";
import {
  getCustomTemplates,
  getDefaultTemplateDefinitions,
  resetCustomTemplate,
} from "@/lib/emailTemplates";

const TEMPLATE_ICONS: Record<EmailTemplateType, LucideIcon> = {
  welcome: Mail,
  password_reset: Shield,
  course_enrollment: Sparkles,
  certificate: Award,
  subscription: CreditCard,
  inactivity: Clock,
  notification: Bell,
  test: Send,
};

export default function ResendModelosCatalogPage() {
  const [templates, setTemplates] = useState<Record<string, CustomEmailTemplate>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "platform" | "notification" | "customized">("all");

  // Quick Test Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testTemplate, setTestTemplate] = useState<EmailTemplateType>("welcome");
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTemplates() {
      try {
        const res = await fetch("/api/admin/integracoes/resend");
        const data = await res.json();
        if (isMounted && data.success && data.templates) {
          setTemplates(data.templates);
        } else if (isMounted) {
          setTemplates(getCustomTemplates());
        }
      } catch {
        if (isMounted) {
          setTemplates(getCustomTemplates());
        }
      }
    }

    loadTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleReset = async (type: EmailTemplateType, name: string) => {
    if (!confirm(`Deseja restaurar o modelo "${name}" para o HTML original do sistema?`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/integracoes/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_template", templateType: type }),
      });

      const data = await res.json();
      if (data.success && data.template) {
        setTemplates((prev) => ({ ...prev, [type]: data.template }));
        toast.success(`Modelo "${name}" restaurado para o padrão!`);
      } else {
        const reset = resetCustomTemplate(type);
        setTemplates((prev) => ({ ...prev, [type]: reset }));
        toast.success(`Modelo "${name}" restaurado!`);
      }
    } catch {
      const reset = resetCustomTemplate(type);
      setTemplates((prev) => ({ ...prev, [type]: reset }));
      toast.success(`Modelo restaurado localmente!`);
    }
  };

  const handleQuickTest = async (e: React.FormEvent) => {
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
        body: JSON.stringify({ to: testEmail, template: testTemplate }),
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

  const templateList = Object.values(templates).length > 0
    ? Object.values(templates)
    : getDefaultTemplateDefinitions();

  const filteredTemplates = templateList.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.subject.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (categoryFilter === "all") return true;
    if (categoryFilter === "customized") return tpl.isCustomized;
    return tpl.category === categoryFilter;
  });

  const totalCount = templateList.length;
  const customizedCount = templateList.filter((t) => t.isCustomized).length;
  const platformCount = templateList.filter((t) => t.category === "platform").length;
  const notificationCount = templateList.filter((t) => t.category === "notification").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resend • Studio"
        title="Modelos de E-mail & Templates HTML"
        description="Personalize os e-mails transacionais e notificações. Altere assuntos, prévias, código HTML completo e use tags dinâmicas."
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/admin/integracoes/resend"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-background-secondary transition-colors"
            >
              <ArrowLeft className="size-3.5" /> Voltar para Resend
            </Link>

            <button
              type="button"
              onClick={() => {
                setTestTemplate("welcome");
                setIsTestModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-accent-hover transition-all shadow-sm"
            >
              <Send className="size-3.5" /> Disparar Teste
            </button>
          </div>
        }
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              categoryFilter === "all"
                ? "bg-accent text-primary-foreground shadow-sm"
                : "bg-surface border border-border text-muted hover:text-foreground"
            }`}
          >
            Todos ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("platform")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              categoryFilter === "platform"
                ? "bg-accent text-primary-foreground shadow-sm"
                : "bg-surface border border-border text-muted hover:text-foreground"
            }`}
          >
            Plataforma ({platformCount})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("notification")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              categoryFilter === "notification"
                ? "bg-accent text-primary-foreground shadow-sm"
                : "bg-surface border border-border text-muted hover:text-foreground"
            }`}
          >
            Notificações ({notificationCount})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("customized")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              categoryFilter === "customized"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "bg-surface border border-border text-muted hover:text-foreground"
            }`}
          >
            Customizados ({customizedCount})
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar modelo ou variável..."
            className="w-full min-h-9 rounded-xl border border-border bg-background-secondary pl-9 pr-3 text-xs text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of Template Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((tpl) => {
          const Icon = TEMPLATE_ICONS[tpl.type] || Mail;

          return (
            <div
              key={tpl.type}
              className="editorial-card p-5 flex flex-col justify-between space-y-4 hover:border-accent/50 transition-all hover:shadow-md group"
            >
              <div className="space-y-3">
                {/* Header: Icon & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="size-10 rounded-xl bg-primary-soft text-accent grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="size-5" />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-background-secondary text-muted uppercase tracking-wider">
                      {tpl.category === "platform" ? "Plataforma" : "Notificação"}
                    </span>
                    {tpl.isCustomized ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-soft text-accent">
                        Customizado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-background-secondary text-muted">
                        Padrão
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-accent transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">
                    {tpl.description}
                  </p>
                </div>

                {/* Subject Preview */}
                <div className="p-2.5 rounded-xl border border-border/60 bg-background-secondary text-xs space-y-1">
                  <span className="text-[10px] font-bold text-muted uppercase font-sans">
                    Assunto Padrão:
                  </span>
                  <p className="font-mono text-[11px] text-foreground truncate" title={tpl.subject}>
                    {tpl.subject}
                  </p>
                </div>

                {/* Variables Preview Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                    <Tag className="size-3" /> Tags Dinâmicas
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tpl.variables.slice(0, 4).map((v) => (
                      <span
                        key={v.tag}
                        className="px-1.5 py-0.5 rounded bg-surface border border-border/70 text-[10px] font-mono text-muted"
                        title={`${v.label}: ${v.description}`}
                      >
                        {v.tag}
                      </span>
                    ))}
                    {tpl.variables.length > 4 && (
                      <span className="px-1.5 py-0.5 rounded bg-background-secondary text-[10px] font-mono text-muted">
                        +{tpl.variables.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTestTemplate(tpl.type);
                      setIsTestModalOpen(true);
                    }}
                    className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-background-secondary transition-colors"
                    title="Disparar teste deste modelo"
                  >
                    <Send className="size-3.5" />
                  </button>

                  {tpl.isCustomized && (
                    <button
                      type="button"
                      onClick={() => handleReset(tpl.type, tpl.name)}
                      className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                      title="Restaurar layout original"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                  )}
                </div>

                <Link
                  href={`/admin/integracoes/resend/modelos/${tpl.type}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-bold text-primary-foreground hover:bg-accent-hover transition-all shadow-sm"
                >
                  <FileCode className="size-3.5" /> Editar HTML & Tags →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Test Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary-soft text-accent grid place-items-center">
                  <Send className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Disparo de E-mail de Teste</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleQuickTest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">E-mail de Destino</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="seu-email@teste.com"
                  required
                  className="w-full min-h-10 rounded-xl border border-border bg-background-secondary px-3 text-foreground placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">Modelo Selecionado</label>
                <select
                  value={testTemplate}
                  onChange={(e) => setTestTemplate(e.target.value as EmailTemplateType)}
                  className="w-full min-h-10 rounded-xl border border-border bg-background-secondary px-3 text-foreground focus:border-accent focus:bg-surface focus:outline-none font-medium"
                >
                  {templateList.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 font-semibold text-foreground hover:bg-background-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="flex-1 rounded-xl bg-accent py-2.5 font-bold text-primary-foreground hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSendingTest ? <RefreshCw className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Disparar Teste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
