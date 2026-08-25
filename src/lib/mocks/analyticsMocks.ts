export interface AnalyticsOverview {
  totalRevenue: number;
  revenueChange: number | null;
  activeStudents: number;
  studentsChange: number | null;
  totalWatchHours: number;
  watchHoursChange: number | null;
  totalAgentInteractions: number;
  agentInteractionsChange: number | null;
  activeSubscriptions: number;
  subscriptionsChange: number | null;
  mrr: number;
  mrrChange: number | null;
}

export interface AnalyticsCardItem {
  id: string;
  title: string;
  description: string;
  href: string;
  iconName: string;
  tone: "primary" | "sage" | "terracotta" | "purple" | "cyan";
  badgeText?: string;
  metrics: {
    label: string;
    value: string;
    trend?: {
      value: string;
      isPositive: boolean;
    };
  }[];
  sparkline: number[];
  highlights: string[];
}

export const MOCK_ANALYTICS_OVERVIEW: AnalyticsOverview = {
  totalRevenue: 94850,
  revenueChange: 14.3,
  activeStudents: 1248,
  studentsChange: 8.2,
  totalWatchHours: 12540,
  watchHoursChange: 12.1,
  totalAgentInteractions: 8420,
  agentInteractionsChange: 27.5,
  activeSubscriptions: 1140,
  subscriptionsChange: 5.6,
  mrr: 48950,
  mrrChange: 9.8,
};

export const MOCK_ANALYTICS_CARDS: AnalyticsCardItem[] = [
  {
    id: "cursos",
    title: "Análise de Cursos",
    description: "Engajamento, taxa de conclusão, horas assistidas e retenção detalhada por aula e módulo.",
    href: "/admin/analises/cursos",
    iconName: "BookOpen",
    tone: "sage",
    badgeText: "24 Cursos Ativos",
    metrics: [
      { label: "Conclusão Média", value: "68%", trend: { value: "+4.2%", isPositive: true } },
      { label: "Horas Assistidas", value: "12,5k h", trend: { value: "+1.4k h", isPositive: true } },
      { label: "Avaliação Geral", value: "4.9 ★", trend: { value: "+0.1", isPositive: true } },
    ],
    sparkline: [45, 52, 49, 60, 58, 64, 68, 72, 70, 78],
    highlights: ["Curso mais assistido: 'Design System & UI Master'", "Maior taxa de conclusão no Módulo 2"],
  },
  {
    id: "vendas",
    title: "Análise de Vendas",
    description: "Faturamento bruto/líquido, conversão no checkout, ticket médio e transações por gateway.",
    href: "/admin/analises/vendas",
    iconName: "TrendingUp",
    tone: "primary",
    badgeText: "R$ 94,8k no mês",
    metrics: [
      { label: "Faturamento", value: "R$ 94.850", trend: { value: "+14.3%", isPositive: true } },
      { label: "Ticket Médio", value: "R$ 334", trend: { value: "+R$ 18", isPositive: true } },
      { label: "Vendas Concluídas", value: "284", trend: { value: "+32", isPositive: true } },
    ],
    sparkline: [28, 35, 42, 39, 55, 62, 58, 70, 82, 94],
    highlights: ["PIX representa 58% do total de pagamentos", "Eduzz converteu 72% das transações"],
  },
  {
    id: "agentes",
    title: "Agentes de IA",
    description: "Volume de conversas, satisfação das respostas, tempo de retorno e tópicos mais demandados.",
    href: "/admin/analises/agentes",
    iconName: "Bot",
    tone: "purple",
    badgeText: "8.4k Conversas",
    metrics: [
      { label: "Sessões Ativas", value: "8.420", trend: { value: "+27.5%", isPositive: true } },
      { label: "CSAT Alunos", value: "94.8%", trend: { value: "+2.1%", isPositive: true } },
      { label: "Tempo de Resposta", value: "1.1s", trend: { value: "-0.3s", isPositive: true } },
    ],
    sparkline: [12, 19, 25, 30, 42, 55, 63, 71, 79, 84],
    highlights: ["Tutor Socrático é o agente mais acionado", "92% das dúvidas resolvidas na 1ª tentativa"],
  },
  {
    id: "assinaturas",
    title: "Assinaturas & MRR",
    description: "Métricas recorrentes de MRR/ARR, Churn Rate, LTV, renovações e retenção de membros.",
    href: "/admin/analises/assinaturas",
    iconName: "CreditCard",
    tone: "terracotta",
    badgeText: "1.140 Assinantes",
    metrics: [
      { label: "MRR Atual", value: "R$ 48.950", trend: { value: "+9.8%", isPositive: true } },
      { label: "Taxa de Churn", value: "1.9%", trend: { value: "-0.4%", isPositive: true } },
      { label: "LTV Estimado", value: "R$ 1.480", trend: { value: "+R$ 120", isPositive: true } },
    ],
    sparkline: [30, 32, 34, 38, 41, 43, 44, 46, 47, 49],
    highlights: ["Plano Pro representa 54% da base ativa", "86 renovações previstas nos próximos 7 dias"],
  },
  {
    id: "alunos",
    title: "Alunos & Engajamento",
    description: "Retenção de 30 dias, streaks diários de estudo, distribuição por perfil e horários de pico.",
    href: "/admin/analises/alunos",
    iconName: "Users",
    tone: "cyan",
    badgeText: "1.248 Ativos",
    metrics: [
      { label: "Retenção 30d", value: "74.2%", trend: { value: "+3.8%", isPositive: true } },
      { label: "Streak Médio", value: "4.8 dias", trend: { value: "+0.6d", isPositive: true } },
      { label: "NPS Alunos", value: "+78", trend: { value: "+4 pts", isPositive: true } },
    ],
    sparkline: [40, 48, 52, 60, 68, 74, 80, 88],
    highlights: ["Horário com mais acessos: 19h às 22h", "78% dos alunos ativos utilizam pílulas diárias"],
  },
];

