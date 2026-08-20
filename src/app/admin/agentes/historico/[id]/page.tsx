"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Brain,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Filter,
  History,
  Layers,
  MessageSquare,
  MessagesSquare,
  RefreshCw,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  Timer,
  User,
  X,
  Zap,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Label,
  ListBox,
  ListBoxItem,
  SearchField,
  Select,
  Separator,
  toast,
} from "@heroui/react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { AgentAvatar } from "@/components/agentes/AgentAvatar";
import { useAgentCatalog } from "@/contexts/AgentCatalogContext";
import type {
  Agent,
  AgentConversation,
  ConversationSentiment,
  ConversationStatus,
} from "@/types/agente";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getAgentConversations } from "@/lib/data/agents";

// Tipos de Filtro
type PeriodOption = "hoje" | "7dias" | "mes" | "tudo";
type StatusFilter = "todos" | ConversationStatus;
type SentimentFilter = "todos" | ConversationSentiment;

const STATUS_CONFIG: Record<
  ConversationStatus,
  { label: string; tone: "positive" | "warning" | "negative" | "primary"; chipColor: "success" | "warning" | "danger" | "accent" }
> = {
  resolvida: { label: "Resolvida", tone: "positive", chipColor: "success" },
  em_andamento: { label: "Em andamento", tone: "primary", chipColor: "accent" },
  atencao: { label: "Atenção / Crítica", tone: "negative", chipColor: "danger" },
  duvida_pedagogica: { label: "Dúvida de Conteúdo", tone: "warning", chipColor: "warning" },
};

