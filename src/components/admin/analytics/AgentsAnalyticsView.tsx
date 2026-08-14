"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Download,
  MessageSquare,
  Sparkles,
  Star,
  ThumbsUp,
  Zap,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Label,
  ProgressBar,
  SearchField,
  Table,
  Tabs,
} from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import {
  MetricCard,
  PeriodSelector,
  SimpleBarChart,
  type TimePeriod,
} from "@/components/admin/analytics/AnalyticsComponents";
import { MOCK_AGENTS_ANALYTICS } from "@/lib/mocks/analyticsMocks";
import { toast } from "sonner";

export function AgentsAnalyticsView({ basePath = "/admin/analises" }: { basePath?: string }) {
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("visao_geral");

  const { kpis, dailyInteractions, agentsRanking, topTopics, recentFeedback } =
    MOCK_AGENTS_ANALYTICS;

  const barChartData = dailyInteractions.map((d) => ({
    label: d.day,
    value: d.messages,
    formattedValue: `${d.messages.toLocaleString("pt-BR")} msgs • ${d.sessions} sessões`,
  }));

  const filteredAgents = agentsRanking.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase()),
  );

  const handleExport = () => {
    toast.success("Exportando métricas de IA...", {
      description: "Relatório de conversas e CSAT dos agentes gerado.",
    });
  };

  return (
    <div className="space-y-8">
      {/* Back Link & Header */}
      <div>
        <Link
          href={basePath}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-3.5" />
          <span>Voltar para Central de Análises</span>
        </Link>
        <PageHeader
          eyebrow="Visão • Agentes de IA"
          title="Análise de Agentes & Tutoria Inteligente"
          description="Acompanhe o volume de conversas, satisfação dos alunos, tempo de resposta e dúvidas mais frequentes."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <PeriodSelector period={period} onChange={setPeriod} />
              <Button variant="outline" size="md" onClick={handleExport} className="gap-2 font-semibold">
                <Download className="size-4" aria-hidden="true" />
                <span>Exportar Relatório</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de IA">
        <MetricCard
          label="Sessões Totais"
          value={kpis.totalSessions.toLocaleString("pt-BR")}
          helper="+27.5% vs mês anterior"
          icon={Bot}
          tone="purple"
          tooltipText="Total de conversas e interações iniciadas pelos alunos com agentes de IA."
          trend={{ value: "+27.5%", isPositive: true }}
          sparklineData={[12, 19, 25, 30, 42, 55, 63, 71, 79, 84]}
        />
        <MetricCard
          label="Mensagens Trocadas"
          value={kpis.totalMessages.toLocaleString("pt-BR")}
          helper="Média de 4.6 msgs por conversa"
          icon={MessageSquare}
          tone="primary"
          tooltipText="Volume bruto de perguntas e respostas processadas pelos modelos."
          trend={{ value: "+34.0%", isPositive: true }}
          sparklineData={[110, 140, 180, 220, 290, 340, 389]}
        />
        <MetricCard
          label="Satisfação (CSAT IA)"
          value={`${kpis.satisfactionRate}%`}
          helper="Resolução de 89.2% na 1ª tentativa"
          icon={ThumbsUp}
          tone="sage"
          tooltipText="Aprovação positiva dos alunos sobre a clareza e utilidade das respostas."
          trend={{ value: "+2.1%", isPositive: true }}
          sparklineData={[88, 90, 91, 92, 93, 94, 94.8]}
        />
        <MetricCard
          label="Tempo de Resposta"
          value={kpis.avgResponseTime}
          helper="Latência média dos modelos"
          icon={Zap}
          tone="terracotta"
          tooltipText="Tempo médio em segundos para geração do primeiro token de resposta."
          trend={{ value: "-0.3s mais rápido", isPositive: true }}
          sparklineData={[1.6, 1.5, 1.4, 1.3, 1.2, 1.1]}
        />
      </section>

      {/* Tabs */}
      <Tabs.Root selectedKey={selectedTab} onSelectionChange={(k) => setSelectedTab(String(k))}>
        <Tabs.List aria-label="Seções da análise de IA">
          <Tabs.Tab id="visao_geral">Visão Geral & Volume</Tabs.Tab>
          <Tabs.Tab id="ranking_agentes">Performance por Agente ({filteredAgents.length})</Tabs.Tab>
          <Tabs.Tab id="topicos">Tópicos Mais Demandados</Tabs.Tab>
          <Tabs.Tab id="feedbacks">Mural de Feedbacks</Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Overview Chart & Topics */}
        <Tabs.Panel id="visao_geral" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <Card.Header className="flex flex-row items-center justify-between pb-2">
                <div>
                  <Card.Title className="font-display text-lg font-bold text-foreground">
                    Volume Diário de Interações
                  </Card.Title>
                  <Card.Description>Mensagens processadas pelos agentes de IA nos últimos dias</Card.Description>
                </div>
                <Chip size="sm" variant="soft" color="accent">
                  Pico às 20h-22h
                </Chip>
              </Card.Header>
              <Card.Content className="pt-4">
                <SimpleBarChart
                  data={barChartData}
                  height={220}
                  valueFormatter={(v) => `${v} mensagens`}
                />
              </Card.Content>
            </Card>

            <Card className="lg:col-span-2 space-y-4">
              <Card.Header className="pb-2">
                <Card.Title className="font-display text-base font-bold text-foreground">
                  Tópicos Mais Demandados
                </Card.Title>
                <Card.Description>Principais intenções dos alunos ao acionar os agentes</Card.Description>
              </Card.Header>
              <Card.Content className="space-y-3 pt-0">
                {topTopics.map((topic) => (
                  <div key={topic.topic} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground truncate pr-2">{topic.topic}</span>
                      <strong className="text-foreground shrink-0">{topic.percentage}%</strong>
                    </div>
                    <ProgressBar
                      aria-label={`Demanda ${topic.topic}`}
                      value={topic.percentage}
                      color="accent"
                    />
                  </div>
                ))}
              </Card.Content>
            </Card>
          </div>
        </Tabs.Panel>

        {/* Tab 2: Agents Ranking Table */}
        <Tabs.Panel id="ranking_agentes" className="space-y-4 pt-4">
          <Card>
            <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Card.Title>Performance por Agente Especialista</Card.Title>
                <Card.Description>Comparativo de sessões, velocidade e aprovação pedagógica</Card.Description>
              </div>

              <SearchField
                value={search}
                onChange={setSearch}
                className="w-full sm:max-w-xs"
                aria-label="Buscar agente"
              >
                <Label className="sr-only">Buscar agente</Label>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Buscar por agente ou papel..." />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
            </Card.Header>

            <Card.Content className="px-0 pb-0 pt-0">
              {filteredAgents.length === 0 ? (
                <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                  <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                    <Bot className="size-5 text-muted" aria-hidden="true" />
                  </span>
                  <p className="font-semibold text-foreground">Nenhum agente encontrado</p>
                  <p className="text-sm text-muted">Ajuste o termo da busca.</p>
                </EmptyState>
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table.Root>
                      <Table.ScrollContainer>
                        <Table.Content aria-label="Ranking de performance dos agentes">
                          <Table.Header>
                            <Table.Column isRowHeader>AGENTE</Table.Column>
                            <Table.Column>SESSÕES</Table.Column>
                            <Table.Column>MENSAGENS</Table.Column>
                            <Table.Column>SATISFAÇÃO</Table.Column>
                            <Table.Column>VELOCIDADE</Table.Column>
                            <Table.Column>SENTIMENTO</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {filteredAgents.map((agent) => (
                              <Table.Row key={agent.id}>
                                <Table.Cell className="font-medium">
                                  <div className="flex items-center gap-3">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                                      <Bot className="size-4.5" />
                                    </span>
                                    <div>
                                      <p className="font-semibold text-foreground">{agent.name}</p>
                                      <p className="text-[11px] text-muted line-clamp-1">{agent.role}</p>
                                    </div>
                                  </div>
                                </Table.Cell>
                                <Table.Cell className="font-semibold text-foreground">
                                  {agent.sessions.toLocaleString("pt-BR")}
                                </Table.Cell>
                                <Table.Cell className="text-muted">
                                  {agent.messages.toLocaleString("pt-BR")}
                                </Table.Cell>
                                <Table.Cell>
                                  <div className="flex items-center gap-1.5">
                                    <ProgressBar
                                      aria-label={`Satisfação ${agent.name}`}
                                      value={agent.satisfaction}
                                      color="success"
                                      className="w-16"
                                    />
                                    <span className="text-xs font-bold text-success">{agent.satisfaction}%</span>
                                  </div>
                                </Table.Cell>
                                <Table.Cell className="text-muted font-medium">{agent.avgSpeed}</Table.Cell>
                                <Table.Cell>
                                  <Chip size="sm" variant="soft" color="success">
                                    {agent.sentiment}
                                  </Chip>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table.Root>
                  </div>

                  {/* Mobile Cards Fallback */}
                  <ul className="divide-y divide-separator md:hidden">
                    {filteredAgents.map((agent) => (
                      <li key={agent.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                              <Bot className="size-4" />
                            </span>
                            <div>
                              <p className="font-semibold text-foreground text-sm">{agent.name}</p>
                              <p className="text-xs text-muted">{agent.role}</p>
                            </div>
                          </div>
                          <Chip size="sm" variant="soft" color="success">
                            {agent.satisfaction}% CSAT
                          </Chip>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-separator">
                          <span>{agent.sessions} conversas</span>
                          <span>Velocidade: {agent.avgSpeed}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card.Content>
          </Card>
        </Tabs.Panel>

        {/* Tab 3: Topics Deep Dive */}
        <Tabs.Panel id="topicos" className="space-y-4 pt-4">
          <Card>
            <Card.Header>
              <Card.Title>Mapeamento Semântico de Dúvidas dos Alunos</Card.Title>
              <Card.Description>Categorização de intenções das perguntas feitas à inteligência artificial</Card.Description>
            </Card.Header>
            <Card.Content className="grid gap-4 sm:grid-cols-2 pt-0">
              {topTopics.map((topic) => (
                <div
                  key={topic.topic}
                  className="rounded-xl border border-border/80 bg-background-secondary p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground text-sm">{topic.topic}</p>
                    <strong className="font-display text-sm text-accent">{topic.percentage}%</strong>
                  </div>
                  <ProgressBar
                    aria-label={`Demanda ${topic.topic}`}
                    value={topic.percentage}
                    color="accent"
                  />
                  <p className="text-[11px] text-muted">{topic.count} interações registradas no período</p>
                </div>
              ))}
            </Card.Content>
          </Card>
        </Tabs.Panel>

        {/* Tab 4: Student Feedback */}
        <Tabs.Panel id="feedbacks" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {recentFeedback.map((fb) => (
              <Card key={fb.id} className="flex flex-col justify-between">
                <Card.Header className="pb-2">
                  <div className="flex items-center justify-between w-full">
                    <Chip size="sm" variant="soft" color="accent" className="text-[10px]">
                      {fb.agent}
                    </Chip>
                    <div className="flex items-center gap-0.5 text-warning">
                      {Array.from({ length: fb.rating }).map((_, i) => (
                        <Star key={i} className="size-3 fill-warning text-warning" />
                      ))}
                    </div>
                  </div>
                </Card.Header>
                <Card.Content className="pt-0">
                  <p className="text-xs text-foreground leading-relaxed italic">&ldquo;{fb.comment}&rdquo;</p>
                </Card.Content>
                <Card.Footer className="border-t border-separator pt-2 text-[11px] text-muted flex items-center justify-between">
                  <span className="font-semibold text-foreground">{fb.student}</span>
                  <span>{fb.time}</span>
                </Card.Footer>
              </Card>
            ))}
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