// --- Mock Data for Courses Analytics ---
export const MOCK_COURSES_ANALYTICS = {
  kpis: {
    totalCourses: 24,
    activeEnrollments: 3420,
    completionRate: 68.4,
    completionRateDelta: "+4.2% vs mês anterior",
    totalWatchHours: 12540,
    watchHoursDelta: "+1.400 h neste mês",
    averageRating: 4.88,
    totalReviews: 864,
  },
  monthlyEngagement: [
    { period: "Jan", watchHours: 820, completions: 42 },
    { period: "Fev", watchHours: 950, completions: 58 },
    { period: "Mar", watchHours: 1100, completions: 72 },
    { period: "Abr", watchHours: 1050, completions: 69 },
    { period: "Mai", watchHours: 1320, completions: 89 },
    { period: "Jun", watchHours: 1480, completions: 104 },
    { period: "Jul", watchHours: 1650, completions: 120 },
    { period: "Ago", watchHours: 1890, completions: 145 },
  ],
  retentionFunnel: [
    { stage: "Matrícula Realizada", count: 100, percentage: 100, dropRate: 0 },
    { stage: "Módulo 1: Fundamentos", count: 91, percentage: 91, dropRate: 9 },
    { stage: "Módulo 2: Prática Essencial", count: 79, percentage: 79, dropRate: 12 },
    { stage: "Módulo 3: Projetos Avançados", count: 71, percentage: 71, dropRate: 8 },
    { stage: "Avaliação & Certificado", count: 68, percentage: 68, dropRate: 3 },
  ],
  topCourses: [
    {
      id: "course_1",
      title: "Comunicação que Move Pessoas",
      instructor: "Marina Souza",
      students: 842,
      completionRate: 78,
      avgHours: "6.4 h",
      rating: 4.95,
      revenueGenerated: "R$ 41.258",
      status: "Alta demanda",
    },
    {
      id: "course_2",
      title: "Liderança de Alta Performance",
      instructor: "Rafael Lima",
      students: 630,
      completionRate: 72,
      avgHours: "8.1 h",
      rating: 4.89,
      revenueGenerated: "R$ 34.650",
      status: "Crescendo",
    },
    {
      id: "course_3",
      title: "Design System & UI Moderna",
      instructor: "Ana Clara",
      students: 512,
      completionRate: 65,
      avgHours: "10.2 h",
      rating: 4.92,
      revenueGenerated: "R$ 29.800",
      status: "Estável",
    },
    {
      id: "course_4",
      title: "Inteligência Artificial Aplicada",
      instructor: "Carlos Eduardo",
      students: 480,
      completionRate: 81,
      avgHours: "5.5 h",
      rating: 4.97,
      revenueGenerated: "R$ 26.400",
      status: "Alta demanda",
    },
    {
      id: "course_5",
      title: "Negociação Estratégica",
      instructor: "Beatriz Ramos",
      students: 390,
      completionRate: 59,
      avgHours: "4.8 h",
      rating: 4.75,
      revenueGenerated: "R$ 19.500",
      status: "Atenção",
    },
  ],
  ratingsBreakdown: [
    { stars: 5, percentage: 82, count: 708 },
    { stars: 4, percentage: 14, count: 121 },
    { stars: 3, percentage: 3, count: 26 },
    { stars: 2, percentage: 0.8, count: 7 },
    { stars: 1, percentage: 0.2, count: 2 },
  ],
};

