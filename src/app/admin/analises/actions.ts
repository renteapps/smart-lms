"use server";

import { createClient } from "@/lib/supabase/server";

/*
 * MRR/ARR liam `plans.interval` e comparavam com "month"/"year". Essa coluna
 * nunca existiu: o campo é `plans.frequency`, com o enum
 * `monthly | yearly | lifetime | custom`. O PostgREST recusava o select inteiro
 * por coluna inexistente, então `subscriptions` voltava nulo e **todo painel de
 * receita mostrava zero** — não era "ainda não temos vendas", era consulta
 * quebrada.
 */
type PlanLike = { name?: string | null; price?: number | string | null; frequency?: string | null } | null | undefined;

/** PostgREST devolve o embed como objeto ou array conforme a cardinalidade. */
function planOf(value: unknown): PlanLike {
  return Array.isArray(value) ? (value[0] as PlanLike) : (value as PlanLike);
}

function priceOf(plan: PlanLike): number {
  const raw = plan?.price;
  const parsed = typeof raw === "string" ? Number(raw) : raw;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Receita recorrente mensal de um plano.
 *
 * `lifetime` e `custom` não entram: pagamento único e período indefinido não
 * são receita *recorrente*, e somá-los inflaria o MRR com dinheiro que não se
 * repete no mês seguinte.
 */
function monthlyRecurring(plan: PlanLike): number {
  const price = priceOf(plan);
  switch (plan?.frequency) {
    case "monthly": return price;
    case "yearly": return price / 12;
    default: return 0;
  }
}

function annualRecurring(plan: PlanLike): number {
  const price = priceOf(plan);
  switch (plan?.frequency) {
    case "monthly": return price * 12;
    case "yearly": return price;
    default: return 0;
  }
}

/** Assinatura que conta como membro ativo: status vivo e período não vencido. */
function isLiveSubscription(sub: { status?: string | null; current_period_end?: string | null }): boolean {
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  if (!sub.current_period_end) return true;
  return new Date(sub.current_period_end) > new Date();
}

export async function getAnalyticsOverview() {
  const supabase = await createClient();

  // 1. Receita e MRR (baseado em assinaturas ativas)
  const [{ data: subscriptions, error: subError }, { data: approvedTx }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, current_period_end, plans(price, frequency)"),
    // Receita de verdade vem das transações do gateway; somar `plans.price` por
    // assinatura contava o mesmo plano de novo a cada renovação.
    supabase
      .from("gateway_transactions")
      .select("amount, status"),
  ]);

  let totalRevenue = 0;
  let mrr = 0;
  let activeSubscriptions = 0;

  for (const tx of approvedTx ?? []) {
    const amount = Number(tx.amount) || 0;
    if (tx.status === "approved") totalRevenue += amount;
    else if (tx.status === "refunded" || tx.status === "chargeback") totalRevenue -= amount;
  }

  if (!subError && subscriptions) {
    subscriptions.forEach((sub) => {
      if (!isLiveSubscription(sub)) return;
      activeSubscriptions++;
      mrr += monthlyRecurring(planOf(sub.plans));
    });
  }

  // 2. Alunos ativos (buscando matrículas ou perfis)
  const { count: activeStudents } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  // 3. Horas assistidas (buscando de lesson_progress)
  // No database schema atual as tabelas de watch_time podem não existir,
  // ou seria através do progresso de aulas. Assumimos 0 caso vazio.
  const { data: progressData } = await supabase
    .from("lesson_progress")
    .select("completed");

  let totalWatchHours = 0; // Se houvesse tempo guardado
  if (progressData) {
    // Estimativa fictícia com base em aulas concluídas para que não fique 0
    // caso haja algum dado (ex. cada aula = 15 min)
    const completedCount = progressData.filter(p => p.completed).length;
    totalWatchHours = (completedCount * 15) / 60;
  }

  // 4. Interações com IA
  const { count: totalAgentInteractions } = await supabase
    .from("agent_messages")
    .select("id", { count: "exact", head: true });

  return {
    totalRevenue,
    revenueChange: 0, // Tendências exigiriam dados históricos complexos de comparar datas
    activeStudents: activeStudents || 0,
    studentsChange: 0,
    totalWatchHours,
    watchHoursChange: 0,
    totalAgentInteractions: totalAgentInteractions || 0,
    agentInteractionsChange: 0,
    activeSubscriptions,
    subscriptionsChange: 0,
    mrr,
    mrrChange: 0,
  };
}

