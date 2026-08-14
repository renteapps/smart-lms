"use client";

import { use, useMemo, useState } from "react";
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

// Dados realistas de telemetria e conversas simulando milhares de atendimentos
const GENERATED_MOCK_CONVERSATIONS: AgentConversation[] = [
  {
    id: "conv-101",
    agentId: "ag-feedback",
    studentName: "João Silva",
    studentEmail: "joao.silva@empresa.com",
    studentAvatar: "JS",
    title: "Como estruturar feedback sobre entregas fora do prazo",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 min atrás
    updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    status: "resolvida",
    sentiment: "positivo",
    rating: 5,
    durationSeconds: 340,
    tokensUsed: 1240,
    courseTitle: "Feedback que Transforma",
    lessonContext: "Módulo 2: Fato vs. Julgamento",
    aiSummary: "O aluno aprendeu a separar atrasos concretos de julgamentos de caráter. Estruturou 3 perguntas para a reunião.",
    messages: [
      { id: "m1", author: "agent", text: "Oi! Sou a Bea. Me conta o que aconteceu do seu jeito, sem filtro — e a gente transforma isso numa conversa que a outra pessoa consegue ouvir." },
      { id: "m2", author: "student", text: "Preciso dar um feedback para um colega que sempre entrega os relatórios atrasados, mas tenho medo dele ficar na defensiva." },
      { id: "m3", author: "agent", text: "Dar feedback para pares exige cuidado para não soar como cobrança de chefia, mas sim alinhamento de impacto. Me conta: qual foi o fato concreto da última entrega?" },
      { id: "m4", author: "student", text: "O relatório financeiro era para sexta 18h e ele mandou terça de manhã sem avisar antes." },
      { id: "m5", author: "agent", text: "Perfeito! Esse é o fato cru. Agora, qual foi o impacto concreto disso na sua rotina ou no cliente?" },
      { id: "m6", author: "student", text: "Tive que cancelar minha folga de sábado para consolidar os dados antes da reunião de segunda com a diretoria." },
      { id: "m7", author: "agent", text: "Excelente. Você tem a estrutura perfeita:\n\n1. O fato: 'Na sexta passada, a entrega combinada para as 18h chegou na terça de manhã sem aviso prévio.'\n2. O impacto: 'Com isso, precisei trabalhar no sábado para não atrasar a diretoria.'\n3. O pedido: 'Podemos combinar que, se houver imprevisto, você me avise até às 14h da data prevista?'\n\nComo você se sente lendo essa proposta?" },
      { id: "m8", author: "student", text: "Ficou muito claro e sem nenhuma agressividade! Vou usar exatamente esse roteiro. Obrigado, Bea!" }
    ],
  },
  {
    id: "conv-102",
    agentId: "ag-feedback",
    studentName: "Mariana Souza",
    studentEmail: "mariana.souza@techcorp.io",
    studentAvatar: "MS",
    title: "Gestor cortou minha fala na reunião com a diretoria",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min atrás
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: "resolvida",
    sentiment: "positivo",
    rating: 5,
    durationSeconds: 420,
    tokensUsed: 1580,
    courseTitle: "Feedback que Transforma",
    lessonContext: "Módulo 4: Conversas com Lideranças",
    aiSummary: "Aluna ensaiou alinhamento 1:1 com o gestor focando no objetivo comum de alinhamento com a diretoria.",
    messages: [
      { id: "m1", author: "agent", text: "Oi! Sou a Bea. Me conta o que aconteceu do seu jeito, sem filtro — e a gente transforma isso numa conversa que a outra pessoa consegue ouvir." },
      { id: "m2", author: "student", text: "Meu gestor me interrompeu grosseiramente na frente de todos os diretores hoje de manhã. Fiquei com muita raiva." },
      { id: "m3", author: "agent", text: "Entendo profundamente a sua frustração. Passar por isso em público é desestabilizador. Antes de falar com ele, vamos esfriar a emoção e focar no combinado. O que você gostaria que tivesse acontecido?" },
      { id: "m4", author: "student", text: "Gostaria que ele tivesse me deixado concluir a explicação dos dados e, se tivesse ressalvas, falasse depois." },
      { id: "m5", author: "agent", text: "Muito legítimo. Em um 1:1 reservado, experimente abrir assim: 'Na reunião de hoje, quando fui interrompida no slide 4, fiquei com a sensação de que a mensagem aos diretores ficou incompleta. Como podemos alinhar as falas antes para que tenhamos uma postura unificada?' O que acha?" },
      { id: "m6", author: "student", text: "Adorei a abordagem de trazer como 'postura unificada'. Tira o tom de ataque." }
    ],
  },
  {
    id: "conv-103",
    agentId: "ag-feedback",
    studentName: "Carlos Eduardo",
    studentEmail: "carlos.edu@startup.com",
    studentAvatar: "CE",
    title: "Dúvida sobre aplicação em feedback de demissão",
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3h atrás
    updatedAt: new Date(Date.now() - 1000 * 60 * 165).toISOString(),
    status: "duvida_pedagogica",
    sentiment: "neutro",
    rating: 4,
    durationSeconds: 290,
    tokensUsed: 980,
    courseTitle: "Feedback que Transforma",
    lessonContext: "Módulo 5: Encerramento de Ciclos",
    aiSummary: "Esclarecimento de que a conversa de demissão não é momento de feedback longo, mas sim de comunicação respeitosa e direta.",
    messages: [
      { id: "m1", author: "agent", text: "Oi! Sou a Bea. Me conta o que aconteceu do seu jeito, sem filtro." },
      { id: "m2", author: "student", text: "Posso usar a técnica de 3 perguntas na hora de demitir uma pessoa?" },
      { id: "m3", author: "agent", text: "Cuidado! Na conversa de desligamento, a decisão já foi tomada. Não é momento de pedir planos de ação ou ensinar o processo. A comunicação deve ser direta, humana, objetiva e transparente, sem abrir espaço para falsas esperanças de reversão." }
    ],
  },
  {
    id: "conv-104",
    agentId: "ag-feedback",
    studentName: "Patrícia Lima",
    studentEmail: "patricia.lima@logistica.com.br",
    studentAvatar: "PL",
    title: "A pessoa começou a chorar no meio do feedback",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6h atrás
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5.8).toISOString(),
    status: "resolvida",
    sentiment: "positivo",
    rating: 5,
    durationSeconds: 510,
    tokensUsed: 1840,
    courseTitle: "Feedback que Transforma",
    lessonContext: "Módulo 3: Reações Emocionais",
    aiSummary: "Instruções práticas sobre como acolher o choro com silêncio empático sem voltar atrás no combinado.",
    messages: [
      { id: "m1", author: "agent", text: "Oi! Sou a Bea. Me conta o que aconteceu do seu jeito." },
      { id: "m2", author: "student", text: "Fui dar um feedback e a liderada começou a chorar copiosamente. Fiquei sem saber o que fazer e quase pedi desculpas." },
      { id: "m3", author: "agent", text: "Reação muito comum quando nos importamos com as pessoas. O choro é descarga emocional, não necessariamente manipulação ou motivo para você cancelar o feedback. O que você fez logo em seguida?" }
    ],
  },
  {
    id: "conv-105",
    agentId: "ag-feedback",
    studentName: "Roberto Ramos",
    studentEmail: "roberto.r@financas.org",
    studentAvatar: "RR",
    title: "IA sugeriu mensagem muito formal para equipe jovem",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 dia atrás
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 23.8).toISOString(),
    status: "atencao",
    sentiment: "critico",
    rating: 2,
    durationSeconds: 180,
    tokensUsed: 750,
    courseTitle: "Feedback que Transforma",
    lessonContext: "Módulo 1: Tom de Voz",
    aiSummary: "Aluno achou o vocabulário muito corporativo para um time ágil de estagiários. Recomendado ajuste no prompt de tom de voz.",
    messages: [
      { id: "m1", author: "agent", text: "Oi! Sou a Bea. Me conta o que aconteceu do seu jeito." },
      { id: "m2", author: "student", text: "Seu texto sugerido parece uma notificação jurídica. Meu time tem 22 anos e joga videogame comigo. Preciso de algo mais natural." },
      { id: "m3", author: "agent", text: "Tem toda razão! Vamos calibrar para uma linguagem mais leve e direta de time ágil." }
    ],
  },
  {
    id: "conv-106",
    agentId: "ag-feedback",
    studentName: "Fernanda Albuquerque",
    studentEmail: "fernanda.a@design.co",
    studentAvatar: "FA",
    title: "Revisão de mensagem de feedback via Slack",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 27.8).toISOString(),
    status: "resolvida",
    sentiment: "positivo",
    rating: 5,
    durationSeconds: 310,
    tokensUsed: 1100,
    courseTitle: "Feedback que Transforma",
    lessonContext: "Módulo 4: Comunicação Assíncrona",
    aiSummary: "Revisão de texto para Slack eliminando ambiguidades e evitando interpretação de passivo-agressividade.",
    messages: [
      { id: "m1", author: "agent", text: "Oi! Sou a Bea. Me conta o que aconteceu do seu jeito." },
      { id: "m2", author: "student", text: "Posso mandar feedback importante pelo chat ou só por chamada de vídeo?" },
      { id: "m3", author: "agent", text: "Se for corretivo ou delicado, sempre prefira voz ou vídeo para não perder tom e expressão. Use o chat apenas para registrar os combinados já conversados!" }
    ],
  },
];

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

  // Conversa selecionada
  const [selectedId, setSelectedId] = useState<string>(GENERATED_MOCK_CONVERSATIONS[0]?.id ?? "");
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Filtragem
  const filteredConversations = useMemo(() => {
    return GENERATED_MOCK_CONVERSATIONS.filter((conv) => {
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

      return true;
    });
  }, [searchQuery, statusFilter, sentimentFilter, ratingFilter]);

  // Paginação aplicada
  const totalPages = Math.max(1, Math.ceil(filteredConversations.length / ITEMS_PER_PAGE));
  const paginatedConversations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredConversations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredConversations, currentPage]);

  const selectedConversation = useMemo(() => {
    return GENERATED_MOCK_CONVERSATIONS.find((c) => c.id === selectedId) || filteredConversations[0] || null;
  }, [selectedId, filteredConversations]);

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
    toast.success("Exportação iniciada! O arquivo CSV com as sessões filtradas será baixado.");
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
                  {agent?.aiModel || "GPT-4o Mini"}
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
                1.284
              </p>
              <p className="mt-1 text-[11px] text-success font-medium">↑ 14% vs mês anterior</p>
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
                96.4%
              </p>
              <p className="mt-1 text-[11px] text-muted">Sem transbordo pedagógico</p>
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
                4.8 / 5.0
              </p>
              <p className="mt-1 text-[11px] text-muted">842 avaliações no período</p>
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
                5.2 min
              </p>
              <p className="mt-1 text-[11px] text-muted">~4.2 mensagens por sessão</p>
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
                      <strong className="text-foreground">{selectedConversation.tokensUsed || 1100}</strong> tokens (~$0.003)
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Timer className="size-3.5" />
                      {Math.round((selectedConversation.durationSeconds || 300) / 60)} min de conversa
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
