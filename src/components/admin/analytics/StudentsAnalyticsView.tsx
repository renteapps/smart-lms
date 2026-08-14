"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Download,
  Flame,
  HeartHandshake,
  UserCheck,
  Users,
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
  SimpleBarChart,
  type TimePeriod,
} from "@/components/admin/analytics/AnalyticsComponents";
import { MOCK_STUDENTS_ANALYTICS } from "@/lib/mocks/analyticsMocks";
import { toast } from "sonner";

export function StudentsAnalyticsView({ basePath = "/admin/analises" }: { basePath?: string }) {
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const [selectedTab, setSelectedTab] = useState("visao_geral");

  const { kpis, activityByHour, profilesDistribution, engagementBadges } =
    MOCK_STUDENTS_ANALYTICS;

  const barChartData = activityByHour.map((a) => ({
    label: a.hour,
    value: a.activeUsers,
    formattedValue: `${a.activeUsers} alunos ativos`,
  }));

  const handleExport = () => {
    toast.success("Exportando métricas de engajamento...", {
      description: "Dados de retenção e atividade de alunos exportados.",
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
          eyebrow="Visão • Comunidade & Alunos"
          title="Análise de Alunos & Engajamento"
          description="Monitore retenção de 30 dias, rotina de estudo, perfis comportamentais e horários de maior atividade."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <PeriodSelector period={period} onChange={setPeriod} />
              <Button variant="outline" size="md" onClick={handleExport} className="gap-2 font-semibold">
                <Download className="size-4" aria-hidden="true" />
                <span>Exportar Dados</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de Alunos">
        <MetricCard
          label="Retenção 30 Dias"
          value={`${kpis.retention30d}%`}
          helper="+3.8% vs mês anterior"
          icon={UserCheck}
          tone="sage"
          tooltipText="Percentual de alunos que continuam consumindo aulas após 30 dias do cadastro."
          trend={{ value: "+3.8%", isPositive: true }}
          sparklineData={[62, 65, 68, 70, 71, 73, 74.2]}
        />
        <MetricCard
          label="Streak Médio de Estudo"
          value={kpis.avgStudyStreak}
          helper="dias consecutivos de estudo"
          icon={Flame}
          tone="terracotta"
          tooltipText="Média de dias seguidos que os alunos completam ao menos 1 atividade diária."
          trend={{ value: "+0.6d", isPositive: true }}
          sparklineData={[3.2, 3.6, 4.0, 4.2, 4.5, 4.8]}
        />
        <MetricCard
          label="NPS dos Alunos"
          value={`+${kpis.npsScore}`}
          helper="Zona de Excelência"
          icon={HeartHandshake}
          tone="primary"
          tooltipText="Net Promoter Score avaliado diretamente pelos alunos na plataforma."
          trend={{ value: "+4 pts", isPositive: true }}
          sparklineData={[70, 72, 74, 75, 76, 78]}
        />
        <MetricCard
          label="Usuários Ativos (DAU / MAU)"
          value={`${kpis.dailyActiveUsers} / ${kpis.monthlyActiveUsers}`}
          helper="54.2% de engajamento diário"
          icon={Users}
          tone="purple"
          tooltipText="Relação entre usuários ativos diários (DAU) e mensais (MAU)."
          trend={{ value: "+8.2%", isPositive: true }}
          sparklineData={[480, 520, 560, 590, 620, 640]}
        />
      </section>

      {/* Tabs */}
      <Tabs.Root selectedKey={selectedTab} onSelectionChange={(k) => setSelectedTab(String(k))}>
        <Tabs.List aria-label="Seções da análise de alunos">
          <Tabs.Tab id="visao_geral">Visão Geral & Horários</Tabs.Tab>
          <Tabs.Tab id="perfis">Perfis de Aprendizagem</Tabs.Tab>
          <Tabs.Tab id="engajamento">Marcos de Engajamento</Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Overview Chart & Peak Hours */}
        <Tabs.Panel id="visao_geral" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <Card.Header className="flex flex-row items-center justify-between pb-2">
                <div>
                  <Card.Title className="font-display text-lg font-bold text-foreground">
                    Horários de Maior Atividade na Plataforma
                  </Card.Title>
                  <Card.Description>Média de alunos simultâneos conectados ao longo do dia</Card.Description>
                </div>
                <Chip size="sm" variant="soft" color="accent">
                  Pico às 20h
                </Chip>
              </Card.Header>
              <Card.Content className="pt-4">
                <SimpleBarChart
                  data={barChartData}
                  height={220}
                  valueFormatter={(v) => `${v} alunos`}
                />
              </Card.Content>
            </Card>

            <Card className="lg:col-span-2 space-y-4">
              <Card.Header className="pb-2">
                <Card.Title className="font-display text-base font-bold text-foreground">
                  Distribuição por Perfil
                </Card.Title>
                <Card.Description>Arquétipos definidos no teste inicial</Card.Description>
              </Card.Header>
              <Card.Content className="space-y-3.5 pt-0">
                {profilesDistribution.map((item) => (
                  <div key={item.profile} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{item.profile}</span>
                      <div className="flex items-center gap-1">
                        <strong className="text-foreground">{item.percentage}%</strong>
                        <span className="text-muted">({item.count})</span>
                      </div>
                    </div>
                    <ProgressBar
                      aria-label={`Perfil ${item.profile}`}
                      value={item.percentage}
                      color="accent"
                    />
                  </div>
                ))}
              </Card.Content>
            </Card>
          </div>
        </Tabs.Panel>

        {/* Tab 2: Profiles Breakdown */}
        <Tabs.Panel id="perfis" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {profilesDistribution.map((item) => (
              <Card key={item.profile}>
                <Card.Header>
                  <Card.Title className="text-base font-bold text-foreground">{item.profile}</Card.Title>
                  <Card.Description>{item.count} alunos mapeados</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-2 pt-0 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Participação na base:</span>
                    <strong className="text-foreground text-sm">{item.percentage}%</strong>
                  </div>
                  <ProgressBar
                    aria-label={`Share ${item.profile}`}
                    value={item.percentage}
                    color="accent"
                  />
                </Card.Content>
              </Card>
            ))}
          </div>
        </Tabs.Panel>

        {/* Tab 3: Engagement Milestones */}
        <Tabs.Panel id="engajamento" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {engagementBadges.map((badge, idx) => (
              <Card key={idx}>
                <Card.Content className="p-4 sm:p-5 flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <Award className="size-5" />
                  </span>
                  <div>
                    <p className="font-display text-xl font-bold text-foreground">{badge.count}</p>
                    <p className="text-xs font-semibold text-muted">{badge.title}</p>
                    <p className="mt-1 text-[11px] font-bold text-success">{badge.share} da base total</p>
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
