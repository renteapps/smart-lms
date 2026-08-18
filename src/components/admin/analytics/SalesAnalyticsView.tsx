"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Mail,
  Percent,
  PieChart,
  Plug,
  Receipt,
  RotateCcw,
  Send,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Label,
  Modal,
  ProgressBar,
  SearchField,
  Table,
} from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import {
  MetricCard,
  PeriodSelector,
  type TimePeriod,
} from "@/components/admin/analytics/AnalyticsComponents";
import { type SalesTransaction } from "@/lib/mocks/analyticsMocks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SalesTabId = "visao_geral" | "funil_checkout" | "transacoes" | "produtos" | "gateways";

export interface SalesAnalyticsViewProps {
  basePath?: string;
  data: any;
}

export function SalesAnalyticsView({ basePath = "/admin/analises", data }: SalesAnalyticsViewProps) {
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const [selectedTab, setSelectedTab] = useState<SalesTabId>("visao_geral");
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders" | "ticket">("revenue");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todas" | "aprovada" | "pendente" | "reembolsada">("todas");
  const [gatewayFilter, setGatewayFilter] = useState<"todos" | "Eduzz" | "Hotmart">("todos");

  // Modals
  const [selectedTransaction, setSelectedTransaction] = useState<SalesTransaction | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const {
    kpis,
    revenueEvolution,
    checkoutFunnel,
    abandonedCartStats,
    paymentMethods,
    gatewayShare,
    topProducts,
    recentTransactions,
  } = data;

  // Filtered transactions
  const filteredTransactions = recentTransactions.filter((tx) => {
    const matchesSearch =
      tx.customer.toLowerCase().includes(search.toLowerCase()) ||
      tx.product.toLowerCase().includes(search.toLowerCase()) ||
      tx.email.toLowerCase().includes(search.toLowerCase()) ||
      tx.id.toLowerCase().includes(search.toLowerCase()) ||
      tx.externalId.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "todas" ? true : tx.status === statusFilter;
    const matchesGateway = gatewayFilter === "todos" ? true : tx.gateway === gatewayFilter;

    return matchesSearch && matchesStatus && matchesGateway;
  });

  const handleExport = (format: "csv" | "pdf") => {
    setExportModalOpen(false);
    toast.success(`Relatório exportado em formato ${format.toUpperCase()}!`, {
      description: "O download do arquivo foi iniciado.",
    });
  };

  const handleResendReceipt = (tx: SalesTransaction) => {
    toast.success(`Recibo reenviado com sucesso para ${tx.email}!`, {
      description: `Disparo confirmado via Resend para a transação ${tx.id}.`,
    });
  };

  const tabOptions: { id: SalesTabId; label: string; icon: typeof BarChart3; count?: number }[] = [
    { id: "visao_geral", label: "Visão Geral & Faturamento", icon: BarChart3 },
    { id: "funil_checkout", label: "Funil de Checkout", icon: Layers },
    { id: "transacoes", label: "Extrato de Transações", icon: Receipt, count: filteredTransactions.length },
    { id: "produtos", label: "Produtos & Planos", icon: ShoppingBag },
    { id: "gateways", label: "Gateways & Meios", icon: Plug },
  ];

  return (
    <div className="space-y-7">
      {/* Top Header */}
      <div>
        <Link
          href={basePath}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors mb-2.5"
        >
          <ArrowLeft className="size-3.5" />
          <span>Voltar para Central de Análises</span>
        </Link>
        <PageHeader
          eyebrow="Visão • Inteligência Financeira"
          title="Análise de Vendas & Checkout"
          description="Acompanhe faturamento bruto e líquido, conversão no checkout, recuperação de carrinho e extrato de vendas."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <PeriodSelector period={period} onChange={setPeriod} />
              <Button
                variant="outline"
                size="md"
                onClick={() => setExportModalOpen(true)}
                className="gap-2 font-semibold"
              >
                <Download className="size-4" aria-hidden="true" />
                <span>Exportar Relatório</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* 4 Primary Hero Cards (Spacious & Clean) */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores Financeiros Principais">
        <MetricCard
          label="Faturamento Bruto"
          value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            kpis.grossRevenue,
          )}
          helper="vs. mês anterior"
          icon={DollarSign}
          tone="primary"
          tooltipText="Total faturado no período antes de taxas de gateway e deduções."
          trend={{ value: "+14.3%", isPositive: true }}
          sparklineData={[54, 61, 68, 72, 79, 83, 89, 95]}
        />

        <MetricCard
          label="Faturamento Líquido"
          value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            kpis.netRevenue,
          )}
          helper="Líquido liberado"
          icon={Wallet}
          tone="sage"
          tooltipText="Valor líquido transferido após desconto das taxas de Eduzz e Hotmart."
          trend={{ value: "+14.1%", isPositive: true }}
          sparklineData={[49, 56, 63, 66, 72, 76, 82, 87]}
        />

        <MetricCard
          label="Vendas Aprovadas"
          value={`${kpis.ordersCount} pedidos`}
          helper="+32 pedidos no mês"
          icon={Receipt}
          tone="cyan"
          tooltipText="Número total de transações de compra aprovadas e pagas com sucesso."
          trend={{ value: "+12.7%", isPositive: true }}
          sparklineData={[165, 182, 204, 215, 236, 250, 268, 284]}
        />

        <MetricCard
          label="Ticket Médio"
          value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            kpis.averageTicket,
          )}
          helper="+R$ 18 vs. mês ant."
          icon={ShoppingBag}
          tone="terracotta"
          tooltipText="Valor médio pago por cliente por transação aprovada."
          trend={{ value: "+5.7%", isPositive: true }}
          sparklineData={[327, 336, 335, 334, 334, 333, 332, 334]}
        />
      </section>

      {/* Secondary Performance Banner */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
              <Percent className="size-4.5" />
            </span>
            <div>
              <p className="text-xs text-muted font-medium">Conversão de Checkout</p>
              <p className="font-display text-lg font-bold text-foreground">{kpis.conversionRate}%</p>
            </div>
          </div>
          <Chip size="sm" variant="soft" color="success">
            +0.6 p.p.
          </Chip>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-warning-soft text-warning-soft-foreground">
              <RotateCcw className="size-4.5" />
            </span>
            <div>
              <p className="text-xs text-muted font-medium">Taxa de Reembolso</p>
              <p className="font-display text-lg font-bold text-foreground">{kpis.refundRate}%</p>
            </div>
          </div>
          <span className="text-xs text-muted font-medium">3 estornos no período</span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-success-soft text-success-soft-foreground">
              <ShoppingCart className="size-4.5" />
            </span>
            <div>
              <p className="text-xs text-muted font-medium">Carrinhos Resgatados</p>
              <p className="font-display text-lg font-bold text-foreground">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  abandonedCartStats.recoveredRevenue,
                )}
              </p>
            </div>
          </div>
          <Chip size="sm" variant="soft" color="success">
            {abandonedCartStats.recoveryRate}% resgate
          </Chip>
        </div>
      </section>

      {/* Clean Segmented Tab Control Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-separator">
        {tabOptions.map((tab) => {
          const isSelected = selectedTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer border",
                isSelected
                  ? "bg-accent-soft text-accent-soft-foreground border-accent shadow-xs"
                  : "bg-surface text-muted border-border hover:border-accent/40 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[11px] font-bold",
                    isSelected ? "bg-accent text-accent-foreground" : "bg-background-secondary text-muted",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: VISÃO GERAL & FATURAMENTO */}
      {/* ======================================================== */}
      {selectedTab === "visao_geral" && (
        <div className="space-y-6 pt-1">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Interactive Chart Card */}
            <Card className="lg:col-span-2">
              <Card.Header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-separator">
                <div>
                  <div className="flex items-center gap-2">
                    <Card.Title className="font-display text-lg font-bold text-foreground">
                      Evolução de Desempenho Financeiro
                    </Card.Title>
                    <Chip size="sm" variant="soft" color="success">
                      +75% no ano
                    </Chip>
                  </div>
                  <Card.Description className="text-xs text-muted mt-0.5">
                    Comparativo de faturamento bruto e líquido consolidado por mês
                  </Card.Description>
                </div>

                {/* Metric Filter */}
                <div className="flex items-center rounded-lg border border-border bg-background-secondary p-1">
                  <button
                    type="button"
                    onClick={() => setChartMetric("revenue")}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                      chartMetric === "revenue"
                        ? "bg-accent-soft text-accent-soft-foreground shadow-xs font-bold"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    Receita (R$)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric("orders")}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                      chartMetric === "orders"
                        ? "bg-accent-soft text-accent-soft-foreground shadow-xs font-bold"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    Vendas (Qtd)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric("ticket")}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                      chartMetric === "ticket"
                        ? "bg-accent-soft text-accent-soft-foreground shadow-xs font-bold"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    Ticket Médio
                  </button>
                </div>
              </Card.Header>

              <Card.Content className="pt-4 space-y-4">
                {/* Legend & Summary */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted pb-2 border-b border-separator/60">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="size-3 rounded-sm bg-accent" />
                      <span className="font-semibold text-foreground">
                        {chartMetric === "revenue"
                          ? "Faturamento Bruto"
                          : chartMetric === "orders"
                          ? "Pedidos Aprovados"
                          : "Ticket Médio"}
                      </span>
                    </span>
                    {chartMetric === "revenue" && (
                      <span className="flex items-center gap-1.5">
                        <span className="size-3 rounded-sm bg-success" />
                        <span>Líquido Liberado</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-medium text-foreground">
                    Previsão de Fechamento:{" "}
                    <strong className="text-accent font-display">
                      R$ {kpis.forecastRevenue.toLocaleString("pt-BR")}
                    </strong>
                  </div>
                </div>

                {/* Clean SVG Bars Chart */}
                <div className="grid grid-cols-8 gap-2 sm:gap-4 h-56 items-end pt-4 pb-2">
                  {revenueEvolution.map((item) => {
                    const maxVal =
                      chartMetric === "revenue" ? 100000 : chartMetric === "orders" ? 300 : 400;
                    const currentVal =
                      chartMetric === "revenue"
                        ? item.gross
                        : chartMetric === "orders"
                        ? item.orders
                        : item.avgTicket;
                    const netVal = chartMetric === "revenue" ? item.net : 0;
                    const heightPct = Math.min(100, Math.max(10, (currentVal / maxVal) * 100));
                    const netHeightPct = Math.min(100, Math.max(8, (netVal / maxVal) * 100));

                    return (
                      <div key={item.period} className="flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="relative w-full max-w-[48px] flex items-end justify-center gap-1.5 h-full">
                          <div
                            className="w-full bg-accent/80 rounded-t-md transition-all group-hover:bg-accent group-hover:shadow-md cursor-pointer"
                            style={{ height: `${heightPct}%` }}
                            title={`Bruto: R$ ${item.gross.toLocaleString()}`}
                          />
                          {chartMetric === "revenue" && (
                            <div
                              className="w-2.5 bg-success/80 rounded-t-md transition-all group-hover:bg-success cursor-pointer"
                              style={{ height: `${netHeightPct}%` }}
                              title={`Líquido: R$ ${item.net.toLocaleString()}`}
                            />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-muted group-hover:text-foreground">
                          {item.period}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card.Content>
            </Card>

            {/* Payment Methods Card */}
            <Card className="flex flex-col justify-between">
              <div>
                <Card.Header className="pb-3 border-b border-separator">
                  <Card.Title className="font-display text-base font-bold text-foreground">
                    Meios de Pagamento
                  </Card.Title>
                  <Card.Description className="text-xs text-muted mt-0.5">
                    Participação no volume e tempo de compensação
                  </Card.Description>
                </Card.Header>

                <Card.Content className="space-y-4 pt-4">
                  {paymentMethods.map((pm) => (
                    <div key={pm.name} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{pm.name}</span>
                          <span className="text-[11px] text-muted">({pm.speed})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-foreground">{pm.share}%</strong>
                          <span className="text-muted">
                            ({new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pm.revenue)})
                          </span>
                        </div>
                      </div>
                      <ProgressBar
                        aria-label={`Participação ${pm.name}`}
                        value={pm.share}
                        color={pm.name === "PIX" ? "success" : pm.name === "Cartão de Crédito" ? "accent" : "warning"}
                      />
                      <div className="flex items-center justify-between text-[11px] text-muted">
                        <span>{pm.count} transações</span>
                        <span className="text-success font-semibold">Aprovação: {pm.approvalRate}</span>
                      </div>
                    </div>
                  ))}
                </Card.Content>
              </div>

              <Card.Footer className="border-t border-separator pt-3 bg-surface-secondary/40">
                <div className="flex items-center justify-between w-full text-xs">
                  <span className="text-muted flex items-center gap-1">
                    <Zap className="size-3.5 text-accent" />
                    <span>PIX lidera faturamento</span>
                  </span>
                  <Chip size="sm" variant="soft" color="success">
                    99.2% aprovação
                  </Chip>
                </div>
              </Card.Footer>
            </Card>
          </div>

          {/* Strategic Insights */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3 shadow-2xs">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <Sparkles className="size-5" />
              </span>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground text-sm">Pico Noturno</p>
                <p className="text-muted leading-relaxed">
                  52% das conversões aprovadas ocorrem entre <strong>19h e 23h</strong>, especialmente em terças e quintas.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3 shadow-2xs">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success-soft-foreground">
                <TrendingUp className="size-5" />
              </span>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground text-sm">Crescimento Anual</p>
                <p className="text-muted leading-relaxed">
                  O <strong>Plano Anual Premium</strong> cresceu 18% no mês e responde por mais da metade da receita.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3 shadow-2xs">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning-soft-foreground">
                <ShoppingCart className="size-5" />
              </span>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground text-sm">Resgate de Carrinho</p>
                <p className="text-muted leading-relaxed">
                  A régua transacional recuperou <strong>R$ 18.420,00</strong> em compras abandonadas (33.9% de resgate).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: FUNIL DE CHECKOUT & RECUPERAÇÃO */}
      {/* ======================================================== */}
      {selectedTab === "funil_checkout" && (
        <div className="space-y-6 pt-1">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Funnel */}
            <Card className="lg:col-span-3">
              <Card.Header className="pb-3 border-b border-separator">
                <div className="flex items-center justify-between w-full">
                  <Card.Title className="font-display text-lg font-bold text-foreground">
                    Funil de Conversão do Checkout
                  </Card.Title>
                  <Chip size="sm" variant="soft" color="accent">
                    Conversão Geral: 2.29%
                  </Chip>
                </div>
                <Card.Description className="text-xs text-muted mt-0.5">
                  Mapeamento das etapas desde a página de vendas até a confirmação do pagamento
                </Card.Description>
              </Card.Header>

              <Card.Content className="space-y-5 pt-5">
                {checkoutFunnel.map((stage, idx) => (
                  <div key={stage.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-full bg-accent-soft text-accent-soft-foreground text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-foreground">{stage.stage}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {stage.dropRate > 0 && (
                          <span className="text-xs font-semibold text-danger">
                            -{stage.dropRate}% desistência
                          </span>
                        )}
                        <span className="font-display font-bold text-foreground text-sm">
                          {stage.count.toLocaleString("pt-BR")} ({stage.percentage}%)
                        </span>
                      </div>
                    </div>

                    <ProgressBar
                      aria-label={`Etapa ${stage.stage}`}
                      value={stage.percentage}
                      color={idx === 3 ? "success" : "accent"}
                      className="w-full"
                    />
                  </div>
                ))}
              </Card.Content>
            </Card>

            {/* Abandoned Cart Card */}
            <Card className="lg:col-span-2 flex flex-col justify-between">
              <div>
                <Card.Header className="pb-3 border-b border-separator">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="size-5 text-accent" />
                    <Card.Title className="font-display text-base font-bold text-foreground">
                      Recuperação de Carrinho
                    </Card.Title>
                  </div>
                  <Card.Description className="text-xs text-muted mt-0.5">
                    Resgate automático via e-mails transacionais
                  </Card.Description>
                </Card.Header>

                <Card.Content className="space-y-4 pt-4 text-xs">
                  <div className="rounded-xl bg-background-secondary p-4 border border-border space-y-2">
                    <span className="text-muted font-medium">Receita Total Recuperada</span>
                    <p className="font-display text-2xl font-bold text-success">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        abandonedCartStats.recoveredRevenue,
                      )}
                    </p>
                    <div className="flex items-center justify-between text-muted pt-1.5 border-t border-separator">
                      <span>{abandonedCartStats.recoveredCount} de {abandonedCartStats.totalAbandoned} carrinhos</span>
                      <strong className="text-foreground">{abandonedCartStats.recoveryRate}% sucesso</strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">Sequência Ativa no Resend:</p>
                    <div className="rounded-lg border border-border p-2.5 flex items-center justify-between bg-surface">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-accent" />
                        <div>
                          <p className="font-semibold text-foreground">E-mail 1 • Lembrete Gentil</p>
                          <p className="text-[11px] text-muted">Disparado 30 min após abandono</p>
                        </div>
                      </div>
                      <Chip size="sm" variant="soft" color="success">Ativo</Chip>
                    </div>

                    <div className="rounded-lg border border-border p-2.5 flex items-center justify-between bg-surface">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-warning" />
                        <div>
                          <p className="font-semibold text-foreground">E-mail 2 • Oferta com Cupom</p>
                          <p className="text-[11px] text-muted">Disparado 24h após abandono</p>
                        </div>
                      </div>
                      <Chip size="sm" variant="soft" color="success">Ativo</Chip>
                    </div>
                  </div>
                </Card.Content>
              </div>

              <Card.Footer className="border-t border-separator pt-3">
                <Link
                  href="/admin/emails"
                  className="w-full text-center text-xs font-semibold text-accent hover:underline"
                >
                  Personalizar Modelos de E-mail de Resgate →
                </Link>
              </Card.Footer>
            </Card>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: EXTRATO DE TRANSAÇÕES */}
      {/* ======================================================== */}
      {selectedTab === "transacoes" && (
        <div className="space-y-4 pt-1">
          <Card>
            <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-separator">
              <div>
                <Card.Title>Extrato de Vendas</Card.Title>
                <Card.Description className="text-xs text-muted mt-0.5">
                  Clique em qualquer linha para abrir a ficha técnica detalhada
                </Card.Description>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center rounded-lg border border-border bg-background-secondary p-1">
                  {(["todos", "Eduzz", "Hotmart"] as const).map((gw) => (
                    <button
                      key={gw}
                      type="button"
                      onClick={() => setGatewayFilter(gw)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                        gatewayFilter === gw
                          ? "bg-accent-soft text-accent-soft-foreground shadow-xs font-bold"
                          : "text-muted hover:text-foreground",
                      )}
                    >
                      {gw === "todos" ? "Todos Gateways" : gw}
                    </button>
                  ))}
                </div>

                <div className="flex items-center rounded-lg border border-border bg-background-secondary p-1">
                  {(["todas", "aprovada", "pendente", "reembolsada"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-all cursor-pointer",
                        statusFilter === st
                          ? "bg-accent-soft text-accent-soft-foreground shadow-xs font-bold"
                          : "text-muted hover:text-foreground",
                      )}
                    >
                      {st === "todas" ? "Todas" : st === "aprovada" ? "Aprovadas" : st === "pendente" ? "Pendentes" : "Reembolsadas"}
                    </button>
                  ))}
                </div>

                <SearchField
                  value={search}
                  onChange={setSearch}
                  className="w-full sm:w-52"
                  aria-label="Buscar transação"
                >
                  <Label className="sr-only">Buscar transação</Label>
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Buscar cliente ou TX..." />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
              </div>
            </Card.Header>

            <Card.Content className="px-0 pb-0 pt-0">
              {filteredTransactions.length === 0 ? (
                <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                  <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                    <Receipt className="size-5 text-muted" aria-hidden="true" />
                  </span>
                  <p className="font-semibold text-foreground">Nenhuma transação encontrada</p>
                  <p className="text-sm text-muted">Ajuste os filtros de busca, gateway ou status.</p>
                </EmptyState>
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table.Root>
                      <Table.ScrollContainer>
                        <Table.Content aria-label="Tabela de transações">
                          <Table.Header>
                            <Table.Column isRowHeader>CÓDIGO / DATA</Table.Column>
                            <Table.Column>CLIENTE</Table.Column>
                            <Table.Column>PRODUTO</Table.Column>
                            <Table.Column>BRUTO</Table.Column>
                            <Table.Column>LÍQUIDO</Table.Column>
                            <Table.Column>MÉTODO</Table.Column>
                            <Table.Column>GATEWAY</Table.Column>
                            <Table.Column>STATUS</Table.Column>
                            <Table.Column>AÇÕES</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {filteredTransactions.map((tx) => (
                              <Table.Row
                                key={tx.id}
                                className="cursor-pointer hover:bg-surface-secondary/60 transition-colors"
                              >
                                <Table.Cell onClick={() => setSelectedTransaction(tx)}>
                                  <div>
                                    <span className="font-mono text-xs font-bold text-foreground">{tx.id}</span>
                                    <p className="text-[11px] text-muted">{tx.date}</p>
                                  </div>
                                </Table.Cell>
                                <Table.Cell onClick={() => setSelectedTransaction(tx)}>
                                  <div>
                                    <p className="font-semibold text-foreground text-xs sm:text-sm">{tx.customer}</p>
                                    <p className="text-[11px] text-muted">{tx.email}</p>
                                  </div>
                                </Table.Cell>
                                <Table.Cell onClick={() => setSelectedTransaction(tx)}>
                                  <div>
                                    <p className="text-xs font-medium text-foreground">{tx.product}</p>
                                    <p className="text-[10px] text-muted">{tx.productType}</p>
                                  </div>
                                </Table.Cell>
                                <Table.Cell onClick={() => setSelectedTransaction(tx)} className="font-display font-bold text-foreground text-xs sm:text-sm">
                                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(tx.amount)}
                                </Table.Cell>
                                <Table.Cell onClick={() => setSelectedTransaction(tx)} className="font-display font-semibold text-success text-xs sm:text-sm">
                                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(tx.netAmount)}
                                </Table.Cell>
                                <Table.Cell onClick={() => setSelectedTransaction(tx)}>
                                  <div className="text-xs">
                                    <span className="font-medium text-foreground">{tx.method}</span>
                                    <p className="text-[10px] text-muted">{tx.installments}</p>
                                  </div>
                                </Table.Cell>
                                <Table.Cell onClick={() => setSelectedTransaction(tx)}>
                                  <Chip size="sm" variant="soft" color="default" className="text-[11px]">
                                    {tx.gateway}
                                  </Chip>
                                </Table.Cell>
                                <Table.Cell onClick={() => setSelectedTransaction(tx)}>
                                  <Chip
                                    size="sm"
                                    variant="soft"
                                    color={
                                      tx.status === "aprovada"
                                        ? "success"
                                        : tx.status === "pendente"
                                        ? "warning"
                                        : "danger"
                                    }
                                  >
                                    {tx.status === "aprovada"
                                      ? "Aprovada"
                                      : tx.status === "pendente"
                                      ? "Pendente"
                                      : "Reembolsada"}
                                  </Chip>
                                </Table.Cell>
                                <Table.Cell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedTransaction(tx)}
                                    className="text-xs"
                                  >
                                    Ver Ficha
                                  </Button>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table.Root>
                  </div>

                  {/* Mobile Cards */}
                  <ul className="divide-y divide-separator md:hidden">
                    {filteredTransactions.map((tx) => (
                      <li
                        key={tx.id}
                        onClick={() => setSelectedTransaction(tx)}
                        className="p-4 space-y-2 cursor-pointer hover:bg-surface-secondary/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-foreground">{tx.id}</span>
                              <Chip size="sm" variant="soft" color="default" className="text-[10px]">
                                {tx.gateway}
                              </Chip>
                            </div>
                            <p className="font-semibold text-foreground text-sm mt-0.5">{tx.customer}</p>
                            <p className="text-xs text-muted">{tx.product}</p>
                          </div>
                          <Chip
                            size="sm"
                            variant="soft"
                            color={tx.status === "aprovada" ? "success" : tx.status === "pendente" ? "warning" : "danger"}
                          >
                            {tx.status === "aprovada" ? "Aprovada" : tx.status === "pendente" ? "Pendente" : "Reembolsada"}
                          </Chip>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-separator">
                          <span className="text-muted">{tx.method} • {tx.date}</span>
                          <strong className="font-display font-bold text-foreground text-sm">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(tx.amount)}
                          </strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card.Content>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PRODUTOS & PLANOS */}
      {/* ======================================================== */}
      {selectedTab === "produtos" && (
        <div className="space-y-4 pt-1">
          <Card>
            <Card.Header className="pb-3 border-b border-separator">
              <Card.Title>Performance de Faturamento por Produto & Plano</Card.Title>
              <Card.Description className="text-xs text-muted mt-0.5">
                Detalhamento de volume, faturamento, preço médio e taxa de reembolso
              </Card.Description>
            </Card.Header>

            <Card.Content className="pt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {topProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="rounded-xl border border-border bg-background-secondary p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{prod.type}</span>
                        <h4 className="font-display font-bold text-foreground text-base mt-0.5">{prod.name}</h4>
                      </div>
                      <Chip size="sm" variant="soft" color="success">
                        {prod.growth}
                      </Chip>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">Participação na Receita:</span>
                        <strong className="text-foreground">{prod.share}%</strong>
                      </div>
                      <ProgressBar
                        aria-label={`Share ${prod.name}`}
                        value={prod.share}
                        color="accent"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-separator text-xs">
                      <div>
                        <span className="text-muted block text-[11px]">Faturamento</span>
                        <strong className="text-foreground font-display font-bold text-sm">{prod.total}</strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">Unidades</span>
                        <strong className="text-foreground font-semibold text-sm">{prod.units} un.</strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">Reembolso</span>
                        <strong className="text-muted font-semibold text-sm">{prod.refundRate}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: GATEWAYS & INTEGRAÇÕES */}
      {/* ======================================================== */}
      {selectedTab === "gateways" && (
        <div className="space-y-4 pt-1">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="space-y-4">
              <Card.Header className="pb-3 border-b border-separator">
                <Card.Title>Status dos Gateways de Pagamento</Card.Title>
                <Card.Description className="text-xs text-muted mt-0.5">
                  Monitoramento de volume processado e latência de webhooks
                </Card.Description>
              </Card.Header>

              <Card.Content className="space-y-4 pt-4">
                {gatewayShare.map((gw) => (
                  <div
                    key={gw.name}
                    className="p-4 rounded-xl border border-border bg-background-secondary space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                          <Plug className="size-5" />
                        </span>
                        <div>
                          <p className="font-display font-bold text-foreground text-base">{gw.name}</p>
                          <p className="text-xs text-muted">{gw.count} vendas processadas no período</p>
                        </div>
                      </div>
                      <Chip size="sm" variant="soft" color="success">
                        {gw.share}% volume
                      </Chip>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-separator text-xs">
                      <div>
                        <span className="text-muted block text-[11px]">Volume Total</span>
                        <strong className="text-foreground font-display font-bold">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(gw.revenue)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">Taxa Média</span>
                        <strong className="text-foreground font-semibold">{gw.avgFee}</strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">Webhook Latency</span>
                        <strong className="text-success font-semibold">{gw.webhookLatency}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </Card.Content>
            </Card>

            <Card className="flex flex-col justify-between">
              <div>
                <Card.Header className="pb-3 border-b border-separator">
                  <Card.Title>Webhooks & Sincronização</Card.Title>
                  <Card.Description className="text-xs text-muted mt-0.5">
                    Integração com Eduzz e Hotmart em tempo real
                  </Card.Description>
                </Card.Header>
                <Card.Content className="text-xs text-muted space-y-3 pt-4">
                  <div className="p-3.5 rounded-xl border border-border bg-background-secondary space-y-1.5">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-success" />
                      <span>Sincronização Instantânea Ativa</span>
                    </p>
                    <p>
                      Quando uma venda é aprovada no gateway parceiro, o aluno recebe as credenciais de acesso imediatamente e tem seu curso liberado.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-background-secondary space-y-1.5">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <RotateCcw className="size-4 text-warning" />
                      <span>Tratamento de Estorno Automático</span>
                    </p>
                    <p>
                      Casos de cancelamento ou chargeback bloqueiam o acesso à plataforma e cancelam a matrícula sem necessidade de intervenção manual.
                    </p>
                  </div>
                </Card.Content>
              </div>

              <Card.Footer className="border-t border-separator pt-3">
                <Link
                  href="/admin/integracoes"
                  className="w-full text-center text-xs font-semibold text-accent hover:underline"
                >
                  Gerenciar Chaves de API e Webhooks da Eduzz / Hotmart →
                </Link>
              </Card.Footer>
            </Card>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DETALHES DA TRANSAÇÃO / RECIBO FISCAL */}
      {/* ======================================================== */}
      <Modal.Root isOpen={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            {selectedTransaction && (
              <Modal.Dialog>
                <Modal.Header>
                  <div className="flex items-center justify-between w-full pr-6">
                    <div className="flex items-center gap-2">
                      <Receipt className="size-5 text-accent" />
                      <span>Ficha da Transação {selectedTransaction.id}</span>
                    </div>
                    <Chip
                      size="sm"
                      variant="soft"
                      color={
                        selectedTransaction.status === "aprovada"
                          ? "success"
                          : selectedTransaction.status === "pendente"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {selectedTransaction.status.toUpperCase()}
                    </Chip>
                  </div>
                </Modal.Header>

                <Modal.Body className="space-y-5">
                  {/* Summary Box */}
                  <div className="rounded-xl border border-border bg-background-secondary p-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <span className="text-[11px] font-semibold text-muted uppercase">Produto Adquirido</span>
                      <p className="font-bold text-foreground text-sm mt-0.5">{selectedTransaction.product}</p>
                      <p className="text-xs text-muted">{selectedTransaction.productType}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[11px] font-semibold text-muted uppercase">Data & Hora</span>
                      <p className="font-bold text-foreground text-sm mt-0.5">{selectedTransaction.date}</p>
                      <p className="text-xs text-muted font-mono">{selectedTransaction.externalId}</p>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">Dados do Comprador</h4>
                    <div className="grid grid-cols-3 gap-2 rounded-xl border border-border p-3 text-xs">
                      <div>
                        <span className="text-muted block text-[11px]">Nome do Aluno</span>
                        <strong className="text-foreground">{selectedTransaction.customer}</strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">E-mail</span>
                        <strong className="text-foreground">{selectedTransaction.email}</strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">Documento</span>
                        <strong className="text-foreground font-mono">{selectedTransaction.document}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">Detalhamento Financeiro & Taxas</h4>
                    <div className="rounded-xl border border-border p-3 text-xs space-y-2 bg-surface">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Valor Bruto Pago:</span>
                        <strong className="text-foreground font-display font-bold text-sm">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(selectedTransaction.amount)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-muted">
                        <span>Taxa de Processamento ({selectedTransaction.gateway}):</span>
                        <span className="text-danger font-semibold">
                          -{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(selectedTransaction.fee)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-separator">
                        <span className="font-semibold text-foreground">Valor Líquido Liberado:</span>
                        <strong className="font-display font-bold text-success text-base">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(selectedTransaction.netAmount)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                        <span>Forma de Pagamento: {selectedTransaction.method}</span>
                        <span>Condição: {selectedTransaction.installments}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline History */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">Linha do Tempo de Eventos</h4>
                    <div className="space-y-2">
                      {selectedTransaction.timeline.map((event, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-foreground font-medium">{event.title}</span>
                            <span className="text-muted font-mono text-[11px]">{event.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Modal.Body>

                <Modal.Footer className="flex flex-wrap items-center justify-between gap-3">
                  <Button variant="tertiary" onClick={() => setSelectedTransaction(null)}>
                    Fechar
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendReceipt(selectedTransaction)}
                      className="gap-1.5"
                    >
                      <Send className="size-3.5" />
                      <span>Reenviar Recibo</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        toast.success(`Abrindo transação no painel da ${selectedTransaction.gateway}...`);
                      }}
                      className="gap-1.5"
                    >
                      <span>Ver no {selectedTransaction.gateway}</span>
                      <ArrowUpRight className="size-3.5" />
                    </Button>
                  </div>
                </Modal.Footer>
              </Modal.Dialog>
            )}
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

      {/* ======================================================== */}
      {/* MODAL: EXPORTAR RELATÓRIO FINANCEIRO */}
      {/* ======================================================== */}
      <Modal.Root isOpen={exportModalOpen} onOpenChange={setExportModalOpen}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>Exportar Relatório de Vendas</Modal.Header>
              <Modal.Body className="space-y-4 text-xs">
                <p className="text-muted">
                  Selecione o formato desejado para download do extrato consolidado de vendas e transações financeiras.
                </p>

                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => handleExport("csv")}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface hover:border-accent hover:bg-accent-soft/30 transition-all text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="size-5 text-accent" />
                      <div>
                        <p className="font-semibold text-foreground text-sm">Arquivo CSV (Planilhas)</p>
                        <p className="text-muted text-[11px]">Compatível com Excel, Google Planilhas e bancos de dados</p>
                      </div>
                    </div>
                    <Download className="size-4 text-muted" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExport("pdf")}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface hover:border-accent hover:bg-accent-soft/30 transition-all text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="size-5 text-accent" />
                      <div>
                        <p className="font-semibold text-foreground text-sm">Relatório Executivo em PDF</p>
                        <p className="text-muted text-[11px]">Gráficos, macro indicadores e resumo para diretoria</p>
                      </div>
                    </div>
                    <Download className="size-4 text-muted" />
                  </button>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onClick={() => setExportModalOpen(false)}>
                  Cancelar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </div>
  );
}
