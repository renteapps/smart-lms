"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  ShoppingBag,
  Link as LinkIcon,
  Clock,
  Tag,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  UserCheck,
  AlertCircle,
  HelpCircle,
  Wand2,
  RefreshCw,
  Eye,
  Settings2,
} from "lucide-react";
import {
  DYNAMIC_VARIABLES,
  DEFAULT_SAMPLE_CONTACT,
  resolveDynamicSalesUrl,
  validateSalesUrl,
  generatePlatformPresetUrl,
  getCourseSalesConfig,
  saveCourseSalesConfig,
  type CourseSalesConfig,
  type IntegracaoOferta,
  type PlataformaCheckout,
  type SalesContactContext,
  type DynamicVariableCategory,
} from "@/lib/salesUrlHelper";

export default function AdminCursoVendasPage() {
  const params = useParams();
  const id = params.id as string;

  // Estados principais do formulário
  const [salesUrl, setSalesUrl] = useState<string>("");
  const [salesPageUrl, setSalesPageUrl] = useState<string>("");
  const [primaryPlatform, setPrimaryPlatform] = useState<PlataformaCheckout>("eduzz");
  const [integracoes, setIntegracoes] = useState<IntegracaoOferta[]>([]);

  // Estados de simulação / contato de teste
  const [sampleContact, setSampleContact] = useState<SalesContactContext>(DEFAULT_SAMPLE_CONTACT);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedIntegrationId, setCopiedIntegrationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"link_principal" | "integracoes" | "guia">("link_principal");

  // Estados de feedback
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Referência para o input principal para inserção no cursor
  const salesUrlInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados salvos do localStorage
  useEffect(() => {
    if (!id) return;
    const config = getCourseSalesConfig(id);
    setSalesUrl(config.salesUrl || "");
    setSalesPageUrl(config.salesPageUrl || "");
    setPrimaryPlatform(config.primaryPlatform || "eduzz");
    setIntegracoes(
      config.integracoes && config.integracoes.length > 0
        ? config.integracoes
        : [
            {
              id: Date.now().toString(),
              plataforma: "eduzz",
              produtoId: "123456",
              codigoOferta: "OFERTA_PADRAO",
              tempoAcesso: "365",
              customCheckoutUrl: "https://sun.eduzz.com/123456?email={{contact.email}}&name={{contact.name}}&cel={{contact.phone}}",
            },
          ]
    );
    setHasLoaded(true);
  }, [id]);

  // Inserir tag dinâmica na posição atual do cursor no input principal
  const insertVariableIntoSalesUrl = (tag: string) => {
    const input = salesUrlInputRef.current;
    if (!input) {
      setSalesUrl((prev) => (prev ? `${prev}&param=${tag}` : tag));
      return;
    }

    const start = input.selectionStart ?? salesUrl.length;
    const end = input.selectionEnd ?? salesUrl.length;
    const currentText = salesUrl;

    const newText = currentText.substring(0, start) + tag + currentText.substring(end);
    setSalesUrl(newText);

    // Reposiciona o cursor após a inserção
    setTimeout(() => {
      input.focus();
      const newCursorPos = start + tag.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Inserir tag em uma integração específica
  const insertVariableIntoIntegration = (index: number, tag: string) => {
    const currentUrl = integracoes[index]?.customCheckoutUrl || "";
    const updatedUrl = currentUrl ? `${currentUrl}${currentUrl.includes("?") ? "&" : "?"}param=${tag}` : tag;
    handleIntegrationChange(index, "customCheckoutUrl", updatedUrl);
  };

  // Manipular mudanças nas integrações
  const handleIntegrationChange = (index: number, field: keyof IntegracaoOferta, value: string) => {
    const updated = [...integracoes];
    updated[index] = { ...updated[index], [field]: value };
    setIntegracoes(updated);
  };

  // Adicionar integração
  const addIntegracao = () => {
    const newId = Date.now().toString() + Math.random().toString().slice(2, 6);
    setIntegracoes([
      ...integracoes,
      {
        id: newId,
        plataforma: "hotmart",
        produtoId: "",
        codigoOferta: "",
        tempoAcesso: "365",
        customCheckoutUrl: "",
      },
    ]);
  };

  // Remover integração
  const removeIntegracao = (idToRemove: string) => {
    setIntegracoes(integracoes.filter((int) => int.id !== idToRemove));
  };

  // Aplicar preset de URL por plataforma no link principal
  const applyPlatformPreset = (platform: PlataformaCheckout) => {
    const matchingInt = integracoes.find((i) => i.plataforma === platform);
    const newUrl = generatePlatformPresetUrl(platform, {
      produtoId: matchingInt?.produtoId || "123456",
      codigoOferta: matchingInt?.codigoOferta || "",
      courseId: id,
    });
    setSalesUrl(newUrl);
    setPrimaryPlatform(platform);
  };

  // Aplicar preset direto na URL da integração
  const applyIntegrationPreset = (index: number) => {
    const int = integracoes[index];
    if (!int) return;
    const generated = generatePlatformPresetUrl(int.plataforma, {
      produtoId: int.produtoId || "123456",
      codigoOferta: int.codigoOferta || "",
      courseId: id,
    });
    handleIntegrationChange(index, "customCheckoutUrl", generated);
  };

  // Salvar configurações
  const handleSave = async () => {
    setIsSaving(true);
    setShowSuccess(false);

    const configToSave: CourseSalesConfig = {
      courseId: id,
      salesUrl,
      salesPageUrl,
      primaryPlatform,
      integracoes,
    };

    // Persiste no localStorage (legado — compatibilidade com outros fluxos)
    saveCourseSalesConfig(id, configToSave);

    // Persiste o sales_url no banco para a vitrine da home do aluno
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("courses")
        .update({ sales_url: salesUrl || null })
        .eq("id", id);
      if (error) {
        console.warn("Erro ao salvar sales_url no banco:", error.message);
      }
    } catch (err) {
      console.error("Falha ao sincronizar sales_url com Supabase:", err);
    }

    await new Promise((resolve) => setTimeout(resolve, 600));

    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3500);
  };

  // Resolver link principal simulado
  const resolvedSalesUrl = resolveDynamicSalesUrl(salesUrl, {
    contact: sampleContact,
    course: {
      id: id,
      title: "Curso #" + id,
      slug: `curso-${id}`,
    },
    tracking: {
      utm_source: "whatsapp",
      utm_campaign: "campanha_vendas",
      coupon_code: "SMART10",
    },
  });

  // Validação da URL principal
  const validation = validateSalesUrl(salesUrl);

  // Copiar URL resolvida
  const handleCopyResolvedUrl = async (urlToCopy: string, integrationId?: string) => {
    try {
      await navigator.clipboard.writeText(urlToCopy);
      if (integrationId) {
        setCopiedIntegrationId(integrationId);
        setTimeout(() => setCopiedIntegrationId(null), 2000);
      } else {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (e) {
      console.error("Falha ao copiar:", e);
    }
  };

  // Categorias de variáveis para exibição organizada
  const categories: { key: DynamicVariableCategory; label: string; tone: string }[] = [
    { key: "contact", label: "Dados do Contato / Lead", tone: "bg-accent-soft/30 text-accent border-accent/20" },
    { key: "course", label: "Dados do Curso", tone: "bg-success-soft/30 text-success border-success/20" },
    { key: "tracking", label: "Rastreamento & UTMs", tone: "bg-warning-soft/30 text-warning border-warning/20" },
  ];

  if (!hasLoaded) {
    return (
      <div className="max-w-5xl mx-auto py-20 flex flex-col items-center justify-center gap-4 text-center">
        <div className="size-8 rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
        <p className="text-sm text-text-soft">Carregando configurações de vendas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-20 relative">
      {/* Toast de Sucesso */}
      <div
        className={`fixed top-8 right-8 bg-success-soft border border-success/30 text-success px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 transition-all duration-300 z-50 ${
          showSuccess ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
        <div>
          <h4 className="font-bold text-sm text-foreground">Configurações de Vendas Salvas</h4>
          <p className="text-xs text-muted">Links dinâmicos e integrações atualizados com sucesso.</p>
        </div>
      </div>

      {/* Header Fixo */}
      <header className="sticky top-[76px] z-20 -mx-3 flex flex-col gap-4 rounded-xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href={`/admin/cursos/${id}`}
            className="inline-flex items-center gap-2 text-muted hover:text-accent transition-colors text-sm font-medium mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Curso #{id}
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-black text-foreground flex items-center gap-2.5">
            <ShoppingBag className="size-7 text-accent" />
            Vendas e Links Dinâmicos
          </h1>
          <p className="text-muted text-xs md:text-sm mt-0.5">
            Configure o link de checkout e suporte a tags dinâmicas como{" "}
            <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-xs">{"{{contact.name}}"}</code>,{" "}
            <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-xs">{"{{contact.email}}"}</code> e{" "}
            <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-xs">{"{{contact.phone}}"}</code>.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto items-center">
          <Link
            href={`/admin/cursos/${id}`}
            className="flex-1 md:flex-none text-center bg-background-secondary hover:bg-surface-hover text-foreground px-5 py-2.5 rounded-lg font-semibold border border-border transition-all text-sm"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 md:flex-none bg-primary hover:bg-primary-active disabled:opacity-70 disabled:cursor-not-allowed text-primary-foreground px-6 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-all text-sm hover:shadow-md"
          >
            {isSaving ? (
              <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </header>

      {/* Tabs de Navegação da Seção */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("link_principal")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "link_principal"
              ? "border-accent text-accent bg-accent/5 rounded-t-lg"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <LinkIcon className="size-4" />
          Link de Vendas Dinâmico
        </button>
        <button
          onClick={() => setActiveTab("integracoes")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "integracoes"
              ? "border-accent text-accent bg-accent/5 rounded-t-lg"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Settings2 className="size-4" />
          Plataformas & Ofertas ({integracoes.length})
        </button>
        <button
          onClick={() => setActiveTab("guia")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "guia"
              ? "border-accent text-accent bg-accent/5 rounded-t-lg"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <HelpCircle className="size-4" />
          Guia de Parâmetros
        </button>
      </div>

      {/* TAB 1: LINK DE VENDAS PRINCIPAL E SIMULADOR */}
      {activeTab === "link_principal" && (
        <div className="space-y-6">
          {/* Card Principal: Configuração do Link de Vendas */}
          <section className="bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border pb-5">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Wand2 className="size-5 text-accent" />
                  Link de Vendas do Curso (Checkout Dinâmico)
                </h2>
                <p className="text-xs md:text-sm text-muted mt-1">
                  Insira a URL de vendas ou checkout. Clique nas variáveis abaixo para injetar tags que preenchem
                  automaticamente o checkout no disparo de mensagens.
                </p>
              </div>

              {/* Botões de Predefinição Rápida */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-muted mr-1">Gerar formato:</span>
                <button
                  type="button"
                  onClick={() => applyPlatformPreset("eduzz")}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border bg-background hover:border-accent hover:text-accent transition-colors"
                >
                  Eduzz
                </button>
                <button
                  type="button"
                  onClick={() => applyPlatformPreset("hotmart")}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border bg-background hover:border-accent hover:text-accent transition-colors"
                >
                  Hotmart
                </button>
                <button
                  type="button"
                  onClick={() => applyPlatformPreset("kiwify")}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border bg-background hover:border-accent hover:text-accent transition-colors"
                >
                  Kiwify
                </button>
                <button
                  type="button"
                  onClick={() => applyPlatformPreset("stripe")}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border bg-background hover:border-accent hover:text-accent transition-colors"
                >
                  Stripe
                </button>
              </div>
            </div>

            {/* Input da URL de Vendas */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-foreground">
                URL de Vendas / Checkout com Tags
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <LinkIcon className="size-4" />
                </div>
                <input
                  ref={salesUrlInputRef}
                  type="text"
                  value={salesUrl}
                  onChange={(e) => setSalesUrl(e.target.value)}
                  placeholder="https://sun.eduzz.com/123456?email={{contact.email}}&name={{contact.name}}&cel={{contact.phone}}"
                  className="w-full bg-background-secondary border border-border rounded-xl pl-10 pr-24 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent font-mono transition-all"
                />
                {salesUrl && (
                  <button
                    type="button"
                    onClick={() => setSalesUrl("")}
                    className="absolute inset-y-0 right-3 flex items-center text-xs text-muted hover:text-danger transition-colors font-sans"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Status de validação */}
              {salesUrl && !validation.isValid && (
                <div className="flex items-center gap-1.5 text-xs text-danger mt-1.5 font-medium">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{validation.error}</span>
                </div>
              )}
              {salesUrl && validation.isValid && (
                <div className="flex items-center gap-1.5 text-xs text-success mt-1.5 font-medium">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>
                    URL válida {validation.hasDynamicTags ? "com tags dinâmicas detectadas." : "sem tags dinâmicas."}
                  </span>
                </div>
              )}
            </div>

            {/* Inserir Variáveis Dinâmicas (Chips Clicáveis) */}
            <div className="bg-background-secondary/70 border border-border/80 rounded-xl p-4 md:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-accent" />
                  Tags Dinâmicas (Clique para inserir na URL)
                </h3>
                <span className="text-[11px] text-muted">Inserção automática na posição do cursor</span>
              </div>

              <div className="space-y-3">
                {categories.map((cat) => {
                  const vars = DYNAMIC_VARIABLES.filter((v) => v.category === cat.key);
                  if (vars.length === 0) return null;

                  return (
                    <div key={cat.key} className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-muted">{cat.label}</div>
                      <div className="flex flex-wrap gap-2">
                        {vars.map((v) => (
                          <button
                            key={v.tag}
                            type="button"
                            onClick={() => insertVariableIntoSalesUrl(v.tag)}
                            title={`${v.description} (Exemplo: ${v.example})`}
                            className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium bg-background hover:bg-accent-soft/20 hover:border-accent hover:text-accent transition-all active:scale-95 shadow-2xs"
                          >
                            <span className="font-mono text-accent group-hover:underline">{v.tag}</span>
                            <span className="text-[10px] text-muted group-hover:text-foreground">({v.label})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Página de Vendas Institucional (Opcional) */}
            <div className="pt-2 border-t border-border">
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                URL da Página de Vendas / Landing Page (Opcional)
              </label>
              <input
                type="text"
                value={salesPageUrl}
                onChange={(e) => setSalesPageUrl(e.target.value)}
                placeholder="https://minhaescola.com/cursos/inteligencia-emocional"
                className="w-full bg-background-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
              />
              <p className="text-xs text-muted mt-1">
                Link da página descritiva do curso antes do checkout (útil para botões de "Saiba Mais").
              </p>
            </div>
          </section>

          {/* SIMULADOR EM TEMPO REAL (LIVE PREVIEW) */}
          <section className="bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-accent/20 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <Eye className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    Simulador & Prévia do Link Gerado
                    <span className="bg-success-soft text-success text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Ao Vivo
                    </span>
                  </h3>
                  <p className="text-xs text-muted">
                    Veja como a URL final será montada quando enviada para um contato real.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSampleContact(DEFAULT_SAMPLE_CONTACT)}
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground font-medium px-2 py-1 rounded transition-colors"
                >
                  <RefreshCw className="size-3" />
                  Restaurar Exemplo
                </button>
              </div>
            </div>

            {/* Inputs do Contato Simulado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-background-secondary/50 p-4 rounded-xl border border-border">
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">
                  Nome Simulado
                </label>
                <input
                  type="text"
                  value={sampleContact.name || ""}
                  onChange={(e) =>
                    setSampleContact((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">
                  E-mail Simulado
                </label>
                <input
                  type="email"
                  value={sampleContact.email || ""}
                  onChange={(e) =>
                    setSampleContact((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">
                  Telefone Simulado
                </label>
                <input
                  type="text"
                  value={sampleContact.phone || ""}
                  onChange={(e) =>
                    setSampleContact((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">
                  CPF / Doc Simulado
                </label>
                <input
                  type="text"
                  value={sampleContact.document || ""}
                  onChange={(e) =>
                    setSampleContact((prev) => ({ ...prev, document: e.target.value }))
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Resultado Resolvido */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Resultado da URL Final:</span>
                <span className="text-[11px] text-muted">
                  Caracteres especiais codificados com segurança (URL Encoded)
                </span>
              </div>

              <div className="bg-background-secondary border border-border rounded-xl p-3.5 font-mono text-xs text-foreground break-all select-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-inner">
                <span className="text-accent">{resolvedSalesUrl || "(Nenhum link configurado ainda)"}</span>

                {resolvedSalesUrl && (
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => handleCopyResolvedUrl(resolvedSalesUrl)}
                      className="inline-flex items-center gap-1.5 bg-background hover:bg-surface-hover text-foreground border border-border px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-2xs"
                    >
                      {isCopied ? (
                        <>
                          <Check className="size-3.5 text-success" />
                          <span className="text-success">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5 text-muted" />
                          <span>Copiar URL</span>
                        </>
                      )}
                    </button>

                    <a
                      href={resolvedSalesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-foreground px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-2xs"
                    >
                      <ExternalLink className="size-3.5" />
                      <span>Testar Link</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: INTEGRAÇÕES & OFERTAS ESPECÍFICAS */}
      {activeTab === "integracoes" && (
        <div className="space-y-6">
          {/* Aviso de Planos */}
          <div className="bg-accent-soft/20 border border-accent/20 rounded-xl p-5 flex items-start gap-3.5">
            <div className="text-accent mt-0.5">
              <ShoppingBag className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-foreground text-sm">Nota sobre Planos de Assinatura</h4>
              <p className="text-muted text-xs md:text-sm mt-1">
                Se um aluno adquirir este curso através de um <strong>Plano de Assinatura</strong>, o tempo de acesso
                será determinado pela vigência do plano, ignorando o "Tempo de Acesso" configurado abaixo.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Settings2 className="size-5 text-accent" />
                Conexões & Links por Oferta
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Configure múltiplos checkouts para webhooks e links dedicados de campanhas.
              </p>
            </div>
            <button
              type="button"
              onClick={addIntegracao}
              className="text-sm font-semibold text-accent hover:text-accent-hover flex items-center gap-1.5 transition-colors bg-accent/10 hover:bg-accent/20 px-3.5 py-2 rounded-lg"
            >
              <Plus className="size-4" />
              Adicionar Integração
            </button>
          </div>

          {integracoes.length === 0 && (
            <div className="bg-surface rounded-2xl p-10 text-center border border-border border-dashed space-y-3">
              <ShoppingBag className="size-10 text-muted mx-auto" />
              <p className="text-muted text-sm">Nenhuma integração ou oferta configurada no momento.</p>
              <button
                type="button"
                onClick={addIntegracao}
                className="mt-2 text-sm font-semibold text-accent hover:text-accent-hover inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="size-4" />
                Adicionar a Primeira Integração
              </button>
            </div>
          )}

          {/* Lista de Integrações */}
          <div className="space-y-5">
            {integracoes.map((config, index) => {
              const intResolvedUrl = resolveDynamicSalesUrl(config.customCheckoutUrl || "", {
                contact: sampleContact,
                course: { id, title: `Curso #${id}` },
              });

              return (
                <section
                  key={config.id}
                  className="bg-surface rounded-2xl p-6 md:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border space-y-6 relative group"
                >
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                      <span className="size-7 rounded-full bg-background-secondary flex items-center justify-center text-xs font-bold text-foreground">
                        {index + 1}
                      </span>
                      <h3 className="font-bold text-sm text-foreground">
                        {config.plataforma.toUpperCase()} — {config.produtoId || "Oferta sem ID"}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeIntegracao(config.id)}
                      className="text-muted hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-danger/10"
                      title="Remover Integração"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase text-muted mb-1.5">Plataforma</label>
                      <select
                        value={config.plataforma}
                        onChange={(e) => handleIntegrationChange(index, "plataforma", e.target.value as PlataformaCheckout)}
                        className="w-full bg-background-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent transition-all"
                      >
                        <option value="eduzz">Eduzz</option>
                        <option value="hotmart">Hotmart</option>
                        <option value="kiwify">Kiwify</option>
                        <option value="stripe">Stripe</option>
                        <option value="custom">Personalizado (Outro)</option>
                        <option value="nenhuma">Nenhuma (Venda Interna)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-muted mb-1.5">ID do Produto</label>
                      <input
                        type="text"
                        value={config.produtoId}
                        onChange={(e) => handleIntegrationChange(index, "produtoId", e.target.value)}
                        className="w-full bg-background-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent transition-all"
                        placeholder="Ex: 1234567"
                      />
                      <p className="text-[11px] text-muted mt-1">Identificador na plataforma de pagamento.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                        Código de Oferta / Cupom (Opcional)
                      </label>
                      <input
                        type="text"
                        value={config.codigoOferta}
                        onChange={(e) => handleIntegrationChange(index, "codigoOferta", e.target.value)}
                        className="w-full bg-background-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent transition-all"
                        placeholder="Ex: OFERTA_VIP_2026"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-muted mb-1.5 flex items-center gap-1.5">
                        <Clock className="size-3.5 text-muted" />
                        Tempo de Acesso (Dias)
                      </label>
                      <input
                        type="number"
                        value={config.tempoAcesso}
                        onChange={(e) => handleIntegrationChange(index, "tempoAcesso", e.target.value)}
                        className="w-full bg-background-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent transition-all"
                        placeholder="Ex: 365"
                      />
                    </div>
                  </div>

                  {/* Checkout específico da oferta com suporte a tags dinâmicas */}
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase text-muted">
                        Link de Checkout Dinâmico desta Oferta (Opcional)
                      </label>
                      <button
                        type="button"
                        onClick={() => applyIntegrationPreset(index)}
                        className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1"
                      >
                        <Wand2 className="size-3" />
                        Gerar Formato {config.plataforma.toUpperCase()}
                      </button>
                    </div>

                    <input
                      type="text"
                      value={config.customCheckoutUrl || ""}
                      onChange={(e) => handleIntegrationChange(index, "customCheckoutUrl", e.target.value)}
                      placeholder={`https://sun.eduzz.com/${config.produtoId || "123"}?email={{contact.email}}&name={{contact.name}}`}
                      className="w-full bg-background-secondary border border-border rounded-xl px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-accent transition-all"
                    />

                    {/* Chips rápidos */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-muted">Inserir tag:</span>
                      {["{{contact.name}}", "{{contact.email}}", "{{contact.phone}}", "{{contact.document}}"].map(
                        (tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => insertVariableIntoIntegration(index, tag)}
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-border bg-background hover:border-accent hover:text-accent transition-colors"
                          >
                            {tag}
                          </button>
                        )
                      )}
                    </div>

                    {/* Preview da oferta */}
                    {config.customCheckoutUrl && (
                      <div className="mt-2 p-2.5 rounded-lg bg-background border border-border/70 text-[11px] font-mono flex items-center justify-between gap-2">
                        <span className="truncate text-accent">{intResolvedUrl}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyResolvedUrl(intResolvedUrl, config.id)}
                          className="shrink-0 text-muted hover:text-foreground p-1"
                          title="Copiar URL desta oferta"
                        >
                          {copiedIntegrationId === config.id ? (
                            <Check className="size-3.5 text-success" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: GUIA DE PARÂMETROS POR PLATAFORMA */}
      {activeTab === "guia" && (
        <div className="space-y-6">
          <section className="bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border space-y-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <HelpCircle className="size-5 text-accent" />
                Guia de Parâmetros de Checkout por Plataforma
              </h2>
              <p className="text-xs md:text-sm text-muted mt-1">
                Veja como preencher os dados dos seus leads automaticamente nos links de checkout das principais plataformas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Eduzz */}
              <div className="p-5 rounded-xl border border-border bg-background-secondary/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">Eduzz (Sun Checkout)</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-accent-soft text-accent">
                    Suporta Autofill
                  </span>
                </div>
                <ul className="text-xs space-y-1.5 text-muted">
                  <li><strong className="text-foreground">email:</strong> E-mail do comprador (<code className="text-accent">{"{{contact.email}}"}</code>)</li>
                  <li><strong className="text-foreground">name:</strong> Nome completo (<code className="text-accent">{"{{contact.name}}"}</code>)</li>
                  <li><strong className="text-foreground">cel:</strong> Telefone celular com DDD (<code className="text-accent">{"{{contact.phone}}"}</code>)</li>
                  <li><strong className="text-foreground">doc:</strong> CPF ou CNPJ (<code className="text-accent">{"{{contact.document}}"}</code>)</li>
                  <li><strong className="text-foreground">cupom:</strong> Cupom de desconto</li>
                </ul>
                <div className="pt-2">
                  <div className="text-[11px] font-mono p-2 bg-background rounded border border-border text-muted break-all">
                    https://sun.eduzz.com/123456?email={"{{contact.email}}"}&name={"{{contact.name}}"}&cel={"{{contact.phone}}"}
                  </div>
                </div>
              </div>

              {/* Hotmart */}
              <div className="p-5 rounded-xl border border-border bg-background-secondary/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">Hotmart Pay</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-accent-soft text-accent">
                    Suporta Autofill
                  </span>
                </div>
                <ul className="text-xs space-y-1.5 text-muted">
                  <li><strong className="text-foreground">email:</strong> E-mail do aluno (<code className="text-accent">{"{{contact.email}}"}</code>)</li>
                  <li><strong className="text-foreground">name:</strong> Nome completo (<code className="text-accent">{"{{contact.name}}"}</code>)</li>
                  <li><strong className="text-foreground">phone_checkout:</strong> Telefone com DDD (<code className="text-accent">{"{{contact.phone}}"}</code>)</li>
                  <li><strong className="text-foreground">doc:</strong> CPF/CNPJ (<code className="text-accent">{"{{contact.document}}"}</code>)</li>
                  <li><strong className="text-foreground">off:</strong> Código da oferta</li>
                </ul>
                <div className="pt-2">
                  <div className="text-[11px] font-mono p-2 bg-background rounded border border-border text-muted break-all">
                    https://pay.hotmart.com/XYZ?email={"{{contact.email}}"}&name={"{{contact.name}}"}&phone_checkout={"{{contact.phone}}"}
                  </div>
                </div>
              </div>

              {/* Kiwify */}
              <div className="p-5 rounded-xl border border-border bg-background-secondary/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">Kiwify</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-accent-soft text-accent">
                    Suporta Autofill
                  </span>
                </div>
                <ul className="text-xs space-y-1.5 text-muted">
                  <li><strong className="text-foreground">email:</strong> E-mail do lead (<code className="text-accent">{"{{contact.email}}"}</code>)</li>
                  <li><strong className="text-foreground">name:</strong> Nome do lead (<code className="text-accent">{"{{contact.name}}"}</code>)</li>
                  <li><strong className="text-foreground">phone:</strong> Telefone com DDD (<code className="text-accent">{"{{contact.phone}}"}</code>)</li>
                  <li><strong className="text-foreground">document:</strong> CPF/CNPJ (<code className="text-accent">{"{{contact.document}}"}</code>)</li>
                </ul>
                <div className="pt-2">
                  <div className="text-[11px] font-mono p-2 bg-background rounded border border-border text-muted break-all">
                    https://checkout.kiwify.com.br/abc?email={"{{contact.email}}"}&name={"{{contact.name}}"}&phone={"{{contact.phone}}"}
                  </div>
                </div>
              </div>

              {/* Stripe & Custom */}
              <div className="p-5 rounded-xl border border-border bg-background-secondary/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">Stripe / Custom Checkout</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-accent-soft text-accent">
                    Customizável
                  </span>
                </div>
                <ul className="text-xs space-y-1.5 text-muted">
                  <li><strong className="text-foreground">prefilled_email:</strong> E-mail (Stripe Payment Links)</li>
                  <li><strong className="text-foreground">utm_source:</strong> Origem da campanha</li>
                  <li><strong className="text-foreground">utm_campaign:</strong> Identificador do anúncio/disparo</li>
                  <li><strong className="text-foreground">course_id:</strong> ID do curso (<code className="text-accent">{"{{course.id}}"}</code>)</li>
                </ul>
                <div className="pt-2">
                  <div className="text-[11px] font-mono p-2 bg-background rounded border border-border text-muted break-all">
                    https://buy.stripe.com/abc?prefilled_email={"{{contact.email}}"}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
