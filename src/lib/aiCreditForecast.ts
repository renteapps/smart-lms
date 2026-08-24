export type AiForecastPlanInput = {
  id: string;
  name: string;
  frequency: string | null;
  price: number | string | null;
  isActive: boolean;
  dailyCredits: number | string;
  weeklyCredits: number | string;
  monthlyCredits: number | string;
};

export type AiForecastSubscriptionInput = {
  id: string;
  userId: string | null;
  organizationId: string | null;
  planId: string | null;
  status: string;
  amount: number | string | null;
  startedAt: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
};

export type AiForecastMembershipInput = {
  userId: string;
  organizationId: string;
  status: string;
};

export type AiForecastAccountInput = {
  userId: string;
  monthlyUsed: number | string;
  monthlyPeriodStartedAt: string;
  extraBalance: number | string;
};

export type AiCreditForecastRow = {
  subscriptionId: string;
  planId: string;
  planName: string;
  frequency: string;
  scope: "individual" | "organization";
  beneficiaries: number;
  entitlementWindows: number;
  periodEnd: string | null;
  isEstimatedPeriod: boolean;
  contractedRevenueBrl: number;
  futureCredits: number;
  nominalCommitmentBrl: number;
  protectedProviderCostBrl: number;
  recommendedCashBrl: number;
};

export type AiCreditPlanStressRow = {
  planId: string;
  planName: string;
  frequency: string;
  planPriceBrl: number;
  entitlementWindows: number;
  futureCredits: number;
  nominalCommitmentBrl: number;
  protectedProviderCostBrl: number;
  recommendedCashBrl: number;
  reserveToPricePercent: number | null;
  usesRollingYearAssumption: boolean;
};

export type AiCreditForecast = {
  generatedAt: string;
  creditValueBrl: number;
  reserveMarginPercent: number;
  operationalBufferPercent: number;
  protectedCostPerCreditBrl: number;
  recommendedCashPerCreditBrl: number;
  activeSubscriptions: number;
  beneficiaries: number;
  entitlementWindows: number;
  contractedRevenueBrl: number;
  contractedCredits: number;
  extraCredits: number;
  totalFutureCredits: number;
  nominalCommitmentBrl: number;
  protectedProviderCostBrl: number;
  recommendedCashBrl: number;
  rows: AiCreditForecastRow[];
  planStress: AiCreditPlanStressRow[];
};

type Candidate = {
  subscription: AiForecastSubscriptionInput;
  plan: AiForecastPlanInput;
  scope: "individual" | "organization";
  userId: string;
  start: Date;
  end: Date;
  isEstimatedPeriod: boolean;
};

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const addUtcMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
};

const nextUtcMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

const isSameUtcMonth = (left: Date, right: Date) => (
  left.getUTCFullYear() === right.getUTCFullYear() && left.getUTCMonth() === right.getUTCMonth()
);

function fallbackPeriodEnd(now: Date, frequency: string | null) {
  if (frequency === "monthly") return addUtcMonths(now, 1);
  return addUtcMonths(now, 12);
}

/** Conta as franquias mensais que podem ser usadas entre agora e o fim do contrato. */
export function countAiEntitlementWindows(now: Date, end: Date) {
  if (!Number.isFinite(end.getTime()) || end <= now) return 0;
  let windows = 1;
  let cursor = nextUtcMonth(now);
  while (cursor < end) {
    windows += 1;
    cursor = nextUtcMonth(cursor);
  }
  return windows;
}

function subscriptionPeriod(subscription: AiForecastSubscriptionInput, plan: AiForecastPlanInput, now: Date) {
  const explicitEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const validExplicitEnd = explicitEnd && Number.isFinite(explicitEnd.getTime()) && explicitEnd > now;
  return {
    end: validExplicitEnd ? explicitEnd : fallbackPeriodEnd(now, plan.frequency),
    isEstimated: !validExplicitEnd,
  };
}

function stressPeriod(plan: AiForecastPlanInput, now: Date) {
  const frequency = plan.frequency ?? "custom";
  return {
    end: addUtcMonths(now, frequency === "monthly" ? 1 : 12),
    rolling: frequency === "lifetime" || frequency === "custom",
  };
}

function roundCredits(value: number) {
  return Math.round(Math.max(0, value) * 10_000) / 10_000;
}