// --- Mock Data for Sales Analytics ---
export interface SalesTransaction {
  id: string;
  externalId: string;
  customer: string;
  email: string;
  document: string;
  product: string;
  productType: "Assinatura" | "Curso Avulso" | "Workshop";
  amount: number;
  fee: number;
  netAmount: number;
  installments: string;
  method: "PIX" | "Cartão de Crédito" | "Boleto Bancário";
  gateway: "Eduzz" | "Hotmart";
  status: "aprovada" | "pendente" | "reembolsada" | "recusada";
  date: string;
  timeline: { title: string; time: string; status: "done" | "current" | "pending" }[];
}

export const MOCK_SALES_ANALYTICS = {
  kpis: {
    grossRevenue: 94850.0,
    netRevenue: 87262.0,
    ordersCount: 284,
    averageTicket: 333.98,
    conversionRate: 3.84,
    refundRate: 1.1,
    refundsCount: 3,
    forecastRevenue: 118400.0,
    abandonedCartRecovered: 18420.0,
  },
  revenueEvolution: [
    { period: "Jan", gross: 54000, net: 49680, orders: 165, previousGross: 46000, avgTicket: 327 },
    { period: "Fev", gross: 61200, net: 56304, orders: 182, previousGross: 52000, avgTicket: 336 },
    { period: "Mar", gross: 68500, net: 63020, orders: 204, previousGross: 58000, avgTicket: 335 },
    { period: "Abr", gross: 72000, net: 66240, orders: 215, previousGross: 62000, avgTicket: 334 },
    { period: "Mai", gross: 78900, net: 72588, orders: 236, previousGross: 67000, avgTicket: 334 },
    { period: "Jun", gross: 83400, net: 76728, orders: 250, previousGross: 71000, avgTicket: 333 },
    { period: "Jul", gross: 89200, net: 82064, orders: 268, previousGross: 76000, avgTicket: 332 },
    { period: "Ago", gross: 94850, net: 87262, orders: 284, previousGross: 82000, avgTicket: 334 },
  ],
  checkoutFunnel: [
    { stage: "Visualizações da Página de Vendas", count: 12400, percentage: 100, dropRate: 0 },
    { stage: "Início de Checkout (Clicks em Comprar)", count: 2180, percentage: 17.58, dropRate: 82.4 },
    { stage: "Dados de Pagamento Preenchidos", count: 1040, percentage: 8.38, dropRate: 52.3 },
    { stage: "Pagamento Aprovado (Conversão Final)", count: 284, percentage: 2.29, dropRate: 72.7 },
  ],
  abandonedCartStats: {
    totalAbandoned: 418,
    emailsSent: 418,
    recoveredCount: 142,
    recoveredRevenue: 18420,
    recoveryRate: 33.9,
  },
  paymentMethods: [
    { name: "PIX", share: 58, revenue: 55013, count: 165, color: "#10b981", speed: "Instantâneo (4s)", approvalRate: "99.2%" },
    { name: "Cartão de Crédito", share: 36, revenue: 34146, count: 102, color: "#3b82f6", speed: "12 segundos", approvalRate: "94.8%" },
    { name: "Boleto Bancário", share: 6, revenue: 5691, count: 17, color: "#f59e0b", speed: "1-2 dias úteis", approvalRate: "68.2%" },
  ],
  gatewayShare: [
    { name: "Eduzz", share: 72, revenue: 68292, count: 204, avgFee: "7.9%", webhookLatency: "0.8s" },
    { name: "Hotmart", share: 28, revenue: 26558, count: 80, avgFee: "8.2%", webhookLatency: "1.1s" },
  ],
  topProducts: [
    {
      id: "prod-1",
      name: "Plano Anual Premium",
      type: "Assinatura",
      units: 98,
      total: "R$ 48.990,20",
      avgPrice: "R$ 499,90",
      refundRate: "0.8%",
      growth: "+18%",
      share: 51.6,
    },
    {
      id: "prod-2",
      name: "Imersão IA para Gestores",
      type: "Workshop",
      units: 30,
      total: "R$ 21.595,00",
      avgPrice: "R$ 719,83",
      refundRate: "1.2%",
      growth: "+24%",
      share: 22.8,
    },
    {
      id: "prod-3",
      name: "Trilha Comunicação Executiva",
      type: "Curso Avulso",
      units: 44,
      total: "R$ 17.556,00",
      avgPrice: "R$ 399,00",
      refundRate: "1.5%",
      growth: "+8%",
      share: 18.5,
    },
    {
      id: "prod-4",
      name: "Plano Pro Mensal",
      type: "Assinatura",
      units: 112,
      total: "R$ 6.708,80",
      avgPrice: "R$ 59,90",
      refundRate: "0.5%",
      growth: "+12%",
      share: 7.1,
    },
  ],
  recentTransactions: [
    {
      id: "TX-9481",
      externalId: "EDZ-8392109",
      customer: "Lucas Bittencourt",
      email: "lucas.b@empresa.com",
      document: "382.***.***-12",
      product: "Plano Anual Premium",
      productType: "Assinatura" as const,
      amount: 499.9,
      fee: 39.99,
      netAmount: 459.91,
      installments: "À vista",
      method: "PIX" as const,
      gateway: "Eduzz" as const,
      status: "aprovada" as const,
      date: "Hoje às 16:42",
      timeline: [
        { title: "Transação criada no checkout", time: "16:42:01", status: "done" as const },
        { title: "PIX gerado pelo gateway", time: "16:42:03", status: "done" as const },
        { title: "Pagamento confirmado pelo Banco Central", time: "16:42:08", status: "done" as const },
        { title: "Matrícula e acesso ao Smart LMS liberados", time: "16:42:09", status: "done" as const },
      ],
    },
    {
      id: "TX-9480",
      externalId: "EDZ-8391980",
      customer: "Mariana Alencar",
      email: "mariana.alencar@tech.io",
      document: "194.***.***-88",
      product: "Plano Pro Mensal",
      productType: "Assinatura" as const,
      amount: 59.9,
      fee: 4.79,
      netAmount: 55.11,
      installments: "Recorrência Mensal",
      method: "Cartão de Crédito" as const,
      gateway: "Eduzz" as const,
      status: "aprovada" as const,
      date: "Hoje às 15:18",
      timeline: [
        { title: "Assinatura solicitada", time: "15:18:10", status: "done" as const },
        { title: "Cartão processado e tokenizado", time: "15:18:14", status: "done" as const },
        { title: "Recorrência ativada", time: "15:18:15", status: "done" as const },
      ],
    },
    {
      id: "TX-9479",
      externalId: "HTM-9182371",
      customer: "Diego Fernandes",
      email: "diego.f@inbox.com",
      document: "482.***.***-54",
      product: "Trilha Comunicação Executiva",
      productType: "Curso Avulso" as const,
      amount: 399.0,
      fee: 32.71,
      netAmount: 366.29,
      installments: "12x de R$ 39,80",
      method: "PIX" as const,
      gateway: "Hotmart" as const,
      status: "aprovada" as const,
      date: "Hoje às 13:05",
      timeline: [
        { title: "Início do checkout Hotmart", time: "13:04:40", status: "done" as const },
        { title: "PIX aprovado", time: "13:05:02", status: "done" as const },
        { title: "Webhook recebido e processado", time: "13:05:03", status: "done" as const },
      ],
    },
    {
      id: "TX-9478",
      externalId: "EDZ-8390554",
      customer: "Carla Silveira",
      email: "carla.s@globo.com",
      document: "078.***.***-91",
      product: "Plano Pro Mensal",
      productType: "Assinatura" as const,
      amount: 59.9,
      fee: 4.79,
      netAmount: 55.11,
      installments: "Boleto 1x",
      method: "Boleto Bancário" as const,
      gateway: "Eduzz" as const,
      status: "pendente" as const,
      date: "Hoje às 11:20",
      timeline: [
        { title: "Boleto gerado", time: "11:20:00", status: "done" as const },
        { title: "Aguardando compensação bancária (D+1)", time: "11:20:01", status: "current" as const },
      ],
    },
    {
      id: "TX-9477",
      externalId: "EDZ-8389102",
      customer: "Fernando Rocha",
      email: "fernando.rocha@mail.com",
      document: "512.***.***-09",
      product: "Plano Anual Premium",
      productType: "Assinatura" as const,
      amount: 499.9,
      fee: 39.99,
      netAmount: 459.91,
      installments: "12x de R$ 49,90",
      method: "Cartão de Crédito" as const,
      gateway: "Eduzz" as const,
      status: "aprovada" as const,
      date: "Ontem às 21:50",
      timeline: [
        { title: "Transação autorizada", time: "21:50:30", status: "done" as const },
        { title: "Acesso liberado", time: "21:50:32", status: "done" as const },
      ],
    },
    {
      id: "TX-9476",
      externalId: "HTM-9180021",
      customer: "Renata Vasconcellos",
      email: "renata.v@digital.com",
      document: "721.***.***-33",
      product: "Imersão IA para Gestores",
      productType: "Workshop" as const,
      amount: 720.0,
      fee: 59.04,
      netAmount: 660.96,
      installments: "À vista",
      method: "PIX" as const,
      gateway: "Hotmart" as const,
      status: "aprovada" as const,
      date: "Ontem às 18:14",
      timeline: [
        { title: "Inscrição confirmada", time: "18:14:02", status: "done" as const },
      ],
    },
    {
      id: "TX-9475",
      externalId: "EDZ-8388410",
      customer: "Guilherme Sampaio",
      email: "gui.sampaio@startup.co",
      document: "218.***.***-74",
      product: "Trilha Comunicação Executiva",
      productType: "Curso Avulso" as const,
      amount: 399.0,
      fee: 31.92,
      netAmount: 367.08,
      installments: "1x",
      method: "Cartão de Crédito" as const,
      gateway: "Eduzz" as const,
      status: "reembolsada" as const,
      date: "12 ago às 09:30",
      timeline: [
        { title: "Compra realizada", time: "08 ago 14:10", status: "done" as const },
        { title: "Solicitação de garantia de 7 dias", time: "12 ago 09:15", status: "done" as const },
        { title: "Reembolso estornado integralmente", time: "12 ago 09:30", status: "done" as const },
      ],
    },
  ],
};