export default function AgentHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { agents, isLoaded } = useAgentCatalog();

  const agent = useMemo(() => {
    return agents.find((a) => a.id === id || a.slug === id) || null;
  }, [id, agents]);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [periodFilter, setPeriodFilter] = useState<PeriodOption>("mes");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("todos");
  const [ratingFilter, setRatingFilter] = useState<string>("todas");

  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  // Conversa selecionada
  const [selectedId, setSelectedId] = useState<string>("");
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    if (!agent) return;
    let active = true;

    async function loadConversations() {
      setIsLoadingConversations(true);
      const supabase = createClient();
      try {
        const data = await getAgentConversations(supabase, agent!.id);
        if (!active) return;
        setConversations(data);
        if (data.length > 0) {
          setSelectedId((current) => current || data[0].id);
        }
      } catch (e) {
        console.error("Erro ao buscar conversas", e);
      } finally {
        if (active) setIsLoadingConversations(false);
      }
    }

    loadConversations();
    return () => {
      active = false;
    };
  }, [agent]);

  // Filtragem
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // Busca texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = conv.studentName?.toLowerCase().includes(query);
        const matchesEmail = conv.studentEmail?.toLowerCase().includes(query);
        const matchesTitle = conv.title.toLowerCase().includes(query);
        const matchesMessages = conv.messages.some((m) => m.text.toLowerCase().includes(query));
        if (!matchesName && !matchesEmail && !matchesTitle && !matchesMessages) {
          return false;
        }
      }

      // Status
      if (statusFilter !== "todos" && conv.status !== statusFilter) {
        return false;
      }

      // Sentimento
      if (sentimentFilter !== "todos" && conv.sentiment !== sentimentFilter) {
        return false;
      }

      // Rating
      if (ratingFilter !== "todas") {
        const minRating = parseInt(ratingFilter, 10);
        if ((conv.rating ?? 0) < minRating) return false;
      }

      // Período
      if (periodFilter !== "tudo") {
        const created = new Date(conv.createdAt);
        const now = new Date();
        if (periodFilter === "hoje") {
          if (created.toDateString() !== now.toDateString()) return false;
        } else if (periodFilter === "7dias") {
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (created < sevenDaysAgo) return false;
        } else if (periodFilter === "mes") {
          if (created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [conversations, searchQuery, statusFilter, sentimentFilter, ratingFilter, periodFilter]);

  /** Métricas reais derivadas das conversas carregadas — nada fabricado. */
  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = conversations.filter((c) => {
      const d = new Date(c.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = conversations.filter((c) => {
      const d = new Date(c.createdAt);
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    });
    const monthGrowthPct =
      lastMonth.length > 0 ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100) : null;

    const withStatus = conversations.filter((c) => c.status);
    const resolvedPct =
      withStatus.length > 0
        ? Math.round((withStatus.filter((c) => c.status === "resolvida").length / withStatus.length) * 100)
        : null;

    const rated = conversations.filter((c) => typeof c.rating === "number");
    const avgRating =
      rated.length > 0 ? rated.reduce((sum, c) => sum + (c.rating ?? 0), 0) / rated.length : null;

    const timed = conversations.filter((c) => typeof c.durationSeconds === "number");
    const avgMinutes =
      timed.length > 0
        ? timed.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0) / timed.length / 60
        : null;
    const avgMessages =
      conversations.length > 0
        ? conversations.reduce((sum, c) => sum + (c.messageCount ?? c.messages.length), 0) / conversations.length
        : null;

    return {
      totalCount: conversations.length,
      monthCount: thisMonth.length,
      monthGrowthPct,
      resolvedPct,
      avgRating,
      ratedCount: rated.length,
      avgMinutes,
      avgMessages,
    };
  }, [conversations]);

  // Paginação aplicada
  const totalPages = Math.max(1, Math.ceil(filteredConversations.length / ITEMS_PER_PAGE));
  const paginatedConversations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredConversations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredConversations, currentPage]);

  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedId) || filteredConversations[0] || null;
  }, [selectedId, filteredConversations, conversations]);

  const handleCopyTranscript = () => {
    if (!selectedConversation) return;
    const text = selectedConversation.messages
      .map((m) => `[${m.author === "student" ? "ALUNO" : "AGENTE"}]: ${m.text}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    toast.success("Transcrição completa copiada!");
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleExportCSV = () => {
    if (filteredConversations.length === 0) {
      toast.danger("Nenhuma sessão para exportar com os filtros atuais.");
      return;
    }

    const header = ["Data", "Aluno", "E-mail", "Título", "Status", "Sentimento", "Nota", "Mensagens"];
    const rows = filteredConversations.map((conv) => [
      new Date(conv.createdAt).toLocaleString("pt-BR"),
      conv.studentName ?? "",
      conv.studentEmail ?? "",
      conv.title,
      conv.status ?? "",
      conv.sentiment ?? "",
      conv.rating != null ? String(conv.rating) : "",
      String(conv.messageCount ?? conv.messages.length),
    ]);
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");

    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historico-${agent?.slug || id}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`${filteredConversations.length} sessões exportadas em CSV.`);
  };

  if (!isLoaded) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* ---------------- Breadcrumb & Context Header ---------------- */}
      <div className="flex flex-col gap-4 border-b border-border pb-6">
        <nav aria-label="Navegação hierárquica" className="flex items-center gap-2 text-xs font-medium text-muted">
          <Link href="/admin/agentes" className="transition-colors hover:text-foreground">
            Admin
          </Link>
          <span>/</span>
          <Link href="/admin/agentes" className="transition-colors hover:text-foreground">
            Agentes de IA
          </Link>
          <span>/</span>
          <Link href={`/admin/agentes/${agent?.id || id}`} className="transition-colors hover:text-foreground">
            {agent?.name || "Agente"}
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Histórico & Sessões</span>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {agent ? (
              <AgentAvatar avatar={agent.avatar} size="lg" isMuted={agent.status === "Em manutenção"} />
            ) : (
              <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
                <Bot className="size-7" />
              </span>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Histórico de Conversas: {agent?.name || "Agente"}
                </h1>
                {agent && <StatusBadge tone={agent.status === "Disponível" ? "positive" : "warning"}>{agent.status}</StatusBadge>}
                <Chip color="default" variant="soft" size="sm" className="hidden sm:inline-flex">
                  <Brain className="mr-1 size-3 text-accent" />
                  {agent?.aiModel || "Modelo não definido"}
                </Chip>
              </div>
              <p className="mt-1 text-sm text-muted">
                Monitore a qualidade das respostas, diagnostique dúvidas recorrentes e calibre o Prompt com base em dados reais.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="secondary" onClick={() => router.push(`/admin/agentes/${agent?.id || id}`)}>
              <Settings className="size-4 mr-1.5" />
              Configurar Prompt & IA
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="size-4 mr-1.5" />
              Exportar Relatório
            </Button>
          </div>
        </div>
      </div>

      {/* ---------------- StatCards de Telemetria de Alto Volume ---------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-surface shadow-xs">
          <Card.Content className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Volume Mensal</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground" data-numeric>
                {kpis.monthCount.toLocaleString("pt-BR")}
              </p>
              <p
                className={cn(
                  "mt-1 text-[11px] font-medium",
                  kpis.monthGrowthPct === null
                    ? "text-muted"
                    : kpis.monthGrowthPct >= 0
                      ? "text-success"
                      : "text-danger",
                )}
              >
                {kpis.monthGrowthPct === null
                  ? `${kpis.totalCount} conversas no total`
                  : `${kpis.monthGrowthPct >= 0 ? "↑" : "↓"} ${Math.abs(kpis.monthGrowthPct)}% vs mês anterior`}
              </p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
              <MessagesSquare className="size-6" />
            </span>
          </Card.Content>
        </Card>

        <Card className="border-border bg-surface shadow-xs">
          <Card.Content className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Taxa de Resolução</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground" data-numeric>
                {kpis.resolvedPct === null ? "—" : `${kpis.resolvedPct}%`}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {kpis.resolvedPct === null ? "Nenhuma sessão classificada ainda" : "Marcadas como resolvida"}
              </p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success-soft-foreground">
              <CheckCircle2 className="size-6" />
            </span>
          </Card.Content>
        </Card>

        <Card className="border-border bg-surface shadow-xs">
          <Card.Content className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">CSAT / Nota Média</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground" data-numeric>
                {kpis.avgRating === null ? "—" : `${kpis.avgRating.toFixed(1)} / 5.0`}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {kpis.ratedCount > 0 ? `${kpis.ratedCount} avaliações no período` : "Nenhuma avaliação ainda"}
              </p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-warning-soft text-warning-soft-foreground">
              <Star className="size-6 fill-warning" />
            </span>
          </Card.Content>
        </Card>

        <Card className="border-border bg-surface shadow-xs">
          <Card.Content className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Tempo Médio</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground" data-numeric>
                {kpis.avgMinutes === null ? "—" : `${kpis.avgMinutes.toFixed(1)} min`}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {kpis.avgMessages === null ? "Sem sessões registradas" : `~${kpis.avgMessages.toFixed(1)} mensagens por sessão`}
              </p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-default text-default-foreground">
              <Timer className="size-6" />
            </span>
          </Card.Content>
        </Card>
      </div>

      {/* ---------------- Barra de Busca e Filtros Dinâmicos ---------------- */}
      <Card className="border-border bg-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* SearchField */}
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full sm:max-w-md"
              aria-label="Buscar conversas"
            >
              <Label className="sr-only">Buscar por aluno, e-mail ou assunto</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Buscar por aluno, e-mail ou assunto..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>

            {/* Select Status */}
            <Select
              selectedKey={statusFilter}
              onSelectionChange={(k) => setStatusFilter(String(k) as StatusFilter)}
              className="w-full sm:w-48"
              aria-label="Filtrar por status"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBoxItem id="todos">Todos os Status</ListBoxItem>
                  <ListBoxItem id="resolvida">Resolvida</ListBoxItem>
                  <ListBoxItem id="em_andamento">Em andamento</ListBoxItem>
                  <ListBoxItem id="atencao">Atenção / Crítica</ListBoxItem>
                  <ListBoxItem id="duvida_pedagogica">Dúvida de Conteúdo</ListBoxItem>
                </ListBox>
              </Select.Popover>
            </Select>

            {/* Select Período */}
            <Select
              selectedKey={periodFilter}
              onSelectionChange={(k) => setPeriodFilter(String(k) as PeriodOption)}
              className="w-full sm:w-44"
              aria-label="Filtrar por período"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBoxItem id="hoje">Hoje</ListBoxItem>
                  <ListBoxItem id="7dias">Últimos 7 dias</ListBoxItem>
                  <ListBoxItem id="mes">Este Mês</ListBoxItem>
                  <ListBoxItem id="tudo">Todo o Histórico</ListBoxItem>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <span data-numeric className="font-semibold text-foreground">
              {filteredConversations.length}
            </span>{" "}
            sessões encontradas
            {(searchQuery || statusFilter !== "todos" || periodFilter !== "mes") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("todos");
                  setPeriodFilter("mes");
                  setSentimentFilter("todos");
                }}
                className="text-xs text-accent"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ---------------- Layout Master-Detail (Split View) ---------------- */}
      {filteredConversations.length === 0 ? (
        <Card className="border-border bg-surface py-16 text-center">
          <EmptyState className="flex flex-col items-center gap-3">
            <span className="grid size-14 place-items-center rounded-2xl bg-background-secondary text-muted">
              <Search className="size-6" />
            </span>
            <h3 className="font-display text-lg font-bold text-foreground">Nenhuma conversa encontrada</h3>
            <p className="text-sm text-muted max-w-md mx-auto">
              Nenhum diálogo corresponde aos termos ou filtros selecionados. Tente ajustar os parâmetros de busca.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("todos");
                setPeriodFilter("mes");
              }}
            >
              Restaurar busca
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ========================================================================= */}
          {/* PAINEL ESQUERDO: LISTA DE SESSÕES (Master) */}
          {/* ========================================================================= */}
          <div className="space-y-4 lg:col-span-5">
            <ul className="space-y-3">
              {paginatedConversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                const statusCfg = conv.status ? STATUS_CONFIG[conv.status] : STATUS_CONFIG.resolvida;

                return (
                  <li
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={cn(
                      "group cursor-pointer rounded-2xl border p-4.5 transition-all",
                      isSelected
                        ? "border-accent bg-accent-soft/30 shadow-sm ring-1 ring-accent"
                        : "border-border bg-surface hover:border-accent/40 hover:bg-surface-hover",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar size="sm" color={isSelected ? "accent" : "default"}>
                          <Avatar.Fallback>{conv.studentAvatar || "AL"}</Avatar.Fallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">
                            {conv.studentName || "Aluno"}
                          </p>
                          <p className="text-[11px] text-muted truncate max-w-[180px]">
                            {conv.studentEmail || "aluno@email.com"}
                          </p>
                        </div>
                      </div>

                      <Chip color={statusCfg.chipColor} variant="soft" size="sm" className="text-[10px]">
                        {statusCfg.label}
                      </Chip>
                    </div>

                    <h4 className="mt-2.5 text-xs font-bold text-foreground line-clamp-1">{conv.title}</h4>

                    <p className="mt-1 text-[11px] leading-relaxed text-muted line-clamp-2">
                      {conv.messages[conv.messages.length - 1]?.text || "Sem mensagens"}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px] text-muted">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3" />
                        <span>
                          {new Date(conv.createdAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>•</span>
                        <span data-numeric>{conv.messages.length} msgs</span>
                      </div>

                      {conv.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="size-3 text-warning fill-warning" />
                          <span data-numeric className="font-semibold text-foreground">
                            {conv.rating}
                          </span>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Paginação */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-xs">
              <span className="text-muted">
                Página <strong className="text-foreground">{currentPage}</strong> de {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  isIconOnly
                  size="sm"
                  variant="secondary"
                  isDisabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="secondary"
                  isDisabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PAINEL DIREITO: INSPETOR DA SESSÃO & TRANSCRIÇÃO (Detail) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7">
            {selectedConversation ? (
              <Card className="border-border bg-surface shadow-sm sticky top-6">
                {/* Header da Transcrição */}
                <Card.Header className="border-b border-border bg-background-secondary/30 pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-bold text-foreground">
                          {selectedConversation.title}
                        </h3>
                        {selectedConversation.status && (
                          <Chip
                            color={STATUS_CONFIG[selectedConversation.status].chipColor}
                            variant="soft"
                            size="sm"
                            className="text-[10px]"
                          >
                            {STATUS_CONFIG[selectedConversation.status].label}
                          </Chip>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span>
                          Aluno: <strong className="text-foreground">{selectedConversation.studentName}</strong> (
                          {selectedConversation.studentEmail})
                        </span>
                        <span>•</span>
                        <span>{selectedConversation.lessonContext || "Aula Geral"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={handleCopyTranscript}>
                        {copiedTranscript ? (
                          <>
                            <Check className="size-3.5 text-success mr-1" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5 mr-1" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card.Header>

                {/* Resumo Diagnóstico da IA */}
                {selectedConversation.aiSummary && (
                  <div className="border-b border-border bg-accent-soft/20 px-6 py-3 text-xs flex items-start gap-2.5">
                    <Sparkles className="size-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-accent-soft-foreground">Diagnóstico Pedagógico Automático:</span>
                      <p className="text-foreground/90 mt-0.5 leading-relaxed">{selectedConversation.aiSummary}</p>
                    </div>
                  </div>
                )}

                {/* Container de Mensagens do Chat */}
                <Card.Content className="p-6">
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {selectedConversation.messages.map((msg) => {
                      const isStudent = msg.author === "student";
                      return (
                        <div
                          key={msg.id}
                          className={cn("flex items-start gap-3", isStudent ? "justify-end" : "justify-start")}
                        >
                          {!isStudent && (
                            <AgentAvatar avatar={agent?.avatar || "feedback"} size="sm" className="mt-1" />
                          )}

                          <div
                            className={cn(
                              "max-w-[82%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs",
                              isStudent
                                ? "bg-accent text-accent-foreground rounded-br-sm"
                                : "bg-background-secondary border border-border text-foreground rounded-bl-sm",
                            )}
                          >
                            <div className="text-[10px] font-bold opacity-75 mb-1 uppercase tracking-wider flex items-center justify-between gap-4">
                              <span>{isStudent ? selectedConversation.studentName : agent?.name || "Agente"}</span>
                            </div>
                            <p className="whitespace-pre-line">{msg.text}</p>
                          </div>

                          {isStudent && (
                            <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground text-xs font-bold shrink-0 mt-1">
                              {selectedConversation.studentAvatar || "AL"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card.Content>

                {/* Telemetria e Rodapé da Sessão */}
                <Card.Footer className="border-t border-border bg-background-secondary/40 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1">
                      <Cpu className="size-3.5 text-accent" />
                      <strong className="text-foreground">
                        {selectedConversation.tokensUsed ? selectedConversation.tokensUsed.toLocaleString("pt-BR") : "—"}
                      </strong>{" "}
                      tokens
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Timer className="size-3.5" />
                      {selectedConversation.durationSeconds
                        ? `${Math.round(selectedConversation.durationSeconds / 60)} min de conversa`
                        : "Duração não registrada"}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      router.push(`/admin/agentes/${agent?.id || id}`);
                      toast.info("Ajuste as instruções do agente para cobrir os pontos observados nesta conversa.");
                    }}
                  >
                    <Settings className="size-3.5 mr-1" />
                    Calibrar Prompt com essa Sessão
                  </Button>
                </Card.Footer>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
