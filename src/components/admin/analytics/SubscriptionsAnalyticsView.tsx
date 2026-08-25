"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Download,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  ProgressBar,
  Tabs,
} from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import {
  MetricCard,
  PeriodSelector,
  SimpleAreaChart,
  type TimePeriod,
} from "@/components/admin/analytics/AnalyticsComponents";
// Mock import removed
import { toast } from "sonner";

export interface SubscriptionsAnalyticsViewProps {
  basePath?: string;
  period?: any;
  data: any;
}

export function SubscriptionsAnalyticsView({ basePath = "/admin/analises", data }: SubscriptionsAnalyticsViewProps) {
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const [selectedTab, setSelectedTab] = useState("visao_geral");

  const { kpis, mrrEvolution, plansDistribution, churnReasons, renewalsForecast } = data;

  const mrrChartData = mrrEvolution.map((m: any) => ({
    label: m.period,
    value: m.mrr,
    formattedValue: `MRR: R$ ${m.mrr.toLocaleString("pt-BR")} (${m.subscribers} assinantes)`,
  }));

  const handleExport = () => {
    toast.success("Exportando métricas de recorrência...", {
      description: "Relatório de MRR, LTV e Churn Rate gerado.",
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
          eyebrow="Visão • Recorrência"
          title="Análise de Assinaturas & Retenção"
          description="Monitore saúde financeira da base recorrente, MRR, churn rate, previsões de renovação e LTV."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <PeriodSelector period={period} onChange={setPeriod} />
              <Button variant="outline" size="md" onClick={handleExport} className="gap-2 font-semibold">
                <Download className="size-4" aria-hidden="true" />
                <span>Exportar Assinaturas</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Subscription Metrics Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de Recorrência">
        <MetricCard
          label="MRR (Mensal Recorrente)"
          value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            kpis.mrr,
          )}
          helper={`ARR estimado: ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(kpis.arr)}`}
          icon={CreditCard}
          tone="primary"
          tooltipText="Receita Recorrente Mensal contratada na base ativa."
          trend={{ value: "+9.8%", isPositive: true }}
          sparklineData={[31, 34, 38, 41, 43, 45, 47, 49]}
        />
        <MetricCard
          label="Assinantes Ativos"
          value={kpis.activeMembers.toLocaleString("pt-BR")}
          helper="+5.6% vs mês anterior"
          icon={UserCheck}
          tone="sage"
          tooltipText="Total de membros com assinatura ativa e cobrança em dia."
          trend={{ value: "+5.6%", isPositive: true }}
          sparklineData={[740, 810, 890, 950, 1010, 1065, 1100, 1140]}
        />
        <MetricCard
          label="Taxa de Churn"
          value={`${kpis.churnRate}%`}
          helper={kpis.churnDelta}
          icon={TrendingDown}
          tone="terracotta"
          tooltipText="Percentual de assinaturas canceladas no período sobre a base total."
          trend={{ value: "-0.4% p.p.", isPositive: true }}
          sparklineData={[2.4, 2.3, 2.2, 2.1, 2.0, 1.95, 1.88]}
        />
        <MetricCard
          label="LTV (Valor do Ciclo de Vida)"
          value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            kpis.ltv,
          )}
          helper={`Taxa de renovação: ${kpis.renewalRate}%`}
          icon={TrendingUp}
          tone="purple"
          tooltipText="Estimativa de receita total gerada por assinante antes de cancelar."
          trend={{ value: "+R$ 120", isPositive: true }}
          sparklineData={[1280, 1310, 1350, 1390, 1420, 1450, 1480]}
        />
      </section>

      {/* Tabs */}
      <Tabs.Root selectedKey={selectedTab} onSelectionChange={(k) => setSelectedTab(String(k))}>
        <Tabs.List aria-label="Seções da análise de assinaturas">
          <Tabs.Tab id="visao_geral">Visão Geral & MRR</Tabs.Tab>
          <Tabs.Tab id="planos">Composição por Plano</Tabs.Tab>
          <Tabs.Tab id="churn">Análise de Churn</Tabs.Tab>
          <Tabs.Tab id="renovacoes">Previsão de Renovações</Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Overview Chart & Plan Mix */}
        <Tabs.Panel id="visao_geral" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <Card.Header className="flex flex-row items-center justify-between pb-2">
                <div>
                  <Card.Title className="font-display text-lg font-bold text-foreground">
                    Crescimento de MRR
                  </Card.Title>
                  <Card.Description>Evolução da receita recorrente mensal e base de membros</Card.Description>
                </div>
                <Chip size="sm" variant="soft" color="success">
                  +56% em 8 meses
                </Chip>
              </Card.Header>
              <Card.Content className="pt-4">
                <SimpleAreaChart data={mrrChartData} height={230} />
              </Card.Content>
            </Card>

            <Card className="space-y-4">
              <Card.Header className="pb-2">
                <Card.Title className="font-display text-base font-bold text-foreground">
                  Composição por Plano
                </Card.Title>
                <Card.Description>Fatia de assinantes por categoria de plano</Card.Description>
              </Card.Header>
              <Card.Content className="space-y-3.5 pt-0">
                {plansDistribution.map((plan: any) => (
                  <div key={plan.name} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{plan.name}</span>
                      <strong className="text-foreground">{plan.share}%</strong>
                    </div>
                    <ProgressBar
                      aria-label={`Share ${plan.name}`}
                      value={plan.share}
                      color="accent"
                    />
                    <div className="flex items-center justify-between text-muted text-[11px]">
                      <span>{plan.subscribers} membros</span>
                      <span>{plan.mrrShare}</span>
                    </div>
                  </div>
                ))}
              </Card.Content>
            </Card>
          </div>
        </Tabs.Panel>

        {/* Tab 2: Plans Detailed Breakdown */}
        <Tabs.Panel id="planos" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {plansDistribution.map((plan: any) => (
              <Card key={plan.name}>
                <Card.Header>
                  <Card.Title className="text-base font-bold text-foreground">{plan.name}</Card.Title>
                  <Card.Description>{plan.price}</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-3 pt-0 text-xs">
                  <div className="rounded-lg bg-background-secondary p-3 space-y-1">
                    <span className="text-muted">Assinantes Ativos</span>
                    <p className="font-display text-2xl font-bold text-foreground">{plan.subscribers}</p>
                  </div>
                  <div className="rounded-lg bg-background-secondary p-3 space-y-1">
                    <span className="text-muted">Faturamento Mensal</span>
                    <p className="font-display text-xl font-bold text-success">{plan.mrrShare}</p>
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        </Tabs.Panel>

        {/* Tab 3: Churn Deep Dive */}
        <Tabs.Panel id="churn" className="space-y-4 pt-4">
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <UserX className="size-5 text-danger" />
                <Card.Title>Motivos de Cancelamento de Assinatura</Card.Title>
              </div>
              <Card.Description>Dados tabulados no questionário de saída dos membros</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4 pt-0">
              {churnReasons.map((item: any) => (
                <div key={item.reason} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-medium">{item.reason}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted">({item.count} alunos)</span>
                      <strong className="text-foreground">{item.percentage}%</strong>
                    </div>
                  </div>
                  <ProgressBar
                    aria-label={`Motivo ${item.reason}`}
                    value={item.percentage}
                    color="danger"
                  />
                </div>
              ))}
            </Card.Content>
          </Card>
        </Tabs.Panel>

        {/* Tab 4: Renewals Forecast */}
        <Tabs.Panel id="renovacoes" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {renewalsForecast.map((item: any) => (
              <Card key={item.range}>
                <Card.Header>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-accent" />
                    <Card.Title className="text-base font-bold text-foreground">{item.range}</Card.Title>
                  </div>
                  <Card.Description>{item.count} cobranças programadas</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-3 pt-0 text-xs">
                  <div className="rounded-lg bg-background-secondary p-3 space-y-1">
                    <span className="text-muted">Receita Prevista</span>
                    <p className="font-display text-2xl font-bold text-foreground">{item.expectedRevenue}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted">Probabilidade:</span>
                    <Chip size="sm" variant="soft" color="success">
                      {item.probability}
                    </Chip>
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