// --- Mock Data for AI Agents Analytics ---
export const MOCK_AGENTS_ANALYTICS = {
  kpis: {
    totalSessions: 8420,
    totalMessages: 38920,
    avgResponseTime: "1.1s",
    satisfactionRate: 94.8,
    resolutionRate: 89.2,
    activeAgentsCount: 6,
  },
  dailyInteractions: [
    { day: "07/Ago", messages: 1120, sessions: 240 },
    { day: "08/Ago", messages: 1340, sessions: 290 },
    { day: "09/Ago", messages: 1480, sessions: 310 },
    { day: "10/Ago", messages: 980, sessions: 210 },
    { day: "11/Ago", messages: 890, sessions: 195 },
    { day: "12/Ago", messages: 1650, sessions: 360 },
    { day: "13/Ago", messages: 1820, sessions: 410 },
  ],
  agentsRanking: [
    {
      id: "agente_1",
      name: "Tutor Socrático",
      role: "Aprofundamento reflexivo e dúvidas pedagógicas",
      sessions: 3240,
      messages: 16400,
      satisfaction: 96.4,
      avgSpeed: "0.9s",
      sentiment: "Extremamente positivo",
    },
    {
      id: "agente_2",
      name: "Mentor de Carreira",
      role: "Orientações profissionais e plano de desenvolvimento",
      sessions: 2180,
      messages: 9850,
      satisfaction: 95.1,
      avgSpeed: "1.2s",
      sentiment: "Muito positivo",
    },
    {
      id: "agente_3",
      name: "Assistente de Síntese",
      role: "Geração de resumos, mapas mentais e flashcards",
      sessions: 1620,
      messages: 6420,
      satisfaction: 93.8,
      avgSpeed: "1.0s",
      sentiment: "Positivo",
    },
    {
      id: "agente_4",
      name: "Guia de Código & Projetos",
      role: "Suporte técnico, debug e boas práticas",
      sessions: 1380,
      messages: 6250,
      satisfaction: 94.0,
      avgSpeed: "1.4s",
      sentiment: "Muito positivo",
    },
  ],
  topTopics: [
    { topic: "Dúvidas sobre aplicação prática da aula", count: 1840, percentage: 34 },
    { topic: "Resumos estruturados em tópicos", count: 1320, percentage: 24 },
    { topic: "Preparação para entrevistas e feedback", count: 980, percentage: 18 },
    { topic: "Exercícios complementares e testes", count: 720, percentage: 13 },
    { topic: "Recomendações de próximas aulas", count: 590, percentage: 11 },
  ],
  recentFeedback: [
    {
      id: "fb_1",
      agent: "Tutor Socrático",
      student: "Mariana Alencar",
      comment: "A explicação guiada por perguntas me ajudou a entender o conceito de liderança situacional muito melhor!",
      rating: 5,
      time: "há 20 min",
    },
    {
      id: "fb_2",
      agent: "Mentor de Carreira",
      student: "Pedro Rocha",
      comment: "Montou um plano de transição de carreira impecável com metas semanais.",
      rating: 5,
      time: "há 1h",
    },
    {
      id: "fb_3",
      agent: "Assistente de Síntese",
      student: "Camila Nogueira",
      comment: "O resumo ficou super didático e objetivo.",
      rating: 4,
      time: "há 3h",
    },
  ],
};

