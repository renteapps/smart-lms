"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Flame,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  Label,
  SearchField,
  Tabs,
  Tooltip,
  buttonVariants,
} from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import {
  MetricCard,
  PeriodSelector,
  SimpleAreaChart,
  Sparkline,
  type TimePeriod,
} from "@/components/admin/analytics/AnalyticsComponents";
// Mock imports removed
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const iconMap = {
  BookOpen,
  TrendingUp,
  Bot,
  CreditCard,
  Users,
};

const crossGrowthData = [
  { label: "Jan", value: 54, formattedValue: "R$ 54k • 820h" },
  { label: "Fev", value: 61, formattedValue: "R$ 61k • 950h" },
  { label: "Mar", value: 68, formattedValue: "R$ 68k • 1.100h" },
  { label: "Abr", value: 72, formattedValue: "R$ 72k • 1.050h" },
  { label: "Mai", value: 79, formattedValue: "R$ 79k • 1.320h" },
  { label: "Jun", value: 83, formattedValue: "R$ 83k • 1.480h" },
  { label: "Jul", value: 89, formattedValue: "R$ 89k • 1.650h" },
  { label: "Ago", value: 95, formattedValue: "R$ 95k • 1.890h" },
];

import { AnalyticsOverview, AnalyticsCardItem } from "@/lib/mocks/analyticsMocks";

export interface AnalyticsHubViewProps {
  basePath?: string;
  overviewData: AnalyticsOverview;
  cardsData: AnalyticsCardItem[];
}

