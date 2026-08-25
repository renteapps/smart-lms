"use server";

import { createClient } from "@/lib/supabase/server";
import { MOCK_ANALYTICS_CARDS } from "@/lib/mocks/analyticsMocks";
import {
  ANALYTICS_PERIOD_LABELS,
  getAnalyticsPeriodBounds,
  percentageChange,
  type AnalyticsPeriod,
} from "@/lib/analytics";

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

/** Mesma cardinalidade ambígua do PostgREST, para qualquer outro embed 1:1. */
function embedOne<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
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

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Minutos assistidos de um registro de progresso: aula concluída conta a
 * duração cadastrada da aula (melhor proxy que temos de "assistiu inteira");
 * aula em andamento conta o segundo real onde o aluno parou.
 */
function watchMinutesOf(row: { is_completed?: boolean | null; last_watched_second?: number | null }, durationMinutes: number): number {
  if (row.is_completed) return durationMinutes;
  return (row.last_watched_second ?? 0) / 60;
}

const MONTH_LABELS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function lastNMonths(n: number) {
  const now = new Date();
  const months: { key: string; label: string; start: Date; end: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    months.push({ key: `${start.getUTCFullYear()}-${start.getUTCMonth()}`, label: MONTH_LABELS_PT[start.getUTCMonth()], start, end });
  }
  return months;
}

function monthKeyOf(date: Date) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function lastNDays(n: number) {
  const now = new Date();
  const days: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days.push({ key: d.toISOString().slice(0, 10), label: `${String(d.getUTCDate()).padStart(2, "0")}/${MONTH_LABELS_PT[d.getUTCMonth()]}` });
  }
  return days;
}

function dayKeyOf(dateStr: string) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function relativeTime(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  return `há ${Math.floor(diffH / 24)}d`;
}

type AnalyticsBucket = { label: string; start: Date; end: Date };