// --- Mock Data for Subscriptions Analytics ---
export const MOCK_SUBSCRIPTIONS_ANALYTICS = {
  kpis: {
    activeMembers: 1140,
    mrr: 48950.0,
    arr: 587400.0,
    churnRate: 1.88,
    churnDelta: "-0.4% p.p. vs mês anterior",
    ltv: 1480.0,
    renewalRate: 94.2,
  },
  mrrEvolution: [
    { period: "Jan", mrr: 31200, subscribers: 740, cancellations: 14 },
    { period: "Fev", mrr: 34500, subscribers: 810, cancellations: 16 },
    { period: "Mar", mrr: 38200, subscribers: 890, cancellations: 18 },
    { period: "Abr", mrr: 41000, subscribers: 950, cancellations: 17 },
    { period: "Mai", mrr: 43600, subscribers: 1010, cancellations: 20 },
    { period: "Jun", mrr: 45800, subscribers: 1065, cancellations: 19 },
    { period: "Jul", mrr: 47200, subscribers: 1100, cancellations: 21 },
    { period: "Ago", mrr: 48950, subscribers: 1140, cancellations: 22 },
  ],
  plansDistribution: [
    { name: "Plano Pro Mensal", subscribers: 615, share: 54, price: "R$ 59,90/mês", mrrShare: "R$ 36.838,50" },
    { name: "Plano Básico Mensal", subscribers: 354, share: 31, price: "R$ 29,90/mês", mrrShare: "R$ 10.584,60" },
    { name: "Plano Anual Premium", subscribers: 171, share: 15, price: "R$ 499,90/ano", mrrShare: "R$ 7.123,57/mês eq." },
  ],
  churnReasons: [
    { reason: "Falta de tempo para estudar", percentage: 42, count: 48 },
    { reason: "Motivos financeiros / corte de custos", percentage: 26, count: 30 },
    { reason: "Já concluiu os cursos que desejava", percentage: 18, count: 21 },
    { reason: "Migrou para treinamento in-company", percentage: 8, count: 9 },
    { reason: "Outros motivos", percentage: 6, count: 7 },
  ],
  renewalsForecast: [
    { range: "Próximos 7 dias", count: 86, expectedRevenue: "R$ 4.280,00", probability: "96%" },
    { range: "8 a 15 dias", count: 142, expectedRevenue: "R$ 7.150,00", probability: "94%" },
    { range: "16 a 30 dias", count: 310, expectedRevenue: "R$ 15.420,00", probability: "93%" },
  ],
};