export function AnalyticsHubView({ basePath = "/admin/analises", overviewData, cardsData }: AnalyticsHubViewProps) {
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("todos");
  const [searchFilter, setSearchFilter] = useState("");

  const filteredCards = cardsData.filter((card) => {
    const matchesSearch =
      card.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      card.description.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategoryTab === "aprendizagem") {
      return card.id === "cursos" || card.id === "agentes" || card.id === "alunos";
    }
    if (selectedCategoryTab === "financeiro") {
      return card.id === "vendas" || card.id === "assinaturas";
    }
    return true;
  });

  const handleExportConsolidated = () => {
    toast.success("Gerando relatório consolidado...", {
      description: "O download do PDF analítico será iniciado em instantes.",
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        eyebrow="Visão • Inteligência de Dados"
        title="Central de Análises"
        description="Métricas consolidadas de aprendizagem, faturamento, inteligência artificial e retenção de assinaturas."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <PeriodSelector period={period} onChange={setPeriod} />
            <Button
              variant="outline"
              size="md"
              onClick={handleExportConsolidated}
              className="gap-2 font-semibold"
            >
              <Download className="size-4" aria-hidden="true" />
              <span>Exportar PDF</span>
            </Button>
          </div>
        }
      />

      {/* Top High-level KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Métricas Principais">
        <MetricCard
          label="Faturamento Total"
          value={`R$ ${overviewData.totalRevenue.toLocaleString("pt-BR")}`}
          helper="vs mês anterior"
          icon={TrendingUp}
          tone="primary"
          tooltipText="Faturamento bruto acumulado somando assinaturas e compras avulsas."
          trend={{ value: `+${overviewData.revenueChange}%`, isPositive: true }}
          sparklineData={[28, 35, 42, 55, 62, 70, 82, 94]}
        />
        <MetricCard
          label="Alunos Ativos"
          value={overviewData.activeStudents.toLocaleString("pt-BR")}
          helper="alunos com estudo ativo"
          icon={Users}
          tone="sage"
          tooltipText="Estudantes que assistiram aulas ou interagiram com IA nos últimos 30 dias."
          trend={{ value: `+${overviewData.studentsChange}%`, isPositive: true }}
          sparklineData={[40, 48, 52, 60, 68, 74, 80, 88]}
        />
        <MetricCard
          label="Horas Assistidas"
          value={`${(overviewData.totalWatchHours / 1000).toFixed(1)}k h`}
          helper="+0k h no período"
          icon={Clock3}
          tone="terracotta"
          tooltipText="Total de tempo em vídeo consumido pelos estudantes na plataforma."
          trend={{ value: `+${overviewData.watchHoursChange}%`, isPositive: true }}
          sparklineData={[30, 38, 45, 52, 60, 72, 85, 95]}
        />
        <MetricCard
          label="Interações com IA"
          value={overviewData.totalAgentInteractions.toLocaleString("pt-BR")}
          helper="Interações de agentes registradas"
          icon={Bot}
          tone="purple"
          tooltipText="Volume de sessões e mensagens trocadas com os agentes de tutoria."
          trend={{ value: `+${overviewData.agentInteractionsChange}%`, isPositive: true }}
          sparklineData={[15, 25, 38, 50, 65, 78, 88, 100]}
        />
      </section>

      {/* Filter Tabs & Search Header */}
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-separator pb-4">
          <Tabs.Root
            selectedKey={selectedCategoryTab}
            onSelectionChange={(k) => setSelectedCategoryTab(String(k))}
          >
            <Tabs.List aria-label="Categorias de dashboards analíticos">
              <Tabs.Tab id="todos">Todos os Dashboards</Tabs.Tab>
              <Tabs.Tab id="aprendizagem">Aprendizagem & IA</Tabs.Tab>
              <Tabs.Tab id="financeiro">Financeiro & Recorrência</Tabs.Tab>
            </Tabs.List>
          </Tabs.Root>

          <SearchField
            value={searchFilter}
            onChange={setSearchFilter}
            className="w-full sm:w-64"
            aria-label="Buscar dashboards"
          >
            <Label className="sr-only">Buscar dashboards</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Filtrar métricas ou dash..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>

        {/* Specific Analytics Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((card) => {
            const Icon = iconMap[card.iconName as keyof typeof iconMap] || BarChart3;
            const targetHref = card.href.replace("/admin/analises", basePath);

            return (
              <Card
                key={card.id}
                className="group relative flex flex-col justify-between overflow-hidden border border-border bg-surface transition-all duration-300 hover:border-accent hover:shadow-lg"
              >
                <Card.Header className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground shadow-xs transition-transform duration-300 group-hover:scale-105">
                        <Icon className="size-6" aria-hidden="true" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <Card.Title className="font-display text-lg font-bold text-foreground">
                            {card.title}
                          </Card.Title>
                          {card.badgeText && (
                            <Chip size="sm" variant="soft" color="accent" className="text-[11px] font-semibold">
                              {card.badgeText}
                            </Chip>
                          )}
                        </div>
                        <Card.Description className="mt-1 line-clamp-2 text-xs text-muted sm:text-sm">
                          {card.description}
                        </Card.Description>
                      </div>
                    </div>
                  </div>
                </Card.Header>

                <Card.Content className="space-y-4 pt-2">
                  {/* KPI mini-grid */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-background-secondary p-3 border border-border/50">
                    {card.metrics.map((metric, idx) => (
                      <div key={idx} className="space-y-1">
                        <p className="text-[11px] font-medium text-muted truncate">{metric.label}</p>
                        <p className="font-display text-base font-bold text-foreground sm:text-lg">
                          {metric.value}
                        </p>
                        {metric.trend && (
                          <span className="inline-flex items-center text-[10px] font-bold text-success">
                            {metric.trend.value}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Highlights list */}
                  <ul className="space-y-1.5 text-xs text-muted">
                    {card.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-accent shrink-0" aria-hidden="true" />
                        <span className="truncate">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </Card.Content>

                <Card.Footer className="border-t border-separator bg-surface-secondary/50 pt-3 pb-3">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkline data={card.sparkline} height={24} width={70} />
                      <span className="text-[11px] font-medium text-muted">Tendência</span>
                    </div>

                    <Link
                      href={targetHref}
                      className={cn(
                        buttonVariants({ variant: "primary", size: "sm" }),
                        "gap-1.5 font-semibold group-hover:translate-x-0.5",
                      )}
                    >
                      <span>Abrir Dash</span>
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </Card.Footer>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Global Intelligence Overview & Insights */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Card.Header className="flex flex-row items-center justify-between pb-2">
            <div>
              <Card.Title className="font-display text-lg font-bold text-foreground">
                Crescimento da Plataforma
              </Card.Title>
              <Card.Description>
                Correlação contínua entre consumo de horas de estudo e volume de receita
              </Card.Description>
            </div>
            <Chip size="sm" variant="soft" color="success">
              +48% no ano
            </Chip>
          </Card.Header>
          <Card.Content className="pt-4">
            <SimpleAreaChart data={crossGrowthData} height={220} />
          </Card.Content>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <Card.Header className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-accent" />
                <Card.Title className="font-display text-lg font-bold text-foreground">
                  Insights Automáticos
                </Card.Title>
              </div>
              <Card.Description>Oportunidades e marcos detectados</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-3.5 pt-0">
              <div className="rounded-xl border border-border/80 bg-background-secondary p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Flame className="size-3.5 text-warning" />
                  <span>Alta Retenção em IA</span>
                </div>
                <p className="text-muted leading-relaxed">
                  Alunos que interagem com o <strong>Tutor Socrático</strong> concluem módulos 2.4x mais rápido.
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-background-secondary p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Zap className="size-3.5 text-accent" />
                  <span>Conversão via PIX</span>
                </div>
                <p className="text-muted leading-relaxed">
                  O PIX reduziu o abandono de carrinho em 18% em relação a boletos tradicionais.
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-background-secondary p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <CheckCircle2 className="size-3.5 text-success" />
                  <span>Baixo Churn Recorrente</span>
                </div>
                <p className="text-muted leading-relaxed">
                  Taxa de churn caiu para 1.9%, mantendo o LTV estimado acima de R$ 1.400.
                </p>
              </div>
            </Card.Content>
          </div>

          <Card.Footer className="border-t border-separator pt-3">
            <Link
              href={`${basePath}/cursos`}
              className="w-full text-center text-xs font-semibold text-accent hover:underline"
            >
              Explorar relatórios detalhados de cursos →
            </Link>
          </Card.Footer>
        </Card>
      </section>
    </div>
  );
}