function buildAnalyticsBuckets(period: AnalyticsPeriod, now = new Date()): AnalyticsBucket[] {
  const buckets: AnalyticsBucket[] = [];

  if (period === "12m" || period === "tudo") {
    const count = 12;
    for (let i = count - 1; i >= 0; i--) {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      buckets.push({
        label: `${MONTH_LABELS_PT[start.getUTCMonth()]}/${String(start.getUTCFullYear()).slice(-2)}`,
        start,
        end,
      });
    }
    return buckets;
  }

  const totalDays = Number.parseInt(period, 10);
  const stepDays = period === "7d" ? 1 : period === "30d" ? 3 : 7;
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(now.getTime() - totalDays * dayMs);

  for (let cursor = new Date(start); cursor < now; cursor = new Date(cursor.getTime() + stepDays * dayMs)) {
    const end = new Date(Math.min(now.getTime() + 1, cursor.getTime() + stepDays * dayMs));
    buckets.push({
      label: `${String(cursor.getUTCDate()).padStart(2, "0")}/${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
      start: cursor,
      end,
    });
  }

  return buckets;
}

function bucketIndexFor(date: Date, buckets: AnalyticsBucket[]): number {
  return buckets.findIndex((bucket) => date >= bucket.start && date < bucket.end);
}

function isOnOrAfter(date: string | null | undefined, start: Date | null): boolean {
  if (!date) return false;
  return !start || new Date(date) >= start;
}

function splitCurrentAndPrevious<T>(
  rows: T[],
  dateOf: (row: T) => string | null | undefined,
  period: AnalyticsPeriod,
) {
  const { start, previousStart } = getAnalyticsPeriodBounds(period);
  if (!start) return { current: rows, previous: [] as T[] };

  return {
    current: rows.filter((row) => isOnOrAfter(dateOf(row), start)),
    previous: rows.filter((row) => {
      const date = dateOf(row);
      if (!date || !previousStart) return false;
      const value = new Date(date);
      return value >= previousStart && value < start;
    }),
  };
}

export async function getAnalyticsOverview() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [
    { data: subscriptions, error: subError },
    { data: approvedTx },
    { data: activeEnrollments },
    { data: progressData },
    { count: totalAgentInteractions },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, current_period_end, plans(price, frequency)"),
    // Receita de verdade vem das transações do gateway; somar `plans.price` por
    // assinatura contava o mesmo plano de novo a cada renovação.
    supabase
      .from("gateway_transactions")
      .select("amount, status"),
    // "Aluno ativo" = tem matrícula ativa e não vencida, não qualquer perfil
    // cadastrado (que inclui contas admin usadas para testar a plataforma).
    supabase
      .from("enrollments")
      .select("user_id")
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    // Coluna correta é `is_completed`, não `completed` — o select antigo
    // pedia uma coluna inexistente, o PostgREST rejeitava a query inteira e
    // Horas Assistidas ficava sempre zero.
    supabase
      .from("lesson_progress")
      .select("is_completed, last_watched_second, lessons(duration_in_minutes)"),
    supabase
      .from("agent_messages")
      .select("id", { count: "exact", head: true }),
  ]);

  let totalRevenue = 0;
  for (const tx of approvedTx ?? []) {
    const amount = Number(tx.amount) || 0;
    if (tx.status === "approved") totalRevenue += amount;
    else if (tx.status === "refunded" || tx.status === "chargeback") totalRevenue -= amount;
  }

  let mrr = 0;
  let activeSubscriptions = 0;
  if (!subError && subscriptions) {
    subscriptions.forEach((sub) => {
      if (!isLiveSubscription(sub)) return;
      activeSubscriptions++;
      mrr += monthlyRecurring(planOf(sub.plans));
    });
  }

  const activeStudents = new Set((activeEnrollments ?? []).map((e) => e.user_id)).size;

  let totalWatchMinutes = 0;
  for (const p of progressData ?? []) {
    const duration = embedOne<{ duration_in_minutes: number | null }>(p.lessons)?.duration_in_minutes ?? 0;
    totalWatchMinutes += watchMinutesOf(p, duration);
  }

  return {
    totalRevenue,
    revenueChange: 0, // Tendências exigiriam snapshots históricos que ainda não guardamos
    activeStudents,
    studentsChange: 0,
    totalWatchHours: totalWatchMinutes / 60,
    watchHoursChange: 0,
    totalAgentInteractions: totalAgentInteractions || 0,
    agentInteractionsChange: 0,
    activeSubscriptions,
    subscriptionsChange: 0,
    mrr,
    mrrChange: 0,
  };
}

export async function getCoursesAnalytics(period: AnalyticsPeriod = "30d") {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { previousStart } = getAnalyticsPeriodBounds(period);

  let periodProgressQuery = supabase
    .from("lesson_progress")
    .select("user_id, lesson_id, is_completed, completed_at, user_rating")
    .eq("is_completed", true)
    .not("completed_at", "is", null);

  if (previousStart) {
    periodProgressQuery = periodProgressQuery.gte("completed_at", previousStart.toISOString());
  }

  const [
    coursesResult,
    modulesResult,
    lessonsResult,
    enrollmentsResult,
    progressSummaryResult,
    periodProgressResult,
    transactionsResult,
  ] = await Promise.all([
    supabase.from("courses").select("id, title, status, is_published, instructor_names, coordinator_name"),
    supabase.from("modules").select("id, course_id"),
    supabase.from("lessons").select("id, module_id, duration_in_minutes"),
    supabase
      .from("enrollments")
      .select("user_id, course_id")
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    supabase.from("v_user_course_progress").select("course_id, user_id, completed_lessons, started_lessons"),
    periodProgressQuery,
    supabase.from("gateway_transactions").select("course_id, amount, status, occurred_at").eq("status", "approved"),
  ]);

  const queryResults = [
    ["cursos", coursesResult.error],
    ["módulos", modulesResult.error],
    ["aulas", lessonsResult.error],
    ["matrículas", enrollmentsResult.error],
    ["progresso agregado", progressSummaryResult.error],
    ["progresso do período", periodProgressResult.error],
    ["transações", transactionsResult.error],
  ] as const;
  const failed = queryResults.find(([, error]) => error);
  if (failed?.[1]) {
    throw new Error(`Não foi possível carregar as análises de cursos (${failed[0]}): ${failed[1].message}`);
  }

  const courses = coursesResult.data ?? [];
  const modules = modulesResult.data ?? [];
  const lessons = lessonsResult.data ?? [];
  const enrollments = enrollmentsResult.data ?? [];
  const progressSummary = progressSummaryResult.data ?? [];
  const periodProgress = periodProgressResult.data ?? [];
  const approvedTx = transactionsResult.data ?? [];

  const moduleCourse = new Map((modules ?? []).map((m) => [m.id, m.course_id as string]));
  const lessonCourse = new Map<string, string>();
  const lessonDuration = new Map<string, number>();
  const courseTotalLessons = new Map<string, number>();
  for (const l of lessons ?? []) {
    const courseId = moduleCourse.get(l.module_id);
    lessonDuration.set(l.id, l.duration_in_minutes ?? 0);
    if (courseId) {
      lessonCourse.set(l.id, courseId);
      courseTotalLessons.set(courseId, (courseTotalLessons.get(courseId) ?? 0) + 1);
    }
  }

  const courseStudents = new Map<string, Set<string>>();
  for (const e of enrollments ?? []) {
    if (!courseStudents.has(e.course_id)) courseStudents.set(e.course_id, new Set());
    courseStudents.get(e.course_id)!.add(e.user_id);
  }

  type UserCourseStats = { completed: number; started: number };
  const userCourseStats = new Map<string, UserCourseStats>();
  for (const row of progressSummary) {
    userCourseStats.set(`${row.user_id}:${row.course_id}`, {
      completed: row.completed_lessons ?? 0,
      started: row.started_lessons ?? 0,
    });
  }

  const { current: currentProgress, previous: previousProgress } = splitCurrentAndPrevious(
    periodProgress,
    (row) => row.completed_at,
    period,
  );

  const currentWatchByUserCourse = new Map<string, number>();
  const courseRatings = new Map<string, number[]>();
  let ratingSum = 0;
  let ratingCount = 0;

  const buckets = buildAnalyticsBuckets(period);
  const monthlyEngagement = buckets.map((bucket) => ({ period: bucket.label, watchHours: 0, completions: 0 }));

  for (const p of currentProgress) {
    const courseId = lessonCourse.get(p.lesson_id);
    const duration = lessonDuration.get(p.lesson_id) ?? 0;
    const minutes = duration;

    if (p.user_rating != null) {
      ratingSum += p.user_rating;
      ratingCount += 1;
      if (courseId) {
        if (!courseRatings.has(courseId)) courseRatings.set(courseId, []);
        courseRatings.get(courseId)!.push(p.user_rating);
      }
    }

    if (courseId) {
      const key = `${p.user_id}:${courseId}`;
      currentWatchByUserCourse.set(key, (currentWatchByUserCourse.get(key) ?? 0) + minutes);
    }

    if (p.is_completed && p.completed_at) {
      const idx = bucketIndexFor(new Date(p.completed_at), buckets);
      if (idx >= 0) {
        monthlyEngagement[idx].completions += 1;
        monthlyEngagement[idx].watchHours += duration / 60;
      }
    }
  }
  monthlyEngagement.forEach((m) => (m.watchHours = Number(m.watchHours.toFixed(1))));

  // Funil de retenção real, em 3 estágios (matrícula → começou → concluiu o
  // curso inteiro). O mock antigo tinha 5 estágios fixos por "Módulo 1/2/3",
  // que não existem de forma genérica entre cursos com estruturas diferentes.
  let enrolledCount = 0;
  let startedCount = 0;
  let completedCount = 0;
  for (const [courseId, students] of courseStudents) {
    const totalLessons = courseTotalLessons.get(courseId) ?? 0;
    for (const userId of students) {
      enrolledCount++;
      const stats = userCourseStats.get(`${userId}:${courseId}`);
      if (stats && stats.started > 0) startedCount++;
      if (stats && totalLessons > 0 && stats.completed >= totalLessons) completedCount++;
    }
  }
  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);
  const retentionFunnel = [
    { stage: "Matrícula Realizada", count: enrolledCount, percentage: 100, dropRate: 0 },
    { stage: "Iniciaram o Curso", count: startedCount, percentage: pct(startedCount, enrolledCount), dropRate: pct(enrolledCount - startedCount, enrolledCount) },
    { stage: "Concluíram o Curso", count: completedCount, percentage: pct(completedCount, enrolledCount), dropRate: pct(startedCount - completedCount, startedCount) },
  ];

  const topCourses = courses
    .map((c) => {
      const students = courseStudents.get(c.id) ?? new Set<string>();
      const totalLessons = courseTotalLessons.get(c.id) ?? 0;
      let completedRatioSum = 0;
      let watchMinutesSum = 0;
      for (const userId of students) {
        const stats = userCourseStats.get(`${userId}:${c.id}`);
        if (!stats) continue;
        completedRatioSum += totalLessons > 0 ? stats.completed / totalLessons : 0;
        watchMinutesSum += currentWatchByUserCourse.get(`${userId}:${c.id}`) ?? 0;
      }
      const ratings = courseRatings.get(c.id) ?? [];
      const revenue = approvedTx
        .filter((t) => t.course_id === c.id && isOnOrAfter(t.occurred_at, getAnalyticsPeriodBounds(period).start))
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);

      return {
        id: c.id,
        title: c.title,
        instructor: c.instructor_names?.[0] || c.coordinator_name || "Não atribuído",
        students: students.size,
        completionRate: students.size ? Math.round((completedRatioSum / students.size) * 100) : 0,
        avgHours: `${(students.size ? watchMinutesSum / students.size / 60 : 0).toFixed(1)} h`,
        rating: ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)) : 0,
        revenueGenerated: brl.format(revenue),
        // Bug antigo: comparava com "published" em inglês, mas o enum salvo no
        // banco é "Publicado"/"Rascunho" — todo curso publicado aparecia como
        // rascunho na tabela.
        status: c.status === "Publicado" || c.is_published ? "Ativo" : "Rascunho",
      };
    })
    .sort((a, b) => b.students - a.students);

  const starCounts: Record<number, number> = {};
  for (const list of courseRatings.values()) for (const r of list) starCounts[r] = (starCounts[r] ?? 0) + 1;
  const ratingsBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: starCounts[stars] ?? 0,
    percentage: ratingCount ? Number((((starCounts[stars] ?? 0) / ratingCount) * 100).toFixed(1)) : 0,
  }));

  const currentWatchHours = currentProgress.reduce(
    (sum, row) => sum + (lessonDuration.get(row.lesson_id) ?? 0) / 60,
    0,
  );
  const previousWatchHours = previousProgress.reduce(
    (sum, row) => sum + (lessonDuration.get(row.lesson_id) ?? 0) / 60,
    0,
  );

  return {
    period,
    periodLabel: ANALYTICS_PERIOD_LABELS[period],
    kpis: {
      totalCourses: courses.length,
      activeEnrollments: enrolledCount,
      completionRate: pct(completedCount, enrolledCount),
      completionRateDelta: null,
      totalWatchHours: Number(currentWatchHours.toFixed(1)),
      watchHoursChange: percentageChange(currentWatchHours, previousWatchHours),
      watchHoursDelta: previousProgress.length ? "vs período anterior" : "sem comparação anterior",
      averageRating: ratingCount ? Number((ratingSum / ratingCount).toFixed(2)) : 0,
      totalReviews: ratingCount,
    },
    monthlyEngagement,
    retentionFunnel,
    topCourses,
    ratingsBreakdown,
  };
}

export async function getSalesAnalytics(period: AnalyticsPeriod = "30d") {
  const supabase = await createClient();
  const { previousStart } = getAnalyticsPeriodBounds(period);

  let transactionsQuery = supabase
    .from("gateway_transactions")
    .select("id, transaction_id, gateway, status, amount, occurred_at, user_id, course_id, plan_id, courses(title), plans(name)")
    .order("occurred_at", { ascending: false });

  if (previousStart) {
    transactionsQuery = transactionsQuery.gte("occurred_at", previousStart.toISOString());
  }

  const { data: transactionRows, error: transactionsError } = await transactionsQuery;
  if (transactionsError) {
    throw new Error(`Não foi possível carregar as análises de vendas: ${transactionsError.message}`);
  }

  const { current: transactions, previous: previousTransactions } = splitCurrentAndPrevious(
    transactionRows ?? [],
    (row) => row.occurred_at,
    period,
  );

  let grossRevenue = 0;
  let refundedValue = 0;
  let refundsCount = 0;
  let ordersCount = 0;
  const byGateway = new Map<string, { revenue: number; count: number }>();

  for (const tx of transactions) {
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

  const gatewayShare = Array.from(byGateway, ([slug, bucket]) => ({
    name: GATEWAY_LABELS[slug] ?? slug,
    revenue: bucket.revenue,
    count: bucket.count,
    share: grossRevenue > 0 ? Math.round((bucket.revenue / grossRevenue) * 100) : 0,
    // A taxa real do gateway não vem no webhook e a latência exigiria medição
    // própria — travessão em vez de número inventado.
    avgFee: null,
    webhookLatency: null,
  })).sort((a, b) => b.revenue - a.revenue);

  const netRevenue = grossRevenue - refundedValue;

  const previousGrossRevenue = previousTransactions.reduce(
    (sum, tx) => sum + (tx.status === "approved" ? Number(tx.amount) || 0 : 0),
    0,
  );
  const previousRefundedValue = previousTransactions.reduce(
    (sum, tx) => sum + (tx.status === "refunded" || tx.status === "chargeback" ? Number(tx.amount) || 0 : 0),
    0,
  );
  const previousOrdersCount = previousTransactions.filter((tx) => tx.status === "approved").length;
  const previousNetRevenue = previousGrossRevenue - previousRefundedValue;
  const previousAverageTicket = previousOrdersCount ? previousGrossRevenue / previousOrdersCount : 0;

  const buckets = buildAnalyticsBuckets(period);
  const revenueEvolution = buckets.map((bucket) => ({ period: bucket.label, gross: 0, net: 0, orders: 0, avgTicket: 0 }));
  for (const tx of transactions) {
    const idx = bucketIndexFor(new Date(tx.occurred_at), buckets);
    if (idx < 0) continue;
    const amount = Number(tx.amount) || 0;
    if (tx.status === "approved") {
      revenueEvolution[idx].gross += amount;
      revenueEvolution[idx].net += amount;
      revenueEvolution[idx].orders += 1;
    } else if (tx.status === "refunded" || tx.status === "chargeback") {
      revenueEvolution[idx].net -= amount;
    }
  }
  revenueEvolution.forEach((m) => {
    m.gross = Math.round(m.gross);
    m.net = Math.round(m.net);
    m.avgTicket = m.orders ? Math.round(m.gross / m.orders) : 0;
  });

  // Produtos/planos reais, agrupados pela transação aprovada.
  const productMap = new Map<string, { name: string; type: string; units: number; total: number; refunded: number }>();
  for (const tx of transactions) {
    const key = tx.course_id ? `course:${tx.course_id}` : tx.plan_id ? `plan:${tx.plan_id}` : null;
    if (!key) continue;
    const name = tx.course_id ? embedOne(tx.courses)?.title ?? "Curso" : embedOne(tx.plans)?.name ?? "Plano";
    const type = tx.course_id ? "Curso Avulso" : "Assinatura";
    const entry = productMap.get(key) ?? { name, type, units: 0, total: 0, refunded: 0 };
    if (tx.status === "approved") {
      entry.units += 1;
      entry.total += Number(tx.amount) || 0;
    } else if (tx.status === "refunded" || tx.status === "chargeback") {
      entry.refunded += 1;
    }
    productMap.set(key, entry);
  }
  const totalProductRevenue = Array.from(productMap.values()).reduce((s, p) => s + p.total, 0);
  const topProducts = Array.from(productMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([id, p]) => ({
      id,
      name: p.name,
      type: p.type,
      units: p.units,
      total: brl.format(p.total),
      avgPrice: brl.format(p.units ? p.total / p.units : 0),
      refundRate: `${(p.units + p.refunded > 0 ? (p.refunded / (p.units + p.refunded)) * 100 : 0).toFixed(1)}%`,
      // Crescimento mês a mês exigiria série histórica por produto — sem dado real ainda.
      growth: "—",
      share: totalProductRevenue > 0 ? Math.round((p.total / totalProductRevenue) * 100) : 0,
    }));

  // Transações recentes reais, com comprador identificado quando houver user_id.
  const recent = transactions.slice(0, 50);
  const buyerIds = Array.from(new Set(recent.map((t) => t.user_id).filter((id): id is string => !!id)));
  const { data: buyers } = buyerIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", buyerIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const buyerMap = new Map((buyers ?? []).map((b) => [b.id, b]));

  const STATUS_MAP: Record<string, "aprovada" | "pendente" | "reembolsada"> = {
    approved: "aprovada", pending: "pendente", refunded: "reembolsada", chargeback: "reembolsada",
  };
  const STATUS_EVENT_LABEL: Record<string, string> = {
    aprovada: "Pagamento aprovado pelo gateway",
    pendente: "Aguardando confirmação de pagamento",
    reembolsada: "Reembolso/estorno processado",
  };

  const recentTransactions = recent.map((tx) => {
    const buyer = tx.user_id ? buyerMap.get(tx.user_id) : undefined;
    const product = tx.course_id ? embedOne(tx.courses)?.title : tx.plan_id ? embedOne(tx.plans)?.name : null;
    const status = STATUS_MAP[tx.status] ?? "pendente";
    const amount = Number(tx.amount) || 0;
    const dateObj = new Date(tx.occurred_at);
    return {
      id: tx.transaction_id || tx.id,
      externalId: tx.transaction_id || tx.id,
      customer: buyer?.full_name || "Cliente não identificado",
      email: buyer?.email || "—",
      // Não há campo de documento (CPF) capturado do gateway.
      document: "—",
      product: product || "Produto não identificado",
      productType: tx.course_id ? "Curso Avulso" : tx.plan_id ? "Assinatura" : "Outro",
      amount,
      // Taxa do gateway não é registrada por transação hoje.
      fee: 0,
      netAmount: status === "reembolsada" ? 0 : amount,
      installments: "—",
      method: "Não informado",
      gateway: GATEWAY_LABELS[tx.gateway] ?? tx.gateway,
      status,
      date: dateObj.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      timeline: [
        {
          title: STATUS_EVENT_LABEL[status] ?? "Status atualizado",
          time: dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          status: "done" as const,
        },
      ],
    };
  });

  return {
    period,
    periodLabel: ANALYTICS_PERIOD_LABELS[period],
    kpis: {
      grossRevenue,
      netRevenue,
      ordersCount,
      averageTicket: ordersCount ? grossRevenue / ordersCount : 0,
      grossRevenueChange: percentageChange(grossRevenue, previousGrossRevenue),
      netRevenueChange: percentageChange(netRevenue, previousNetRevenue),
      ordersChange: percentageChange(ordersCount, previousOrdersCount),
      averageTicketChange: percentageChange(
        ordersCount ? grossRevenue / ordersCount : 0,
        previousAverageTicket,
      ),
      // Exigiria tracking de visualizações de página de vendas — não existe hoje.
      conversionRate: null,
      refundRate: ordersCount + refundsCount ? (refundsCount / (ordersCount + refundsCount)) * 100 : 0,
      refundsCount,
      forecastRevenue: null,
      abandonedCartRecovered: null,
    },
    revenueEvolution,
    // Sem tracking de funil de checkout (page views, início de checkout etc).
    checkoutFunnel: [],
    abandonedCartStats: { totalAbandoned: 0, emailsSent: 0, recoveredCount: 0, recoveredRevenue: 0, recoveryRate: 0 },
    // Sem coluna de forma de pagamento nas transações — não dá para quebrar por PIX/Cartão/Boleto.
    paymentMethods: [],
    gatewayShare,
    topProducts,
    recentTransactions,
  };
}

export async function getAgentsAnalytics(period: AnalyticsPeriod = "30d") {
  const supabase = await createClient();
  const { start, previousStart } = getAnalyticsPeriodBounds(period);

  let conversationsQuery = supabase
    .from("agent_conversations")
    .select("id, agent_id, user_id, rating, sentiment, duration_seconds, status, created_at");
  let messagesQuery = supabase
    .from("agent_messages")
    .select("id, conversation_id, feedback, created_at")
    .order("created_at", { ascending: false });
  let totalMessagesQuery = supabase.from("agent_messages").select("id", { count: "exact", head: true });

  if (start) {
    conversationsQuery = conversationsQuery.gte("created_at", start.toISOString());
    messagesQuery = messagesQuery.gte("created_at", start.toISOString());
    totalMessagesQuery = totalMessagesQuery.gte("created_at", start.toISOString());
  }

  const previousConversationsQuery = start && previousStart
    ? supabase
        .from("agent_conversations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", previousStart.toISOString())
        .lt("created_at", start.toISOString())
    : null;
  const previousMessagesQuery = start && previousStart
    ? supabase
        .from("agent_messages")
        .select("id", { count: "exact", head: true })
        .gte("created_at", previousStart.toISOString())
        .lt("created_at", start.toISOString())
    : null;

  const [conversationsResult, totalMessagesResult, agentsResult, messagesResult, previousConversationsResult, previousMessagesResult] = await Promise.all([
    conversationsQuery,
    totalMessagesQuery,
    supabase.from("agents").select("id, name, role"),
    messagesQuery,
    previousConversationsQuery,
    previousMessagesQuery,
  ]);

  const failed = [
    ["conversas", conversationsResult.error],
    ["contagem de mensagens", totalMessagesResult.error],
    ["agentes", agentsResult.error],
    ["mensagens", messagesResult.error],
  ] as const;
  const failedQuery = failed.find(([, error]) => error);
  if (failedQuery?.[1]) {
    throw new Error(`Não foi possível carregar as análises de agentes (${failedQuery[0]}): ${failedQuery[1].message}`);
  }

  const conversations = conversationsResult.data ?? [];
  const totalMessages = totalMessagesResult.count ?? 0;
  const agents = agentsResult.data ?? [];
  const messages = messagesResult.data ?? [];

  const buckets = buildAnalyticsBuckets(period);
  const dailyBuckets = buckets.map((bucket) => ({ day: bucket.label, messages: 0, sessions: 0 }));
  for (const m of messages) {
    const idx = bucketIndexFor(new Date(m.created_at), buckets);
    if (idx >= 0) dailyBuckets[idx].messages += 1;
  }
  for (const c of conversations) {
    const idx = bucketIndexFor(new Date(c.created_at), buckets);
    if (idx >= 0) dailyBuckets[idx].sessions += 1;
  }

  const msgCountByConv = new Map<string, number>();
  for (const m of messages) msgCountByConv.set(m.conversation_id, (msgCountByConv.get(m.conversation_id) ?? 0) + 1);

  const SENTIMENT_LABEL: Record<string, string> = { positivo: "Positivo", neutro: "Neutro", negativo: "Negativo" };

  type AgentBucket = { sessions: number; messages: number; ratings: number[]; durations: number[]; sentiments: Record<string, number> };
  const byAgent = new Map<string, AgentBucket>();
  let ratingSumAll = 0;
  let ratingCountAll = 0;
  let durationSumAll = 0;
  let durationCountAll = 0;

  for (const c of conversations) {
    const bucket = byAgent.get(c.agent_id) ?? { sessions: 0, messages: 0, ratings: [], durations: [], sentiments: {} };
    bucket.sessions += 1;
    bucket.messages += msgCountByConv.get(c.id) ?? 0;
    if (c.rating != null) {
      bucket.ratings.push(c.rating);
      ratingSumAll += c.rating;
      ratingCountAll += 1;
    }
    if (c.duration_seconds) {
      bucket.durations.push(c.duration_seconds);
      durationSumAll += c.duration_seconds;
      durationCountAll += 1;
    }
    if (c.sentiment) bucket.sentiments[c.sentiment] = (bucket.sentiments[c.sentiment] ?? 0) + 1;
    byAgent.set(c.agent_id, bucket);
  }

  const agentsRanking = agents
    .map((a) => {
      const b = byAgent.get(a.id);
      const avgRating = b && b.ratings.length ? b.ratings.reduce((x, y) => x + y, 0) / b.ratings.length : null;
      const avgDuration = b && b.durations.length ? b.durations.reduce((x, y) => x + y, 0) / b.durations.length : null;
      const topSentiment = b ? Object.entries(b.sentiments).sort((x, y) => y[1] - x[1])[0]?.[0] : null;
      return {
        id: a.id,
        name: a.name,
        role: a.role || "Agente",
        sessions: b?.sessions ?? 0,
        messages: b?.messages ?? 0,
        satisfaction: avgRating != null ? Number(((avgRating / 5) * 100).toFixed(1)) : 0,
        avgSpeed: avgDuration != null ? `${avgDuration.toFixed(1)}s` : "0s",
        sentiment: topSentiment ? SENTIMENT_LABEL[topSentiment] ?? topSentiment : "Sem dados",
      };
    })
    .sort((a, b) => b.sessions - a.sessions);

  const convMap = new Map(conversations.map((c) => [c.id, c]));
  const agentNameMap = new Map(agents.map((a) => [a.id, a.name]));
  const feedbackMsgs = messages.filter((m) => m.feedback);
  const studentIds = Array.from(
    new Set(feedbackMsgs.map((m) => convMap.get(m.conversation_id)?.user_id).filter((id): id is string => !!id)),
  );
  const { data: students } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const studentMap = new Map((students ?? []).map((s) => [s.id, s.full_name]));

  const recentFeedback = feedbackMsgs.slice(0, 10).map((m) => {
    const conv = convMap.get(m.conversation_id);
    return {
      id: m.id,
      agent: conv ? agentNameMap.get(conv.agent_id) ?? "Agente" : "Agente",
      student: (conv?.user_id && studentMap.get(conv.user_id)) || "Aluno",
      comment: m.feedback === "up" ? "Avaliou a resposta positivamente." : "Avaliou a resposta negativamente.",
      rating: m.feedback === "up" ? 5 : 1,
      time: relativeTime(m.created_at),
    };
  });

  return {
    period,
    periodLabel: ANALYTICS_PERIOD_LABELS[period],
    kpis: {
      totalSessions: conversations.length,
      totalSessionsChange: percentageChange(conversations.length, previousConversationsResult?.count ?? 0),
      totalMessages,
      totalMessagesChange: percentageChange(totalMessages, previousMessagesResult?.count ?? 0),
      avgResponseTime: durationCountAll ? `${(durationSumAll / durationCountAll).toFixed(1)}s` : "—",
      satisfactionRate: ratingCountAll ? Number(((ratingSumAll / ratingCountAll / 5) * 100).toFixed(1)) : 0,
      resolutionRate: null,
      activeAgentsCount: Array.from(byAgent.values()).filter((bucket) => bucket.sessions > 0).length,
      configuredAgentsCount: agents.length,
    },
    dailyInteractions: dailyBuckets,
    agentsRanking,
    // Não há categorização/tagging de tópicos das conversas hoje.
    topTopics: [],
    recentFeedback,
  };
}

export async function getSubscriptionsAnalytics(period: AnalyticsPeriod = "30d") {
  const supabase = await createClient();
  const { start, previousStart } = getAnalyticsPeriodBounds(period);

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, started_at, canceled_at, created_at, plans(name, price, frequency)");

  if (subscriptionsError) {
    throw new Error(`Não foi possível carregar as análises de assinaturas: ${subscriptionsError.message}`);
  }

  let activeMembers = 0;
  let mrr = 0;
  let arr = 0;
  const byPlan = new Map<string, { subscribers: number; mrr: number; price: number }>();

  subscriptions.forEach((sub) => {
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

  const plansDistribution = Array.from(byPlan, ([name, bucket]) => ({
    name,
    subscribers: bucket.subscribers,
    share: activeMembers > 0 ? Math.round((bucket.subscribers / activeMembers) * 100) : 0,
    price: brl.format(bucket.price),
    mrrShare: brl.format(bucket.mrr),
  })).sort((a, b) => b.subscribers - a.subscribers);

  const canceledInPeriod = subscriptions.filter((sub) => isOnOrAfter(sub.canceled_at, start)).length;
  const canceledInPreviousPeriod = start && previousStart
    ? subscriptions.filter((sub) => {
        if (!sub.canceled_at) return false;
        const canceledAt = new Date(sub.canceled_at);
        return canceledAt >= previousStart && canceledAt < start;
      }).length
    : 0;
  const churnRate = activeMembers + canceledInPeriod > 0
    ? Number(((canceledInPeriod / (activeMembers + canceledInPeriod)) * 100).toFixed(2))
    : 0;
  const previousChurnRate = activeMembers + canceledInPreviousPeriod > 0
    ? Number(((canceledInPreviousPeriod / (activeMembers + canceledInPreviousPeriod)) * 100).toFixed(2))
    : 0;
  const renewalRate = activeMembers > 0 ? Number((100 - churnRate).toFixed(1)) : 0;
  const arpu = activeMembers > 0 ? mrr / activeMembers : 0;
  // LTV padrão (ARPU / churn) — só é confiável quando há churn e assinantes reais.
  const ltv = churnRate > 0 ? Number((arpu / (churnRate / 100)).toFixed(0)) : 0;

  // Reconstrução real de MRR mês a mês: para cada mês, soma quem já tinha
  // começado e ainda não tinha cancelado até o fim daquele mês.
  const buckets = buildAnalyticsBuckets(period);
  const mrrEvolution = buckets.map((bucket) => {
    let monthMrr = 0;
    let subscribers = 0;
    let cancellations = 0;
    for (const sub of subscriptions) {
      const startedAt = sub.started_at ? new Date(sub.started_at) : sub.created_at ? new Date(sub.created_at) : null;
      const canceledAt = sub.canceled_at ? new Date(sub.canceled_at) : null;
      if (startedAt && startedAt < bucket.end && (!canceledAt || canceledAt >= bucket.end)) {
        monthMrr += monthlyRecurring(planOf(sub.plans));
        subscribers += 1;
      }
      if (canceledAt && canceledAt >= bucket.start && canceledAt < bucket.end) cancellations += 1;
    }
    return { period: bucket.label, mrr: Math.round(monthMrr), subscribers, cancellations };
  });

  // Previsão de renovação real, a partir de `current_period_end`.
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;
  const ranges = [
    { range: "Próximos 7 dias", from: 0, to: 7 },
    { range: "8 a 15 dias", from: 8, to: 15 },
    { range: "16 a 30 dias", from: 16, to: 30 },
  ];
  const renewalsForecast = ranges.map((r) => {
    const from = new Date(now + r.from * dayMs);
    const to = new Date(now + r.to * dayMs);
    const subs = subscriptions.filter(
      (s) => isLiveSubscription(s) && s.current_period_end && new Date(s.current_period_end) >= from && new Date(s.current_period_end) < to,
    );
    const revenue = subs.reduce((sum, s) => sum + monthlyRecurring(planOf(s.plans)), 0);
    return {
      range: r.range,
      count: subs.length,
      expectedRevenue: brl.format(revenue),
      probability: activeMembers > 0 ? `${renewalRate}%` : "—",
    };
  });

  return {
    period,
    periodLabel: ANALYTICS_PERIOD_LABELS[period],
    kpis: {
      activeMembers,
      mrr,
      arr,
      churnRate,
      churnChange: start ? Number((churnRate - previousChurnRate).toFixed(1)) : null,
      churnDelta: start ? "p.p. vs período anterior" : "todo o histórico",
      mrrChange: mrrEvolution.length > 1
        ? percentageChange(mrrEvolution.at(-1)?.mrr ?? 0, mrrEvolution[0]?.mrr ?? 0)
        : null,
      ltv,
      renewalRate,
    },
    mrrEvolution,
    plansDistribution,
    // Sem questionário de cancelamento implementado — nenhum motivo é capturado hoje.
    churnReasons: [],
    renewalsForecast,
  };
}

export async function getStudentsAnalytics(period: AnalyticsPeriod = "30d") {
  const supabase = await createClient();
  const { start, previousStart } = getAnalyticsPeriodBounds(period);

  let progressActivityQuery = supabase
    .from("lesson_progress")
    .select("user_id, completed_at")
    .not("completed_at", "is", null);
  let trailActivityQuery = supabase.from("trail_events").select("user_id, occurred_at");
  if (previousStart) {
    progressActivityQuery = progressActivityQuery.gte("completed_at", previousStart.toISOString());
    trailActivityQuery = trailActivityQuery.gte("occurred_at", previousStart.toISOString());
  }

  const [
    enrollmentUsersResult,
    profilesResult,
    profileResultsResult,
    pilulaInteractionsResult,
    progressActivityResult,
    trailActivityResult,
  ] = await Promise.all([
    supabase.from("enrollments").select("user_id"),
    supabase.from("profiles").select("id, full_name, last_access_at, onboarding_completed_at"),
    supabase.from("profile_test_results").select("user_id, category_name"),
    supabase.from("pilula_interactions").select("user_id, completed"),
    progressActivityQuery,
    trailActivityQuery,
  ]);

  const failed = [
    ["matrículas", enrollmentUsersResult.error],
    ["perfis", profilesResult.error],
    ["testes de perfil", profileResultsResult.error],
    ["pílulas", pilulaInteractionsResult.error],
    ["progresso", progressActivityResult.error],
    ["eventos de trilha", trailActivityResult.error],
  ] as const;
  const failedQuery = failed.find(([, error]) => error);
  if (failedQuery?.[1]) {
    throw new Error(`Não foi possível carregar as análises de alunos (${failedQuery[0]}): ${failedQuery[1].message}`);
  }

  const enrollmentUsers = enrollmentUsersResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const profileResults = profileResultsResult.data ?? [];
  const pilulaInteractions = pilulaInteractionsResult.data ?? [];
  const progressActivity = progressActivityResult.data ?? [];
  const trailActivity = trailActivityResult.data ?? [];

  const enrolledStudentIds = new Set(enrollmentUsers.map((enrollment) => enrollment.user_id));
  const studentProfiles = profiles.filter((profile) => enrolledStudentIds.has(profile.id));
  const totalStudents = enrolledStudentIds.size;
  const totalProfiles = studentProfiles.length;

  const now = Date.now();
  const day1 = 24 * 3600 * 1000;
  const day30 = 30 * day1;
  const dailyActiveUsers = studentProfiles.filter((p) => p.last_access_at && now - new Date(p.last_access_at).getTime() <= day1).length;
  const monthlyActiveUsers = studentProfiles.filter((p) => p.last_access_at && now - new Date(p.last_access_at).getTime() <= day30).length;
  const activeStudentsInPeriod = studentProfiles.filter((profile) => isOnOrAfter(profile.last_access_at, start)).length;
  const previousActiveStudents = start && previousStart
    ? studentProfiles.filter((profile) => {
        if (!profile.last_access_at) return false;
        const lastAccess = new Date(profile.last_access_at);
        return lastAccess >= previousStart && lastAccess < start;
      }).length
    : 0;
  const activeRate = totalStudents ? Number(((activeStudentsInPeriod / totalStudents) * 100).toFixed(1)) : 0;

  const currentProgressActivity = progressActivity.filter((row) => isOnOrAfter(row.completed_at, start));
  const currentTrailActivity = trailActivity.filter((row) => isOnOrAfter(row.occurred_at, start));

  // Atividade por hora combinando os dois sinais reais de uso que temos com
  // timestamp: aulas concluídas e eventos de trilha/onboarding.
  const hourBuckets = new Map<number, number>();
  const activityByUser = new Map<string, Set<string>>();
  const registerActivity = (userId: string | null, dateStr: string) => {
    const d = new Date(dateStr);
    hourBuckets.set(d.getUTCHours(), (hourBuckets.get(d.getUTCHours()) ?? 0) + 1);
    if (userId) {
      if (!activityByUser.has(userId)) activityByUser.set(userId, new Set());
      activityByUser.get(userId)!.add(d.toISOString().slice(0, 10));
    }
  };
  for (const p of currentProgressActivity) registerActivity(p.user_id, p.completed_at);
  for (const t of currentTrailActivity) registerActivity(t.user_id, t.occurred_at);

  const activityByHour = Array.from({ length: 24 }, (_, hour) => hour)
    .filter((hour) => hourBuckets.has(hour))
    .sort((a, b) => a - b)
    .map((hour) => ({ hour: `${String(hour).padStart(2, "0")}h`, activeUsers: hourBuckets.get(hour) ?? 0 }));

  // Sequência de estudo real: dias consecutivos de atividade terminando hoje
  // ou ontem (se não houver atividade hoje, a sequência já quebrou).
  const computeStreak = (dates: Set<string>): number => {
    let streak = 0;
    const cursor = new Date();
    let key = cursor.toISOString().slice(0, 10);
    if (!dates.has(key)) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      key = cursor.toISOString().slice(0, 10);
    }
    while (dates.has(key)) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      key = cursor.toISOString().slice(0, 10);
    }
    return streak;
  };
  const streaks = Array.from(activityByUser.values()).map(computeStreak);
  const avgStreak = streaks.length ? streaks.reduce((a, b) => a + b, 0) / streaks.length : 0;
  const longStreakCount = streaks.filter((s) => s >= 7).length;

  const categoryCount = new Map<string, number>();
  for (const r of profileResults) {
    if (!enrolledStudentIds.has(r.user_id)) continue;
    const label = r.category_name ?? "Sem categoria";
    categoryCount.set(label, (categoryCount.get(label) ?? 0) + 1);
  }
  const totalResults = Array.from(categoryCount.values()).reduce((sum, count) => sum + count, 0);
  const PALETTE = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];
  const profilesDistribution = Array.from(categoryCount, ([profile, count], idx) => ({
    profile,
    count,
    percentage: totalResults ? Math.round((count / totalResults) * 100) : 0,
    color: PALETTE[idx % PALETTE.length],
  })).sort((a, b) => b.count - a.count);

  const onboardingDone = studentProfiles.filter((p) => p.onboarding_completed_at).length;
  const profileTestTakers = new Set(profileResults.filter((r) => enrolledStudentIds.has(r.user_id)).map((r) => r.user_id)).size;
  const pilulaActive = new Set(
    pilulaInteractions.filter((p) => p.completed && enrolledStudentIds.has(p.user_id)).map((p) => p.user_id),
  ).size;

  const sharePct = (n: number, den: number) => `${den ? Math.round((n / den) * 100) : 0}%`;
  const engagementBadges = [
    { title: "Alunos com Streak > 7 dias", count: longStreakCount, share: sharePct(longStreakCount, totalStudents) },
    { title: "Consumo ativo de Pílulas Diárias", count: pilulaActive, share: sharePct(pilulaActive, totalProfiles) },
    { title: "Concluíram Onboarding Inicial", count: onboardingDone, share: sharePct(onboardingDone, totalProfiles) },
    { title: "Realizaram Teste de Perfil", count: profileTestTakers, share: sharePct(profileTestTakers, totalProfiles) },
  ];

  return {
    period,
    periodLabel: ANALYTICS_PERIOD_LABELS[period],
    kpis: {
      totalStudents,
      activeStudentsInPeriod,
      activeStudentsChange: percentageChange(activeStudentsInPeriod, previousActiveStudents),
      retention30d: totalStudents ? Number(((monthlyActiveUsers / totalStudents) * 100).toFixed(1)) : 0,
      activeRate,
      avgStudyStreak: `${avgStreak.toFixed(1)} dias`,
      // Não há pesquisa de NPS implementada na plataforma ainda.
      npsScore: null,
      dailyActiveUsers,
      monthlyActiveUsers,
    },
    activityByHour,
    profilesDistribution,
    engagementBadges,
  };
}

/**
 * Monta o modelo da Central de Análises (cards, sparklines, insights) a
 * partir de dados reais. Compartilhado pelas duas rotas que renderizam
 * `AnalyticsHubView` (/admin/analises e /analises) para não divergirem.
 */
export async function getAnalyticsHubViewModel(period: AnalyticsPeriod = "30d") {
  const [coursesData, salesData, agentsData, subsData, studentsData] = await Promise.all([
    getCoursesAnalytics(period),
    getSalesAnalytics(period),
    getAgentsAnalytics(period),
    getSubscriptionsAnalytics(period),
    getStudentsAnalytics(period),
  ]);

  const overviewData = {
    totalRevenue: salesData.kpis.grossRevenue,
    revenueChange: salesData.kpis.grossRevenueChange,
    activeStudents: studentsData.kpis.activeStudentsInPeriod,
    studentsChange: studentsData.kpis.activeStudentsChange,
    totalWatchHours: coursesData.kpis.totalWatchHours,
    watchHoursChange: coursesData.kpis.watchHoursChange,
    totalAgentInteractions: agentsData.kpis.totalMessages,
    agentInteractionsChange: agentsData.kpis.totalMessagesChange,
    activeSubscriptions: subsData.kpis.activeMembers,
    subscriptionsChange: null,
    mrr: subsData.kpis.mrr,
    mrrChange: subsData.kpis.mrrChange,
  };

  const cardsData = MOCK_ANALYTICS_CARDS.map((card) => {
    const updatedCard = { ...card };

    if (card.id === "cursos") {
      const topCourse = coursesData.topCourses[0];
      updatedCard.badgeText = `${coursesData.kpis.totalCourses} Cursos Cadastrados`;
      updatedCard.metrics = [
        { label: "Conclusão Média", value: `${coursesData.kpis.completionRate}%` },
        { label: "Horas Assistidas", value: `${coursesData.kpis.totalWatchHours.toFixed(1)} h` },
        { label: "Matrículas Ativas", value: `${coursesData.kpis.activeEnrollments}` },
      ];
      updatedCard.sparkline = coursesData.monthlyEngagement.map((m) => m.watchHours);
      updatedCard.highlights = [
        topCourse ? `Curso com mais alunos: '${topCourse.title}' (${topCourse.students})` : "Nenhuma matrícula registrada ainda",
        `${coursesData.retentionFunnel[2]?.percentage ?? 0}% dos matriculados concluíram o curso`,
      ];
    } else if (card.id === "vendas") {
      const topGateway = salesData.gatewayShare[0];
      updatedCard.badgeText = `R$ ${salesData.kpis.grossRevenue.toLocaleString("pt-BR")} no período`;
      updatedCard.metrics = [
        { label: "Faturamento", value: `R$ ${salesData.kpis.grossRevenue.toLocaleString("pt-BR")}` },
        { label: "Ticket Médio", value: `R$ ${salesData.kpis.averageTicket.toFixed(0)}` },
        { label: "Vendas Concluídas", value: `${salesData.kpis.ordersCount}` },
      ];
      updatedCard.sparkline = salesData.revenueEvolution.map((m) => m.gross);
      updatedCard.highlights = [
        topGateway ? `${topGateway.name} responde por ${topGateway.share}% da receita aprovada` : "Nenhuma venda aprovada ainda",
        `${salesData.kpis.refundsCount} reembolsos/estornos registrados`,
      ];
    } else if (card.id === "agentes") {
      const topAgent = agentsData.agentsRanking[0];
      updatedCard.badgeText = `${agentsData.kpis.totalSessions} Conversas`;
      updatedCard.metrics = [
        { label: "Sessões Ativas", value: `${agentsData.kpis.totalSessions}` },
        { label: "Mensagens", value: `${agentsData.kpis.totalMessages}` },
        { label: "Agentes Ativos", value: `${agentsData.kpis.activeAgentsCount}` },
      ];
      updatedCard.sparkline = agentsData.dailyInteractions.map((d) => d.messages);
      updatedCard.highlights = [
        topAgent && topAgent.sessions > 0 ? `${topAgent.name} é o agente mais acionado (${topAgent.sessions} sessões)` : "Nenhuma conversa registrada ainda",
        `${agentsData.kpis.totalMessages} mensagens trocadas no total`,
      ];
    } else if (card.id === "assinaturas") {
      const topPlan = subsData.plansDistribution[0];
      updatedCard.badgeText = `${subsData.kpis.activeMembers} Assinantes`;
      updatedCard.metrics = [
        { label: "MRR Atual", value: `R$ ${subsData.kpis.mrr.toLocaleString("pt-BR")}` },
        { label: "ARR Estimado", value: `R$ ${subsData.kpis.arr.toLocaleString("pt-BR")}` },
        { label: "Taxa de Churn", value: `${subsData.kpis.churnRate}%` },
      ];
      updatedCard.sparkline = subsData.mrrEvolution.map((m) => m.mrr);
      updatedCard.highlights = [
        topPlan ? `${topPlan.name} representa ${topPlan.share}% da base ativa` : "Nenhuma assinatura ativa no momento",
        `${subsData.renewalsForecast.reduce((s, r) => s + r.count, 0)} renovações previstas nos próximos 30 dias`,
      ];
    } else if (card.id === "alunos") {
      const onboardingBadge = studentsData.engagementBadges.find((b) => b.title === "Concluíram Onboarding Inicial");
      updatedCard.badgeText = `${studentsData.kpis.totalStudents} Matriculados`;
      updatedCard.metrics = [
        { label: "Retenção 30d", value: `${studentsData.kpis.retention30d}%` },
        { label: "Streak Médio", value: studentsData.kpis.avgStudyStreak },
        { label: "NPS Alunos", value: studentsData.kpis.npsScore !== null ? (studentsData.kpis.npsScore > 0 ? `+${studentsData.kpis.npsScore}` : `${studentsData.kpis.npsScore}`) : "—" },
      ];
      updatedCard.sparkline = studentsData.activityByHour.map((h) => h.activeUsers);
      updatedCard.highlights = [
        onboardingBadge ? `${onboardingBadge.count} alunos concluíram o onboarding (${onboardingBadge.share})` : "Onboarding ainda não concluído por ninguém",
        `${studentsData.kpis.totalStudents} alunos matriculados na plataforma`,
      ];
    }

    return updatedCard;
  });

  // Tendência combinada real (receita mensal + horas assistidas) usada no
  // gráfico "Crescimento da Plataforma" — mesmos buckets de 8 meses das duas
  // fontes, então os índices já estão alinhados.
  const growthTrend = coursesData.monthlyEngagement.map((m, i) => {
    const gross = salesData.revenueEvolution[i]?.gross ?? 0;
    return {
      label: m.period,
      value: gross,
      formattedValue: `R$ ${gross.toLocaleString("pt-BR")} • ${m.watchHours.toFixed(1)}h assistidas`,
    };
  });
  const firstGross = growthTrend[0]?.value ?? 0;
  const lastGross = growthTrend[growthTrend.length - 1]?.value ?? 0;
  const growthLabel = firstGross > 0
    ? `${lastGross >= firstGross ? "+" : ""}${Math.round(((lastGross - firstGross) / firstGross) * 100)}% no período`
    : null;

  const bestCourse = coursesData.topCourses.length
    ? [...coursesData.topCourses].sort((a, b) => b.completionRate - a.completionRate)[0]
    : null;

  const insights: { icon: "flame" | "zap" | "check"; title: string; description: string }[] = [
    bestCourse
      ? {
          icon: "flame",
          title: "Curso com maior conclusão",
          description: `'${bestCourse.title}' tem ${bestCourse.completionRate}% de taxa de conclusão entre os matriculados.`,
        }
      : { icon: "flame", title: "Ainda sem dados de conclusão", description: "Nenhum aluno concluiu aulas o suficiente para calcular retenção por curso." },
    salesData.gatewayShare.length > 0
      ? {
          icon: "zap",
          title: "Concentração de receita",
          description: `${salesData.gatewayShare[0].name} concentra ${salesData.gatewayShare[0].share}% da receita aprovada no gateway.`,
        }
      : { icon: "zap", title: "Nenhuma venda aprovada", description: "Ainda não há transações aprovadas para medir a participação por gateway." },
    {
      icon: "check",
      title: "Assinaturas & Churn",
      description: subsData.kpis.activeMembers > 0
        ? `Taxa de churn atual de ${subsData.kpis.churnRate}%, com ${subsData.kpis.activeMembers} assinantes ativos.`
        : "Nenhuma assinatura ativa no momento — MRR e churn ficarão disponíveis assim que houver assinantes.",
    },
  ];

  return {
    period,
    periodLabel: ANALYTICS_PERIOD_LABELS[period],
    overviewData,
    cardsData,
    revenueTrend: salesData.revenueEvolution.map((m) => m.gross),
    watchHoursTrend: coursesData.monthlyEngagement.map((m) => m.watchHours),
    agentTrend: agentsData.dailyInteractions.map((d) => d.messages),
    growthTrend,
    growthLabel,
    insights,
  };
}
