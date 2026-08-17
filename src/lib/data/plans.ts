import { logQueryError, type DB, type Row } from "./types";

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
  is_active, is_highlighted, gateway_product_id, order_index, created_at, updated_at
`;

export function mapPlan(row: Row): Plan {
  const features = row.features;
  return {
    id: row.id,
    slug: row.slug ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    price: row.price != null ? Number(row.price) : 0,
    frequency: (row.frequency ?? "monthly") as PlanFrequency,
    seats: row.seats ?? undefined,
    features: Array.isArray(features) ? features : (features?.items ?? []),
    isB2B: row.is_b2b ?? false,
    isActive: row.is_active ?? true,
    isHighlighted: row.is_highlighted ?? false,
    gatewayProductId: row.gateway_product_id ?? undefined,
    orderIndex: row.order_index ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    .eq("status", "active")
    .maybeSingle();

  logQueryError("getMySubscription", error);
  return data ? mapSubscription(data) : null;
}