// --- Mock Data for Students & Engagement Analytics ---
export const MOCK_STUDENTS_ANALYTICS = {
  kpis: {
    totalStudents: 1248,
    retention30d: 74.2,
    avgStudyStreak: "4.8 dias",
    npsScore: 78,
    dailyActiveUsers: 640,
    monthlyActiveUsers: 1180,
  },
  activityByHour: [
    { hour: "08h", activeUsers: 140 },
    { hour: "10h", activeUsers: 280 },
    { hour: "12h", activeUsers: 390 },
    { hour: "14h", activeUsers: 320 },
    { hour: "16h", activeUsers: 410 },
    { hour: "18h", activeUsers: 560 },
    { hour: "20h", activeUsers: 720 },
    { hour: "22h", activeUsers: 490 },
  ],
  profilesDistribution: [
    { profile: "Líder Estratégico", percentage: 38, count: 474, color: "#3b82f6" },
    { profile: "Especialista Técnico", percentage: 29, count: 362, color: "#10b981" },
    { profile: "Comunicador Criativo", percentage: 21, count: 262, color: "#8b5cf6" },
    { profile: "Explorador Multidisciplinar", percentage: 12, count: 150, color: "#f59e0b" },
  ],
  engagementBadges: [
    { title: "Alunos com Streak > 7 dias", count: 412, share: "33%" },
    { title: "Consumo ativo de Pílulas Diárias", count: 974, share: "78%" },
    { title: "Concluíram Onboarding Inicial", count: 1150, share: "92%" },
    { title: "Realizaram Teste de Perfil", count: 1089, share: "87%" },
  ],
};
