import { logQueryError, type DB, type Row } from "./types";
import { isSubscriptionActive } from "@/lib/courseAccess";

export type PlanFrequency = "monthly" | "yearly" | "lifetime" | "custom";

export type Plan = {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  price: number;
  frequency: PlanFrequency;
  seats?: number;
  features: string[];
  isB2B: boolean;
  isActive: boolean;
  isHighlighted: boolean;
  gatewayProductId?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  gateway?: string;
  producerId?: string;
  offerId?: string;
  checkoutUrl?: string;
  accessTimeDays?: number;
  courseAccessType?: "all" | "specific";
  specificCourses?: string[];
  aiTokensUnlimited?: boolean;
  aiTokensWeekly?: number;
  aiDailyCredits: number;
  aiWeeklyCredits: number;
  aiMonthlyCredits: number;
};

export type Subscription = {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  organizationId?: string;
  organizationName?: string;
  planId?: string;
  planName?: string;
  status: string;
  amount: number;
  gateway?: string;
  startedAt?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  createdAt: string;
};

const PLAN_SELECT = `
  id, slug, name, description, price, frequency, seats, features, is_b2b,
  is_active, is_highlighted, gateway_product_id, order_index, created_at, updated_at,
  ai_daily_credits, ai_weekly_credits, ai_monthly_credits
`;

export function mapPlan(row: Row): Plan {
  const rawFeatures = row.features;
  const isStructured = rawFeatures && typeof rawFeatures === "object" && !Array.isArray(rawFeatures);
  const featureItems: string[] = Array.isArray(rawFeatures)
    ? rawFeatures
    : Array.isArray(rawFeatures?.items)
      ? rawFeatures.items
      : [];

  const extra = isStructured ? (rawFeatures as Record<string, unknown>) : {};

  return {
    id: row.id,
    slug: row.slug ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    price: row.price != null ? Number(row.price) : 0,
    frequency: (row.frequency ?? "monthly") as PlanFrequency,
    seats: row.seats != null ? Number(row.seats) : undefined,
    features: featureItems,
    isB2B: row.is_b2b ?? false,
    isActive: row.is_active ?? true,
    isHighlighted: row.is_highlighted ?? false,
    gatewayProductId: row.gateway_product_id ?? (extra.productId as string | undefined) ?? undefined,
    orderIndex: row.order_index ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    gateway: (extra.gateway as string | undefined) ?? undefined,
    producerId: (extra.producerId as string | undefined) ?? undefined,
    offerId: (extra.offerId as string | undefined) ?? undefined,
    checkoutUrl: (extra.checkoutUrl as string | undefined) ?? undefined,
    accessTimeDays: extra.accessTimeDays != null ? Number(extra.accessTimeDays) : undefined,
    courseAccessType: (extra.courseAccessType as "all" | "specific" | undefined) ?? (Array.isArray(extra.specificCourses) && extra.specificCourses.length > 0 ? "specific" : "all"),
    specificCourses: Array.isArray(extra.specificCourses) ? (extra.specificCourses as string[]) : [],
    aiTokensUnlimited: extra.aiTokensUnlimited !== undefined ? Boolean(extra.aiTokensUnlimited) : true,
    aiTokensWeekly: extra.aiTokensWeekly != null ? Number(extra.aiTokensWeekly) : undefined,
    aiDailyCredits: row.ai_daily_credits != null ? Number(row.ai_daily_credits) : 25,
    aiWeeklyCredits: row.ai_weekly_credits != null
      ? Number(row.ai_weekly_credits)
      : (extra.aiTokensWeekly != null ? Number(extra.aiTokensWeekly) : 100),
    aiMonthlyCredits: row.ai_monthly_credits != null ? Number(row.ai_monthly_credits) : 400,
  };
}

export async function getPlans(db: DB, onlyActive = false): Promise<Plan[]> {
  let query = db
    .from("plans")
    .select(PLAN_SELECT)
    .order("order_index", { ascending: true })
    .order("price", { ascending: true });

  if (onlyActive) query = query.eq("is_active", true);

  const { data, error } = await query;
  logQueryError("getPlans", error);
  return (data ?? []).map(mapPlan);
}

export async function getPlanById(db: DB, id: string): Promise<Plan | null> {
  const { data, error } = await db.from("plans").select(PLAN_SELECT).eq("id", id).maybeSingle();
  logQueryError("getPlanById", error);
  return data ? mapPlan(data) : null;
}

const SUBSCRIPTION_SELECT = `
  id, user_id, organization_id, plan_id, status, amount, gateway,
  gateway_subscription_id, started_at, current_period_end, cancel_at_period_end,
  canceled_at, created_at,
  profiles:user_id ( full_name, email ),
  organizations:organization_id ( name, trade_name ),
  plans:plan_id ( name )
`;

function mapSubscription(row: Row): Subscription {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    userName: row.profiles?.full_name ?? undefined,
    userEmail: row.profiles?.email ?? undefined,
    organizationId: row.organization_id ?? undefined,
    organizationName: row.organizations?.trade_name || row.organizations?.name || undefined,
    planId: row.plan_id ?? undefined,
    planName: row.plans?.name ?? undefined,
    status: row.status ?? "active",
    amount: row.amount != null ? Number(row.amount) : 0,
    gateway: row.gateway ?? undefined,
    startedAt: row.started_at ?? undefined,
    currentPeriodEnd: row.current_period_end ?? undefined,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
    canceledAt: row.canceled_at ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getSubscriptions(db: DB): Promise<Subscription[]> {
  const { data, error } = await db
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .order("created_at", { ascending: false });

  logQueryError("getSubscriptions", error);
  return (data ?? []).map(mapSubscription);
}

export async function getSubscriptionById(db: DB, id: string): Promise<Subscription | null> {
  const { data, error } = await db.from("subscriptions").select(SUBSCRIPTION_SELECT).eq("id", id).maybeSingle();
  logQueryError("getSubscriptionById", error);
  return data ? mapSubscription(data) : null;
}

export async function getMySubscription(db: DB, userId: string): Promise<Subscription | null> {
  const { data, error } = await db
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due", "suspended", "canceled"])
    .order("created_at", { ascending: false });

  logQueryError("getMySubscription", error);
  const row = (data ?? []).find((subscription) => isSubscriptionActive({
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
  }));
  return row ? mapSubscription(row) : null;
}
