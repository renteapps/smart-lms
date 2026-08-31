"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Award,
  Download,
  Flame,
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
// Mock import removed
import { toast } from "sonner";

export interface StudentsAnalyticsViewProps {
  basePath?: string;
  period?: any;
  data: any;
}

export function StudentsAnalyticsView({ basePath = "/admin/analises", data }: StudentsAnalyticsViewProps) {
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const [selectedTab, setSelectedTab] = useState("visao_geral");

  const { kpis, activityByHour, profilesDistribution, engagementBadges, demographics } = data;

  const barChartData = activityByHour.map((a: any) => ({
    label: a.hour,
    value: a.activeUsers,
    formattedValue: `${a.activeUsers} alunos ativos`,
  }));

  // DAU/MAU: aderência diária real, derivada dos dois números que já vêm no payload.
  const dauMauRatio = kpis.monthlyActiveUsers
    ? Math.round((kpis.dailyActiveUsers / kpis.monthlyActiveUsers) * 100)
    : 0;
  const activeChange: number | null = kpis.activeStudentsChange ?? null;
  const activeTrend =
    activeChange !== null
      ? {
          value: `${activeChange > 0 ? "+" : ""}${activeChange}%`,
          isPositive: activeChange >= 0,
          isNeutral: activeChange === 0,
        }
      : undefined;

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
          helper={`${kpis.monthlyActiveUsers} de ${kpis.totalStudents} alunos ativos`}
          icon={UserCheck}
          tone="sage"
          tooltipText="Percentual dos alunos matriculados que acessaram a plataforma nos últimos 30 dias."
        />
        <MetricCard
          label="Streak Médio de Estudo"
          value={kpis.avgStudyStreak}
          helper="dias consecutivos com atividade"
          icon={Flame}
          tone="terracotta"
          tooltipText="Média de dias seguidos, terminando hoje ou ontem, em que os alunos completam ao menos 1 atividade."
        />
        <MetricCard
          label="Alunos Ativos no Período"
          value={`${kpis.activeStudentsInPeriod}`}
          helper={`${kpis.activeRate}% da base`}
          icon={Users}
          tone="primary"
          tooltipText="Alunos que acessaram a plataforma dentro do período selecionado."
          trend={activeTrend}
        />
        <MetricCard
          label="Usuários Ativos (DAU / MAU)"
          value={`${kpis.dailyActiveUsers} / ${kpis.monthlyActiveUsers}`}
          helper={`${dauMauRatio}% de aderência diária`}
          icon={Activity}
          tone="purple"
          tooltipText="Usuários ativos hoje (DAU) e nos últimos 30 dias (MAU). A aderência é a razão DAU/MAU."
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
                {profilesDistribution.map((item: any) => (
                  <div key={item.profile} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{item.profile}</span>
                      <div className="flex items-center gap-1">
                        <strong className="text-foreground">{item.percentage}%</strong>
                        <span className="text-muted">({item.count})</span>
                      </div>
                    </div>
                    <Bar label={`Perfil ${item.profile}`} value={item.percentage} />
                  </div>
                ))}
              </Card.Content>
            </Card>
          </div>

          {/* Demografia: quem são os alunos */}
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Quem são os alunos</h3>
              <p className="text-xs text-muted">
                Cada recorte considera só quem preencheu o campo — contas criadas por compra entram
                sem esses dados até completarem o cadastro.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <DistributionCard title="Gênero" dist={demographics.gender} />
              <DistributionCard
                title="Faixa etária"
                dist={demographics.ageRange}
                description={
                  demographics.averageAge ? `Idade média: ${demographics.averageAge} anos` : undefined
                }
              />
              <DistributionCard title="Cargo / Momento de carreira" dist={demographics.careerRole} />
              <DistributionCard title="Empresa" dist={demographics.company} />
              <DistributionCard title="Localização · Estado" dist={demographics.location.state} />
              <DistributionCard title="Localização · Cidade" dist={demographics.location.city} />
              <DistributionCard title="Localização · País" dist={demographics.location.country} />
              <DistributionCard title="Meta semanal de estudo" dist={demographics.weeklyGoal} />
            </div>

            <Card>
              <Card.Header className="pb-2">
                <Card.Title className="font-display text-base font-bold text-foreground">
                  Completude de cadastro
                </Card.Title>
                <Card.Description>
                  % dos {demographics.base} alunos com cada dado preenchido
                </Card.Description>
              </Card.Header>
              <Card.Content className="grid gap-3.5 pt-2 sm:grid-cols-2">
                {demographics.completeness.map((item: any) => (
                  <div key={item.field} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{item.field}</span>
                      <div className="flex items-center gap-1">
                        <strong className="text-foreground">{item.percentage}%</strong>
                        <span className="text-muted">
                          ({item.filled}/{item.total})
                        </span>
                      </div>
                    </div>
                    <Bar
                      label={`Preenchimento de ${item.field}`}
                      value={item.percentage}
                      color={item.percentage >= 60 ? "success" : item.percentage >= 30 ? "warning" : "danger"}
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
            {profilesDistribution.map((item: any) => (
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
                  <Bar label={`Share ${item.profile}`} value={item.percentage} />
                </Card.Content>
              </Card>
            ))}
          </div>
        </Tabs.Panel>

        {/* Tab 3: Engagement Milestones */}
        <Tabs.Panel id="engajamento" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {engagementBadges.map((badge: any, idx: number) => (
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

/**
 * `<ProgressBar>` do HeroUI é composto: sem `Track`/`Fill` como filhos ele
 * renderiza só o wrapper e a barra fica invisível. Encapsula o preenchimento
 * correto (ver `AudioUpload.tsx`) para as distribuições desta tela.
 */
function Bar({
  label,
  value,
  color = "accent",
}: {
  label: string;
  value: number;
  color?: "accent" | "success" | "warning" | "danger";
}) {
  return (
    <ProgressBar aria-label={label} value={value} color={color}>
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

type DistributionRow = { label: string; count: number; percentage: number; color: string };

/**
 * Barra de distribuição de um recorte demográfico. Mesmo visual da "Distribuição
 * por Perfil", com a base que respondeu no subtítulo e um vazio explícito
 * quando ninguém preencheu o campo (comum para empresa/localização).
 */
function DistributionCard({
  title,
  description,
  dist,
}: {
  title: string;
  description?: string;
  dist: { rows: DistributionRow[]; answered: number };
}) {
  return (
    <Card>
      <Card.Header className="pb-2">
        <Card.Title className="font-display text-base font-bold text-foreground">{title}</Card.Title>
        <Card.Description>
          {description ?? (dist.answered > 0 ? `${dist.answered} alunos informaram` : "Sem dados ainda")}
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-3 pt-2">
        {dist.rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted">Nenhum aluno preencheu este campo ainda.</p>
        ) : (
          dist.rows.map((row) => (
            <div key={row.label} className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{row.label}</span>
                <div className="flex items-center gap-1">
                  <strong className="text-foreground">{row.percentage}%</strong>
                  <span className="text-muted">({row.count})</span>
                </div>
              </div>
              <Bar label={`${title}: ${row.label}`} value={row.percentage} />
            </div>
          ))
        )}
      </Card.Content>
    </Card>
  );
}