function ceilMoney(value: number) {
  const rounded = Math.ceil(Math.max(0, value) * 100 - 1e-9) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function buildAiCreditForecast(input: {
  now?: Date;
  creditValueBrl: number;
  reserveMarginPercent: number;
  operationalBufferPercent: number;
  plans: AiForecastPlanInput[];
  subscriptions: AiForecastSubscriptionInput[];
  memberships: AiForecastMembershipInput[];
  accounts: AiForecastAccountInput[];
}): AiCreditForecast {
  const now = input.now ?? new Date();
  const creditValueBrl = Math.max(0, number(input.creditValueBrl));
  const reserveMarginPercent = Math.min(99.99, Math.max(0, number(input.reserveMarginPercent)));
  const operationalBufferPercent = Math.max(0, number(input.operationalBufferPercent));
  const protectedCostPerCreditBrl = creditValueBrl * (1 - reserveMarginPercent / 100);
  const recommendedCashPerCreditBrl = protectedCostPerCreditBrl * (1 + operationalBufferPercent / 100);
  const planMap = new Map(input.plans.map((plan) => [plan.id, plan]));
  const membersByOrganization = new Map<string, string[]>();
  for (const membership of input.memberships) {
    if (membership.status !== "active") continue;
    const members = membersByOrganization.get(membership.organizationId) ?? [];
    members.push(membership.userId);
    membersByOrganization.set(membership.organizationId, members);
  }

  const candidatesByUser = new Map<string, Candidate[]>();
  for (const subscription of input.subscriptions) {
    if (!["active", "trialing"].includes(subscription.status)) continue;
    const plan = subscription.planId ? planMap.get(subscription.planId) : null;
    if (!plan?.isActive) continue;
    const period = subscriptionPeriod(subscription, plan, now);
    const parsedStart = new Date(subscription.startedAt || subscription.createdAt);
    const start = Number.isFinite(parsedStart.getTime()) ? parsedStart : now;
    const beneficiaries = subscription.userId
      ? [subscription.userId]
      : subscription.organizationId
        ? (membersByOrganization.get(subscription.organizationId) ?? [])
        : [];
    for (const userId of beneficiaries) {
      const candidate: Candidate = {
        subscription,
        plan,
        scope: subscription.userId ? "individual" : "organization",
        userId,
        start,
        end: period.end,
        isEstimatedPeriod: period.isEstimated,
      };
      const current = candidatesByUser.get(userId) ?? [];
      current.push(candidate);
      candidatesByUser.set(userId, current);
    }
  }

  const accountMap = new Map(input.accounts.map((account) => [account.userId, account]));
  const grouped = new Map<string, {
    candidate: Candidate;
    users: Set<string>;
    windows: number;
    credits: number;
  }>();

  const chooseCandidate = (candidates: Candidate[], date: Date) => {
    const active = candidates.filter((candidate) => candidate.start <= date && candidate.end > date);
    const individual = active.filter((candidate) => candidate.scope === "individual");
    const pool = individual.length ? individual : active.filter((candidate) => candidate.scope === "organization");
    return pool.sort((left, right) => (
      number(right.plan.monthlyCredits) - number(left.plan.monthlyCredits)
      || number(right.plan.weeklyCredits) - number(left.plan.weeklyCredits)
    ))[0] ?? null;
  };

  for (const [userId, candidates] of candidatesByUser) {
    const latestEnd = candidates.reduce((latest, candidate) => candidate.end > latest ? candidate.end : latest, now);
    let windowDate = now;
    let isCurrentWindow = true;
    while (windowDate < latestEnd) {
      const selected = chooseCandidate(candidates, windowDate);
      if (selected) {
        let credits = number(selected.plan.monthlyCredits);
        if (isCurrentWindow) {
          const account = accountMap.get(userId);
          const periodStart = account ? new Date(account.monthlyPeriodStartedAt) : null;
          const used = periodStart && Number.isFinite(periodStart.getTime()) && isSameUtcMonth(periodStart, now)
            ? number(account?.monthlyUsed)
            : 0;
          credits = Math.max(0, credits - used);
        }
        const group = grouped.get(selected.subscription.id) ?? {
          candidate: selected,
          users: new Set<string>(),
          windows: 0,
          credits: 0,
        };
        group.users.add(userId);
        group.windows += 1;
        group.credits += credits;
        grouped.set(selected.subscription.id, group);
      }
      isCurrentWindow = false;
      windowDate = nextUtcMonth(windowDate);
    }
  }

  const rows = [...grouped.values()].map(({ candidate, users, windows, credits }) => {
    const futureCredits = roundCredits(credits);
    const nominalCommitmentBrl = futureCredits * creditValueBrl;
    const protectedProviderCostBrl = futureCredits * protectedCostPerCreditBrl;
    return {
      subscriptionId: candidate.subscription.id,
      planId: candidate.plan.id,
      planName: candidate.plan.name,
      frequency: candidate.plan.frequency ?? "custom",
      scope: candidate.scope,
      beneficiaries: users.size,
      entitlementWindows: windows,
      periodEnd: candidate.subscription.currentPeriodEnd,
      isEstimatedPeriod: candidate.isEstimatedPeriod,
      contractedRevenueBrl: number(candidate.subscription.amount),
      futureCredits,
      nominalCommitmentBrl: ceilMoney(nominalCommitmentBrl),
      protectedProviderCostBrl: ceilMoney(protectedProviderCostBrl),
      recommendedCashBrl: ceilMoney(protectedProviderCostBrl * (1 + operationalBufferPercent / 100)),
    } satisfies AiCreditForecastRow;
  }).sort((left, right) => right.recommendedCashBrl - left.recommendedCashBrl);

  const extraCredits = roundCredits(input.accounts.reduce((sum, account) => sum + Math.max(0, number(account.extraBalance)), 0));
  const contractedCredits = roundCredits(rows.reduce((sum, row) => sum + row.futureCredits, 0));
  const totalFutureCredits = roundCredits(contractedCredits + extraCredits);
  const nominalCommitmentBrl = totalFutureCredits * creditValueBrl;
  const protectedProviderCostBrl = totalFutureCredits * protectedCostPerCreditBrl;
  const selectedSubscriptions = new Set(rows.map((row) => row.subscriptionId));
  const contractedRevenueBrl = input.subscriptions.reduce((sum, subscription) => (
    selectedSubscriptions.has(subscription.id) ? sum + number(subscription.amount) : sum
  ), 0);

  const planStress = input.plans.filter((plan) => plan.isActive).map((plan) => {
    const period = stressPeriod(plan, now);
    const entitlementWindows = countAiEntitlementWindows(now, period.end);
    const futureCredits = roundCredits(number(plan.monthlyCredits) * entitlementWindows);
    const nominal = futureCredits * creditValueBrl;
    const protectedCost = futureCredits * protectedCostPerCreditBrl;
    const recommendedCash = ceilMoney(protectedCost * (1 + operationalBufferPercent / 100));
    const planPriceBrl = number(plan.price);
    return {
      planId: plan.id,
      planName: plan.name,
      frequency: plan.frequency ?? "custom",
      planPriceBrl,
      entitlementWindows,
      futureCredits,
      nominalCommitmentBrl: ceilMoney(nominal),
      protectedProviderCostBrl: ceilMoney(protectedCost),
      recommendedCashBrl: recommendedCash,
      reserveToPricePercent: planPriceBrl > 0 ? (recommendedCash / planPriceBrl) * 100 : null,
      usesRollingYearAssumption: period.rolling,
    } satisfies AiCreditPlanStressRow;
  }).sort((left, right) => right.recommendedCashBrl - left.recommendedCashBrl);

  return {
    generatedAt: now.toISOString(),
    creditValueBrl,
    reserveMarginPercent,
    operationalBufferPercent,
    protectedCostPerCreditBrl,
    recommendedCashPerCreditBrl,
    activeSubscriptions: selectedSubscriptions.size,
    beneficiaries: candidatesByUser.size,
    entitlementWindows: rows.reduce((sum, row) => sum + row.entitlementWindows, 0),
    contractedRevenueBrl: ceilMoney(contractedRevenueBrl),
    contractedCredits,
    extraCredits,
    totalFutureCredits,
    nominalCommitmentBrl: ceilMoney(nominalCommitmentBrl),
    protectedProviderCostBrl: ceilMoney(protectedProviderCostBrl),
    recommendedCashBrl: ceilMoney(protectedProviderCostBrl * (1 + operationalBufferPercent / 100)),
    rows,
    planStress,
  };
}
