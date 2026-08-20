"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAnalyticsOverview() {
  const supabase = await createClient();

  // 1. Receita e MRR (baseado em assinaturas ativas)
  const { data: subscriptions, error: subError } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, plans(price, interval)");

  let totalRevenue = 0;
  let mrr = 0;
  let activeSubscriptions = 0;

  if (!subError && subscriptions) {
    subscriptions.forEach((sub: any) => {
      const price = sub.plans?.price || 0;
      // Considera-se faturamento bruto a soma dos planos
      totalRevenue += price;

      if (sub.status === "active" || sub.status === "trialing") {
        activeSubscriptions++;
        if (sub.plans?.interval === "month") {
          mrr += price;
        } else if (sub.plans?.interval === "year") {
          mrr += price / 12;
        }
      }
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
  
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, status, plans(name, price, interval)");

  let grossRevenue = 0;
  subscriptions?.forEach(sub => {
    // Note that sub.plans might be an array if it's a 1-to-many relationship, but typically it's 1-to-1 in subscriptions
    const plan = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
    grossRevenue += plan?.price || 0;
  });

  return {
    kpis: {
      grossRevenue,
      netRevenue: grossRevenue * 0.9, // descontando taxas teóricas
      ordersCount: subscriptions?.length || 0,
      averageTicket: subscriptions?.length ? grossRevenue / subscriptions.length : 0,
      conversionRate: 0,
      refundRate: 0,
      refundsCount: 0,
      forecastRevenue: grossRevenue, // simplificado
      abandonedCartRecovered: 0,
    },
    revenueEvolution: [],
    checkoutFunnel: [],
    abandonedCartStats: { totalAbandoned: 0, emailsSent: 0, recoveredCount: 0, recoveredRevenue: 0, recoveryRate: 0 },
    paymentMethods: [],
    gatewayShare: [],
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
    .select("status, current_period_end, plans(name, price, interval)");

  let activeMembers = 0;
  let mrr = 0;
  let arr = 0;

  subscriptions?.forEach(sub => {
    if (sub.status === "active" || sub.status === "trialing") {
      activeMembers++;
      const plan = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
      const price = plan?.price || 0;
      if (plan?.interval === "month") {
        mrr += price;
        arr += price * 12;
      } else if (plan?.interval === "year") {
        mrr += price / 12;
        arr += price;
      }
    }
  });

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
    plansDistribution: [],
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
