"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  Download,
  Filter,
  GraduationCap,
  Sparkles,
  Star,
  Users,
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
  buttonVariants,
} from "@heroui/react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import {
  MetricCard,
  PeriodSelector,
  RetentionFunnelChart,
  SimpleBarChart,
  type TimePeriod,
} from "@/components/admin/analytics/AnalyticsComponents";
// Mock import removed
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CoursesAnalyticsViewProps {
  basePath?: string;
  data: any; // Type corresponds to the return type of getCoursesAnalytics()
}

export function CoursesAnalyticsView({ basePath = "/admin/analises", data }: CoursesAnalyticsViewProps) {
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("visao_geral");

  const { kpis, monthlyEngagement, retentionFunnel, topCourses, ratingsBreakdown } = data;

  const barChartData = monthlyEngagement.map((m) => ({
    label: m.period,
    value: m.watchHours,
    formattedValue: `${m.watchHours} horas • ${m.completions} conclusões`,
  }));

  const filteredCourses = topCourses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.instructor.toLowerCase().includes(search.toLowerCase()),
  );

  const handleExport = () => {
    toast.success("Exportando métricas pedagógicas...", {
      description: "Arquivo CSV de engajamento de cursos gerado.",
    });
  };

  return (
    <div className="space-y-8">
      {/* Navigation & Header */}
      <div>
        <Link
          href={basePath}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-3.5" />
          <span>Voltar para Central de Análises</span>
        </Link>
        <PageHeader
          eyebrow="Visão • Aprendizagem"
          title="Análise de Cursos & Engajamento"
          description="Acompanhe o consumo de aulas, taxas de conclusão, retenção por módulo e feedbacks pedagógicos."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <PeriodSelector period={period} onChange={setPeriod} />
              <Button variant="outline" size="md" onClick={handleExport} className="gap-2 font-semibold">
                <Download className="size-4" aria-hidden="true" />
                <span>Exportar CSV</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de Cursos">
        <MetricCard
          label="Taxa de Conclusão"
          value={`${kpis.completionRate}%`}
          helper={kpis.completionRateDelta}
          icon={GraduationCap}
          tone="sage"
          tooltipText="Percentual de alunos que finalizam 100% dos módulos do curso."
          trend={{ value: "+4.2%", isPositive: true }}
          sparklineData={[48, 52, 55, 60, 63, 65, 68]}
        />
        <MetricCard
          label="Horas Assistidas"
          value={`${(kpis.totalWatchHours / 1000).toFixed(1)}k h`}
          helper={kpis.watchHoursDelta}
          icon={Clock3}
          tone="primary"
          tooltipText="Soma de minutos e horas assistidas no player de vídeo."
          trend={{ value: "+12.1%", isPositive: true }}
          sparklineData={[30, 42, 55, 68, 79, 88, 95]}
        />
        <MetricCard
          label="Matrículas Ativas"
          value={kpis.activeEnrollments.toLocaleString("pt-BR")}
          helper="em 24 cursos cadastrados"
          icon={Users}
          tone="terracotta"
          tooltipText="Total de inscrições de estudantes ativas nos cursos."
          trend={{ value: "+8.5%", isPositive: true }}
          sparklineData={[60, 65, 70, 72, 78, 82, 85]}
        />
        <MetricCard
          label="Avaliação Média"
          value={`${kpis.averageRating} ★`}
          helper={`${kpis.totalReviews} avaliações enviadas`}
          icon={Star}
          tone="purple"
          tooltipText="Nota média de 1 a 5 estrelas concedida pelos alunos após as aulas."
          trend={{ value: "+0.1", isPositive: true }}
          sparklineData={[90, 92, 91, 94, 95, 96, 98]}
        />
      </section>

      {/* View Tabs */}
      <Tabs.Root selectedKey={selectedTab} onSelectionChange={(k) => setSelectedTab(String(k))}>
        <Tabs.List aria-label="Seções da análise de cursos">
          <Tabs.Tab id="visao_geral">Visão Geral & Consumo</Tabs.Tab>
          <Tabs.Tab id="ranking_cursos">Ranking de Cursos ({filteredCourses.length})</Tabs.Tab>
          <Tabs.Tab id="funil_retencao">Funil de Retenção</Tabs.Tab>
          <Tabs.Tab id="avaliacoes_csat">Avaliações & CSAT</Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Overview Charts */}
        <Tabs.Panel id="visao_geral" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <Card.Header className="flex flex-row items-center justify-between pb-2">
                <div>
                  <Card.Title className="font-display text-lg font-bold text-foreground">
                    Consumo de Horas por Mês
                  </Card.Title>
                  <Card.Description>Volume de horas assistidas somado entre todos os módulos</Card.Description>
                </div>
                <Chip size="sm" variant="soft" color="accent">
                  Recorde em Agosto
                </Chip>
              </Card.Header>
              <Card.Content className="pt-4">
                <SimpleBarChart
                  data={barChartData}
                  height={210}
                  valueFormatter={(v) => `${v} horas`}
                />
              </Card.Content>
            </Card>

            <Card className="lg:col-span-2">
              <Card.Header className="pb-2">
                <div className="flex items-center justify-between">
                  <Card.Title className="font-display text-lg font-bold text-foreground">
                    Funil de Retenção Médio
                  </Card.Title>
                  <span className="text-xs font-semibold text-muted">Base de Alunos</span>
                </div>
                <Card.Description>Onde os alunos mais avançam e onde ocorre drop-off</Card.Description>
              </Card.Header>
              <Card.Content className="pt-3">
                <RetentionFunnelChart stages={retentionFunnel} />
              </Card.Content>
            </Card>
          </div>
        </Tabs.Panel>

        {/* Tab 2: Ranking Table */}
        <Tabs.Panel id="ranking_cursos" className="space-y-4 pt-4">
          <Card>
            <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Card.Title>Ranking de Performance por Curso</Card.Title>
                <Card.Description>Métricas de conclusão, alunos ativos e nota média</Card.Description>
              </div>

              <SearchField
                value={search}
                onChange={setSearch}
                className="w-full sm:max-w-xs"
                aria-label="Buscar curso ou instrutor"
              >
                <Label className="sr-only">Buscar curso</Label>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Buscar por título ou instrutor..." />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
            </Card.Header>

            <Card.Content className="px-0 pb-0 pt-0">
              {filteredCourses.length === 0 ? (
                <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                  <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                    <BookOpen className="size-5 text-muted" aria-hidden="true" />
                  </span>
                  <p className="font-semibold text-foreground">Nenhum curso encontrado</p>
                  <p className="text-sm text-muted">Ajuste o termo da busca para ver os resultados.</p>
                </EmptyState>
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table.Root>
                      <Table.ScrollContainer>
                        <Table.Content aria-label="Ranking de performance dos cursos">
                          <Table.Header>
                            <Table.Column isRowHeader>CURSO</Table.Column>
                            <Table.Column>INSTRUTOR</Table.Column>
                            <Table.Column>ALUNOS</Table.Column>
                            <Table.Column>CONCLUSÃO</Table.Column>
                            <Table.Column>TEMPO MÉDIO</Table.Column>
                            <Table.Column>AVALIAÇÃO</Table.Column>
                            <Table.Column>STATUS</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {filteredCourses.map((course) => (
                              <Table.Row key={course.id}>
                                <Table.Cell className="font-medium">
                                  <div className="flex items-center gap-2.5">
                                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                                      <BookOpen className="size-4" />
                                    </span>
                                    <span className="font-semibold text-foreground">{course.title}</span>
                                  </div>
                                </Table.Cell>
                                <Table.Cell className="text-muted">{course.instructor}</Table.Cell>
                                <Table.Cell className="font-semibold text-foreground">
                                  {course.students.toLocaleString("pt-BR")}
                                </Table.Cell>
                                <Table.Cell>
                                  <div className="flex items-center gap-2">
                                    <ProgressBar
                                      aria-label={`Conclusão do curso ${course.title}`}
                                      value={course.completionRate}
                                      color="success"
                                      className="w-20"
                                    />
                                    <span className="text-xs font-semibold text-foreground">
                                      {course.completionRate}%
                                    </span>
                                  </div>
                                </Table.Cell>
                                <Table.Cell className="text-muted">{course.avgHours}</Table.Cell>
                                <Table.Cell>
                                  <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                                    <Star className="size-3.5 fill-warning text-warning" />
                                    <span>{course.rating.toFixed(2)}</span>
                                  </div>
                                </Table.Cell>
                                <Table.Cell>
                                  <Chip
                                    size="sm"
                                    variant="soft"
                                    color={
                                      course.status === "Alta demanda"
                                        ? "success"
                                        : course.status === "Crescendo"
                                        ? "accent"
                                        : course.status === "Atenção"
                                        ? "warning"
                                        : "default"
                                    }
                                  >
                                    {course.status}
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
                    {filteredCourses.map((course) => (
                      <li key={course.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                              <BookOpen className="size-4" />
                            </span>
                            <div>
                              <p className="font-semibold text-foreground text-sm">{course.title}</p>
                              <p className="text-xs text-muted">{course.instructor}</p>
                            </div>
                          </div>
                          <Chip size="sm" variant="soft" color="accent">
                            {course.rating.toFixed(2)} ★
                          </Chip>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted">{course.students} alunos</span>
                            <span className="font-bold text-foreground">{course.completionRate}% concluído</span>
                          </div>
                          <ProgressBar
                            aria-label={`Conclusão ${course.title}`}
                            value={course.completionRate}
                            color="success"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card.Content>
          </Card>
        </Tabs.Panel>

        {/* Tab 3: Funnel Deep Dive */}
        <Tabs.Panel id="funil_retencao" className="space-y-6 pt-4">
          <Card>
            <Card.Header>
              <Card.Title>Diagnóstico de Abandono por Módulo</Card.Title>
              <Card.Description>
                Mapeamento das etapas onde os alunos encontram maior dificuldade e interrompem a trilha
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-6">
              <RetentionFunnelChart stages={retentionFunnel} />
            </Card.Content>
          </Card>
        </Tabs.Panel>

        {/* Tab 4: CSAT & Ratings */}
        <Tabs.Panel id="avaliacoes_csat" className="space-y-6 pt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <Card.Header className="pb-2">
                <Card.Title className="font-display text-base font-bold text-foreground">
                  Distribuição de Avaliações (CSAT)
                </Card.Title>
                <Card.Description>Como os alunos avaliam a didática e os materiais</Card.Description>
              </Card.Header>
              <Card.Content className="space-y-3.5 pt-2">
                {ratingsBreakdown.map((item) => (
                  <div key={item.stars} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <span>{item.stars} estrelas</span>
                        <Star className="size-3 fill-warning text-warning" />
                      </span>
                      <span className="font-bold text-foreground">{item.percentage}% ({item.count})</span>
                    </div>
                    <ProgressBar
                      aria-label={`${item.stars} estrelas`}
                      value={item.percentage}
                      color="warning"
                    />
                  </div>
                ))}
              </Card.Content>
            </Card>

            <Card className="flex flex-col justify-between">
              <div>
                <Card.Header className="pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-accent" />
                    <Card.Title className="font-display text-base font-bold text-foreground">
                      Recomendações Pedagógicas
                    </Card.Title>
                  </div>
                  <Card.Description>Ações sugeridas para aumentar a conclusão dos cursos</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-3 text-xs text-muted">
                  <div className="rounded-xl border border-border/80 bg-background-secondary p-3 space-y-1">
                    <strong className="block text-foreground">Reduzir duração de aulas no Módulo 3</strong>
                    <p>Aulas acima de 18 minutos tiveram queda de 14% na retenção. Prefira quebrar em pílulas de 6 a 8 minutos.</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-background-secondary p-3 space-y-1">
                    <strong className="block text-foreground">Ativar lembretes de streak</strong>
                    <p>Alunos sem login há mais de 4 dias retornam 3x mais quando recebem push da trilha personalizada.</p>
                  </div>
                </Card.Content>
              </div>

              <Card.Footer className="border-t border-separator pt-3">
                <Link
                  href="/admin/cursos"
                  className="w-full text-center text-xs font-semibold text-accent hover:underline"
                >
                  Gerenciar Catálogo de Cursos →
                </Link>
              </Card.Footer>
            </Card>
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