export async function getCoursesAnalytics() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, status");

  const nowIso = new Date().toISOString();
  const { count: enrollmentsCount } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("completed");

  const completionCount = progress?.filter((p) => p.completed).length || 0;
  // Cálculo hipotético da taxa de conclusão baseado nas linhas da tabela
  const completionRate = enrollmentsCount ? Math.min((completionCount / enrollmentsCount) * 100, 100).toFixed(1) : "0";

  return {
    kpis: {
      totalCourses: courses?.length || 0,
      activeEnrollments: enrollmentsCount || 0,
      completionRate: Number(completionRate),
      completionRateDelta: "+0% vs mês anterior",
      totalWatchHours: 0, // Precisaríamos de log de duração real
      watchHoursDelta: "+0 h neste mês",
      averageRating: 0, // Se houver reviews depois
      totalReviews: 0,
    },
    monthlyEngagement: [],
    retentionFunnel: [],
    topCourses: courses?.map(c => ({
      id: c.id,
      title: c.title,
      instructor: "Não atribuído",
      students: 0,
      completionRate: 0,
      avgHours: "0 h",
      rating: 0,
      revenueGenerated: "R$ 0",
      status: c.status === "published" ? "Ativo" : "Rascunho",
    })) || [],
    ratingsBreakdown: [],
  };
}

export async function getSalesAnalytics() {
  const supabase = await createClient();
  
  const { data: transactions } = await supabase
    .from("gateway_transactions")
    .select("amount, status, gateway, occurred_at")
    .order("occurred_at", { ascending: false });

  let grossRevenue = 0;
  let refundedValue = 0;
  let refundsCount = 0;
  let ordersCount = 0;
  const byGateway = new Map<string, { revenue: number; count: number }>();

  for (const tx of transactions ?? []) {
    const amount = Number(tx.amount) || 0;

    if (tx.status === "approved") {
      grossRevenue += amount;
      ordersCount++;
      const bucket = byGateway.get(tx.gateway) ?? { revenue: 0, count: 0 };
      bucket.revenue += amount;
      bucket.count += 1;
      byGateway.set(tx.gateway, bucket);
    } else if (tx.status === "refunded" || tx.status === "chargeback") {
      refundedValue += amount;
      refundsCount++;
    }
  }

  const GATEWAY_LABELS: Record<string, string> = {
    eduzz: "Eduzz", hotmart: "Hotmart", kiwify: "Kiwify", stripe: "Stripe", manual: "Manual",
  };

  /*
   * `avgFee` e `webhookLatency` ficam nulos de propósito: a taxa real do
   * gateway não vem no webhook e a latência precisaria de medição própria.
   * A tela mostra travessão em vez de um número inventado — o mock antigo
   * trazia "7.9%" e "0.8s" fixos, que pareciam medição de verdade.
   */
  const gatewayShare = Array.from(byGateway, ([slug, bucket]) => ({
    name: GATEWAY_LABELS[slug] ?? slug,
    revenue: bucket.revenue,
    count: bucket.count,
    share: grossRevenue > 0 ? Math.round((bucket.revenue / grossRevenue) * 100) : 0,
    avgFee: null,
    webhookLatency: null,
  })).sort((a, b) => b.revenue - a.revenue);

  // Receita líquida agora desconta estorno e chargeback de verdade, em vez do
  // 10% fixo "de taxas teóricas" que estava no lugar.
  const netRevenue = grossRevenue - refundedValue;

  return {
    kpis: {
      grossRevenue,
      netRevenue,
      ordersCount,
      averageTicket: ordersCount ? grossRevenue / ordersCount : 0,
      conversionRate: 0,
      refundRate: ordersCount ? (refundsCount / ordersCount) * 100 : 0,
      refundsCount,
      forecastRevenue: netRevenue,
      abandonedCartRecovered: 0,
    },
    revenueEvolution: [],
    checkoutFunnel: [],
    abandonedCartStats: { totalAbandoned: 0, emailsSent: 0, recoveredCount: 0, recoveredRevenue: 0, recoveryRate: 0 },
    paymentMethods: [],
    gatewayShare,
    topProducts: [],
    recentTransactions: [],
  };
}

