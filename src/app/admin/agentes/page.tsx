"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Copy,
  Edit3,
  Eye,
  ExternalLink,
  MessageSquare,
  Plus,
  Star,
  Timer,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Label,
  ListBox,
  ListBoxItem,
  SearchField,
  Select,
  Skeleton,
  Table,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/editorial";
import { AgentAvatar } from "@/components/agentes/AgentAvatar";
import { AgentPreviewModal } from "@/components/admin/agentes/AgentPreviewModal";
import { AgentDeleteDialog } from "@/components/admin/agentes/AgentDeleteDialog";
import { useAgentCatalog } from "@/contexts/AgentCatalogContext";
import { normalizeText } from "@/lib/agentChat";
import { collectScriptWarnings } from "@/lib/agentDraft";
import type { Agent, AgentStatus } from "@/types/agente";

/** Alerta de roteiro na linha do agente, com o motivo no tooltip. */
function ScriptWarningBadge({ warnings }: { warnings: { id: string; message: string }[] }) {
  if (warnings.length === 0) return null;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger>
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-warning">
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          {warnings.length} {warnings.length === 1 ? "alerta" : "alertas"}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content className="max-w-xs">
        <ul className="list-disc space-y-1 pl-4 text-left">
          {warnings.map((warning) => (
            <li key={warning.id}>{warning.message}</li>
          ))}
        </ul>
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

const toneForStatus = (status: AgentStatus) => {
  switch (status) {
    case "Disponível":
      return "positive" as const;
    case "Beta":
      return "primary" as const;
    case "Em manutenção":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
};

export default function AdminAgentesPage() {
  const router = useRouter();
  const {
    agents,
    isLoaded,
    saveAgent,
    duplicateAgent,
    deleteAgent,
  } = useAgentCatalog();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [previewAgent, setPreviewAgent] = useState<Agent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(agents.map((agent) => agent.category))),
    [agents],
  );

  const filteredAgents = useMemo(() => {
    const term = normalizeText(search.trim());
    return agents.filter((agent) => {
      const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || agent.category === categoryFilter;
      const haystack = normalizeText(
        `${agent.name} ${agent.role} ${agent.description} ${agent.courseTitle} ${(agent.courseTitles || []).join(" ")} ${(agent.planNames || []).join(" ")} ${agent.createdBy} ${agent.skills.join(" ")}`,
      );
      return matchesStatus && matchesCategory && (!term || haystack.includes(term));
    });
  }, [agents, categoryFilter, search, statusFilter]);

  const availableCount = agents.filter((agent) => agent.status === "Disponível").length;
  const maintenanceCount = agents.filter((agent) => agent.status === "Em manutenção").length;
  const betaCount = agents.filter((agent) => agent.status === "Beta").length;
  const scriptedReplies = agents.reduce((total, agent) => total + agent.replies.length, 0);

  /*
   * Avisos de roteiro por agente. É o que separa "publicado" de "funcionando":
   * um agente pode estar no ar e ainda assim responder fallback ao próprio botão
   * de sugestão que o admin escreveu.
   */
  const warningsByAgent = useMemo(
    () => new Map(agents.map((agent) => [agent.id, collectScriptWarnings(agent)])),
    [agents],
  );
  const withWarningsCount = Array.from(warningsByAgent.values()).filter(
    (warnings) => warnings.length > 0,
  ).length;

  const statusFilters: { id: AgentStatus | "all"; label: string; count: number }[] = [
    { id: "all", label: "Todos", count: agents.length },
    { id: "Disponível", label: "Disponíveis", count: availableCount },
    { id: "Beta", label: "Beta", count: betaCount },
    { id: "Em manutenção", label: "Manutenção", count: maintenanceCount },
  ];

  const isFiltering = search.trim() !== "" || statusFilter !== "all" || categoryFilter !== "all";

  const openCreate = () => {
    router.push("/admin/agentes/new");
  };

  const openEdit = (agent: Agent) => {
    router.push(`/admin/agentes/${agent.id}`);
  };

  const handleDelete = (id: string) => {
    deleteAgent(id);
    setDeleteTarget(null);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Agentes de IA"
        title="Agentes da escola"
        description="Assistentes publicados pelos admins de curso. Cada agente responde pelo roteiro escrito aqui — saudação, sugestões de partida, respostas por palavra-chave e as saídas de fallback."
        actions={
          <>
            <Button variant="outline" onClick={() => window.open("/agentes", "_blank")}>
              <ExternalLink className="size-4" aria-hidden="true" />
              Ver página pública
            </Button>
            <Button variant="primary" onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              Novo agente
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Agentes publicados"
          value={agents.length.toString()}
          helper={`${availableCount} disponíveis para os alunos`}
          icon={Bot}
          tone="primary"
        />
        <StatCard
          label="Respostas roteirizadas"
          value={scriptedReplies.toString()}
          helper="Somadas em todos os agentes"
          icon={MessageSquare}
          tone="sage"
        />
        <StatCard
          label="Com alerta de roteiro"
          value={withWarningsCount.toString()}
          helper={
            withWarningsCount === 0
              ? "Todos os roteiros estão coerentes"
              : "Respondem fallback onde não deveriam"
          }
          icon={AlertTriangle}
          tone={withWarningsCount > 0 ? "terracotta" : "neutral"}
        />
        <StatCard
          label="Em manutenção"
          value={maintenanceCount.toString()}
          helper="Fora do ar, com aviso ao aluno"
          icon={Wrench}
          tone="terracotta"
        />
      </div>

      <Card>
        <Card.Header className="flex flex-col gap-4 border-b border-separator pb-5 md:flex-row md:items-end md:justify-between">
          <SearchField value={search} onChange={setSearch} className="w-full md:w-80">
            <Label>Buscar agentes</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Nome, curso, habilidade…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="flex w-full flex-wrap items-end gap-3 md:w-auto">
            <Select
              selectedKey={categoryFilter}
              onSelectionChange={(key) => setCategoryFilter(String(key))}
              className="w-full sm:w-52"
            >
              <Label>Categoria</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {[{ id: "all", label: "Todas as categorias" }, ...categories.map((item) => ({ id: item, label: item }))].map(
                    (option) => (
                      <ListBoxItem key={option.id} id={option.id}>
                        {option.label}
                      </ListBoxItem>
                    ),
                  )}
                </ListBox>
              </Select.Popover>
            </Select>

            <ToggleButtonGroup
              aria-label="Filtrar por status"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={new Set([statusFilter])}
              onSelectionChange={(keys) => {
                const [first] = Array.from(keys);
                if (first) setStatusFilter(first as AgentStatus | "all");
              }}
              size="sm"
            >
              {statusFilters.map((filter) => (
                <ToggleButton key={filter.id} id={filter.id}>
                  {filter.label} ({filter.count})
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
        </Card.Header>

        <Card.Content className="p-0">
          {/* Esqueleto, não estado vazio: uma lista em branco por um frame leria como catálogo apagado. */}
          {!isLoaded ? (
            <ul className="divide-y divide-separator">
              {[0, 1, 2, 3].map((row) => (
                <li key={row} className="flex items-center gap-3 p-4">
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48 rounded-md" />
                    <Skeleton className="h-3 w-32 rounded-md" />
                  </div>
                </li>
              ))}
            </ul>
          ) : filteredAgents.length === 0 ? (
            <EmptyState className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="grid size-14 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <Bot className="size-7" aria-hidden="true" />
              </span>
              <h3 className="font-display text-lg font-bold text-foreground">Nenhum agente encontrado</h3>
              <p className="max-w-md text-sm text-muted">
                {isFiltering
                  ? "Nenhum agente atende à busca ou aos filtros selecionados."
                  : "Publique o primeiro agente da escola e ele aparece em /agentes para os alunos."}
              </p>
              {isFiltering ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Limpar busca e filtros
                </Button>
              ) : (
                <Button variant="primary" onClick={openCreate}>
                  <Plus className="size-4" aria-hidden="true" />
                  Criar primeiro agente
                </Button>
              )}
            </EmptyState>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Agentes de IA">
                      <Table.Header>
                        <Table.Column isRowHeader>Agente</Table.Column>
                        <Table.Column>Origem</Table.Column>
                        <Table.Column>Roteiro</Table.Column>
                        <Table.Column>Uso</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>Ações</Table.Column>
                      </Table.Header>
                      <Table.Body items={filteredAgents}>
                        {(agent: Agent) => (
                          <Table.Row id={agent.id}>
                            <Table.Cell>
                              <div className="flex max-w-xs items-start gap-3">
                                <AgentAvatar
                                  avatar={agent.avatar}
                                  themeColor={agent.themeColor}
                                  iconSvg={agent.iconSvg}
                                  photoUrl={agent.photoUrl}
                                  size="sm"
                                  isMuted={agent.status === "Em manutenção"}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                                  <p className="truncate text-xs text-muted">{agent.role}</p>
                                  <div className="mt-1.5">
                                    <Chip color="default" variant="soft" size="sm">
                                      {agent.category}
                                    </Chip>
                                  </div>
                                </div>
                              </div>
                            </Table.Cell>

                            <Table.Cell>
                              <p className="max-w-[210px] truncate text-sm font-medium text-accent">
                                {agent.courseTitles && agent.courseTitles.length > 0
                                  ? agent.courseTitles.length === 1
                                    ? agent.courseTitles[0]
                                    : `${agent.courseTitles[0]} (+${agent.courseTitles.length - 1})`
                                  : agent.courseTitle || "Acesso Geral"}
                              </p>
                              {agent.planNames && agent.planNames.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <Chip color="accent" variant="soft" size="sm" className="text-[10px] py-0 px-1.5">
                                    {agent.planNames.length === 1
                                      ? agent.planNames[0]
                                      : `${agent.planNames[0]} (+${agent.planNames.length - 1})`}
                                  </Chip>
                                </div>
                              )}
                              <p className="mt-1 text-xs text-muted">por {agent.createdBy}</p>
                              <p className="mt-0.5 font-mono text-[11px] text-muted">/agentes/{agent.slug}</p>
                            </Table.Cell>

                            <Table.Cell>
                              <div className="space-y-1 text-xs text-muted">
                                <p>
                                  <span className="font-semibold text-foreground" data-numeric>
                                    {agent.replies.length}
                                  </span>{" "}
                                  respostas
                                </p>
                                <p>
                                  <span data-numeric>{agent.starters.length}</span> sugestões ·{" "}
                                  <span data-numeric>{agent.fallbacks.length}</span> fallbacks
                                </p>
                                <ScriptWarningBadge warnings={warningsByAgent.get(agent.id) ?? []} />
                              </div>
                            </Table.Cell>

                            <Table.Cell>
                              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                <MessageSquare className="size-3.5 text-muted" aria-hidden="true" />
                                <span data-numeric>{agent.conversationsCount.toLocaleString("pt-BR")}</span>
                              </div>
                              <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
                                <span className="flex items-center gap-1">
                                  <Star className="size-3 text-warning" aria-hidden="true" />
                                  <span data-numeric>{agent.rating > 0 ? agent.rating.toFixed(1) : "—"}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Timer className="size-3" aria-hidden="true" />
                                  <span data-numeric>{agent.avgMinutes}</span> min
                                </span>
                              </div>
                            </Table.Cell>

                            <Table.Cell>
                              <StatusBadge tone={toneForStatus(agent.status)}>{agent.status}</StatusBadge>
                              {agent.status === "Em manutenção" && agent.unavailableNote && (
                                <p className="mt-1 max-w-[160px] line-clamp-2 text-xs text-muted">
                                  {agent.unavailableNote}
                                </p>
                              )}
                            </Table.Cell>

                            <Table.Cell>
                              <div className="flex justify-end gap-1">
                                <Tooltip.Root>
                                  <Tooltip.Trigger>
                                    <Button
                                      isIconOnly
                                      variant="ghost"
                                      size="sm"
                                      aria-label={`Prévia de ${agent.name}`}
                                      onClick={() => setPreviewAgent(agent)}
                                    >
                                      <Eye className="size-4" aria-hidden="true" />
                                    </Button>
                                  </Tooltip.Trigger>
                                  <Tooltip.Content>Prévia e teste do roteiro</Tooltip.Content>
                                </Tooltip.Root>

                                <Tooltip.Root>
                                  <Tooltip.Trigger>
                                    <Button
                                      isIconOnly
                                      variant="ghost"
                                      size="sm"
                                      aria-label={`Duplicar ${agent.name}`}
                                      onClick={() => duplicateAgent(agent.id)}
                                    >
                                      <Copy className="size-4" aria-hidden="true" />
                                    </Button>
                                  </Tooltip.Trigger>
                                  <Tooltip.Content>Duplicar em manutenção</Tooltip.Content>
                                </Tooltip.Root>

                                <Tooltip.Root>
                                  <Tooltip.Trigger>
                                    <Button
                                      isIconOnly
                                      variant="ghost"
                                      size="sm"
                                      aria-label={`Editar ${agent.name}`}
                                      onClick={() => openEdit(agent)}
                                    >
                                      <Edit3 className="size-4" aria-hidden="true" />
                                    </Button>
                                  </Tooltip.Trigger>
                                  <Tooltip.Content>Editar agente e roteiro</Tooltip.Content>
                                </Tooltip.Root>

                                <Tooltip.Root>
                                  <Tooltip.Trigger>
                                    <Button
                                      isIconOnly
                                      variant="danger-soft"
                                      size="sm"
                                      aria-label={`Excluir ${agent.name}`}
                                      onClick={() => setDeleteTarget(agent)}
                                    >
                                      <Trash2 className="size-4" aria-hidden="true" />
                                    </Button>
                                  </Tooltip.Trigger>
                                  <Tooltip.Content>Excluir agente</Tooltip.Content>
                                </Tooltip.Root>
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              {/* Mobile */}
              <ul className="divide-y divide-separator md:hidden">
                {filteredAgents.map((agent) => (
                  <li key={agent.id} className="space-y-3 p-4">
                    <div className="flex items-start gap-3">
                      <AgentAvatar
                        avatar={agent.avatar}
                        themeColor={agent.themeColor}
                        iconSvg={agent.iconSvg}
                        photoUrl={agent.photoUrl}
                        isMuted={agent.status === "Em manutenção"}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base leading-snug font-semibold text-foreground">
                            {agent.name}
                          </h3>
                          <StatusBadge tone={toneForStatus(agent.status)}>{agent.status}</StatusBadge>
                        </div>
                        <p className="text-sm text-muted">{agent.role}</p>
                        <div className="mt-1.5">
                          <Chip color="default" variant="soft" size="sm">
                            {agent.category}
                          </Chip>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted">{agent.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-accent font-medium">
                            {agent.courseTitles && agent.courseTitles.length > 0
                              ? agent.courseTitles.join(", ")
                              : agent.courseTitle || "Acesso Geral"}
                          </span>
                          {agent.planNames && agent.planNames.length > 0 && (
                            <Chip color="accent" variant="soft" size="sm" className="text-[10px] py-0 px-1.5">
                              {agent.planNames.join(", ")}
                            </Chip>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3.5" aria-hidden="true" />
                        <span data-numeric>{agent.replies.length}</span> respostas
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="size-3.5" aria-hidden="true" />
                        <span data-numeric>{agent.conversationsCount.toLocaleString("pt-BR")}</span> conversas
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="size-3.5" aria-hidden="true" />
                        <span data-numeric>{agent.avgMinutes}</span> min
                      </span>
                      <ScriptWarningBadge warnings={warningsByAgent.get(agent.id) ?? []} />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(agent)} className="flex-1">
                        <Edit3 className="size-4" aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="sm"
                        aria-label={`Prévia de ${agent.name}`}
                        onClick={() => setPreviewAgent(agent)}
                      >
                        <Eye className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="sm"
                        aria-label={`Duplicar ${agent.name}`}
                        onClick={() => duplicateAgent(agent.id)}
                      >
                        <Copy className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        isIconOnly
                        variant="danger-soft"
                        size="sm"
                        aria-label={`Excluir ${agent.name}`}
                        onClick={() => setDeleteTarget(agent)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card.Content>
      </Card>

      <AgentPreviewModal agent={previewAgent} onClose={() => setPreviewAgent(null)} />

      <AgentDeleteDialog
        agent={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