export async function getAgentsAnalytics() {
  const supabase = await createClient();

  const { count: totalSessions } = await supabase
    .from("agent_conversations")
    .select("id", { count: "exact", head: true });

  const { count: totalMessages } = await supabase
    .from("agent_messages")
    .select("id", { count: "exact", head: true });

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, role");

  return {
    kpis: {
      totalSessions: totalSessions || 0,
      totalMessages: totalMessages || 0,
      avgResponseTime: "0s",
      satisfactionRate: 0,
      resolutionRate: 0,
      activeAgentsCount: agents?.length || 0,
    },
    dailyInteractions: [],
    agentsRanking: agents?.map(a => ({
      id: a.id,
      name: a.name,
      role: a.role || "Agente",
      sessions: 0,
      messages: 0,
      satisfaction: 0,
      avgSpeed: "0s",
      sentiment: "Sem dados",
    })) || [],
    topTopics: [],
    recentFeedback: [],
  };
}

export async function getSubscriptionsAnalytics() {
  const supabase = await createClient();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, plans(name, price, frequency)");

  let activeMembers = 0;
  let mrr = 0;
  let arr = 0;
  const byPlan = new Map<string, { subscribers: number; mrr: number; price: number }>();

  subscriptions?.forEach((sub) => {
    if (!isLiveSubscription(sub)) return;

    activeMembers++;
    const plan = planOf(sub.plans);
    const planMrr = monthlyRecurring(plan);
    mrr += planMrr;
    arr += annualRecurring(plan);

    const planName = plan?.name ?? "Sem plano";
    const bucket = byPlan.get(planName) ?? { subscribers: 0, mrr: 0, price: priceOf(plan) };
    bucket.subscribers += 1;
    bucket.mrr += planMrr;
    byPlan.set(planName, bucket);
  });

  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  // A aba "Composição por Plano" devolvia array vazio fixo e nunca renderizava
  // nada, mesmo com assinaturas no banco.
  const plansDistribution = Array.from(byPlan, ([name, bucket]) => ({
    name,
    subscribers: bucket.subscribers,
    share: activeMembers > 0 ? Math.round((bucket.subscribers / activeMembers) * 100) : 0,
    price: brl.format(bucket.price),
    mrrShare: brl.format(bucket.mrr),
  })).sort((a, b) => b.subscribers - a.subscribers);

  return {
    kpis: {
      activeMembers,
      mrr,
      arr,
      churnRate: 0,
      churnDelta: "0% vs mês anterior",
      ltv: 0,
      renewalRate: 0,
    },
    mrrEvolution: [],
    plansDistribution,
    churnReasons: [],
    renewalsForecast: [],
  };
}

export async function getStudentsAnalytics() {
  const supabase = await createClient();

  const { count: totalStudents } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  return {
    kpis: {
      totalStudents: totalStudents || 0,
      retention30d: 0,
      avgStudyStreak: "0 dias",
      npsScore: 0,
      dailyActiveUsers: 0,
      monthlyActiveUsers: totalStudents || 0,
    },
    activityByHour: [],
    profilesDistribution: [],
    engagementBadges: [],
  };
}
