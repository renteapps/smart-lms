"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Banknote, CircleDollarSign, Coins, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Card, ProgressBar, Tabs, toast } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { formatAiCostBrl, formatAiCredits } from "@/lib/aiCredits";
import { calculateAiPrice, calculateTokenCostUsd } from "@/lib/aiPricing";
import { saveBillingSettings, saveFeaturePolicy, saveModelPricing, savePlanLimits, type BillingSettingsInput } from "./actions";

type SettingsRow = {
  credit_value_brl: number | string;
  target_margin_percent: number | string;
  exchange_buffer_percent: number | string;
  reservation_buffer_percent: number | string;
  monthly_budget_brl: number | string;
  warning_threshold_percent: number | string;
  critical_threshold_percent: number | string;
  default_daily_credits: number | string;
  default_weekly_credits: number | string;
  default_monthly_credits: number | string;
  manual_exchange_rate: number | string | null;
  monthly_reserved_cost_brl: number | string;
  monthly_actual_cost_brl: number | string;
};

type PolicyRow = {
  feature: string;
  display_name: string;
  enabled: boolean;
  charge_user: boolean;
  margin_override_percent: number | string | null;
  max_output_tokens: number;
};

type ModelRow = {
  model: string;
  display_name: string;
  prompt_usd_per_million: number | string;
  completion_usd_per_million: number | string;
  enabled: boolean;
};

type PlanRow = {
  id: string;
  name: string;
  is_active: boolean;
  ai_daily_credits: number | string;
  ai_weekly_credits: number | string;
  ai_monthly_credits: number | string;
};

type UsageRow = {
  id: string;
  user_id: string | null;
  feature: string;
  model: string;
  status: string;
  credits_charged: number | string;
  prompt_tokens: number | string;
  completion_tokens: number | string;
  reasoning_tokens: number | string;
  cached_tokens: number | string;
  provider_cost_usd: number | string;
  provider_cost_brl: number | string;
  protected_cost_brl: number | string;
  nominal_revenue_brl: number | string;
  pricing_source: string;
  generation_id: string | null;
  error_code: string | null;
  created_at: string;
};

type ProfileRow = { id: string; full_name: string | null; email: string | null };
type RateRow = { rate_date: string; usd_brl: number | string; source: string; fetched_at: string };

const number = (value: unknown) => Number(value) || 0;
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const integer = (value: number) => new Intl.NumberFormat("pt-BR").format(Math.round(value));
const inputClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

function Field({ label, value, onChange, step = "1", min = "0", help }: {
  label: string; value: number | string; onChange: (value: number) => void; step?: string; min?: string; help?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <input className={inputClass} type="number" min={min} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      {help && <span className="block text-[11px] leading-4 text-muted">{help}</span>}
    </label>
  );
}

function SwitchControl({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[var(--color-accent)]" />
      {label}
    </label>
  );
}

export function CreditsAdminClient({ initialSettings, initialPolicies, initialModels, plans: initialPlans, events, profiles, latestRate }: {
  initialSettings: SettingsRow | null;
  initialPolicies: PolicyRow[];
  initialModels: ModelRow[];
  plans: PlanRow[];
  events: UsageRow[];
  profiles: ProfileRow[];
  latestRate: RateRow | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defaults: BillingSettingsInput = {
    creditValueBrl: number(initialSettings?.credit_value_brl) || 0.01,
    targetMarginPercent: number(initialSettings?.target_margin_percent) || 50,
    exchangeBufferPercent: number(initialSettings?.exchange_buffer_percent) || 10,
    reservationBufferPercent: number(initialSettings?.reservation_buffer_percent) || 25,
    monthlyBudgetBrl: number(initialSettings?.monthly_budget_brl) || 500,
    warningThresholdPercent: number(initialSettings?.warning_threshold_percent) || 70,
    criticalThresholdPercent: number(initialSettings?.critical_threshold_percent) || 90,
    defaultDailyCredits: number(initialSettings?.default_daily_credits) || 25,
    defaultWeeklyCredits: number(initialSettings?.default_weekly_credits) || 100,
    defaultMonthlyCredits: number(initialSettings?.default_monthly_credits) || 400,
    manualExchangeRate: initialSettings?.manual_exchange_rate == null ? null : number(initialSettings.manual_exchange_rate),
  };
  const [settings, setSettings] = useState(defaults);
  const [policies, setPolicies] = useState(initialPolicies);
  const [models, setModels] = useState(initialModels);
  const [plans, setPlans] = useState(initialPlans);
  const [range, setRange] = useState("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [featureFilter, setFeatureFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<"feature" | "user" | "model">("feature");
  const [page, setPage] = useState(1);
  const [simModel, setSimModel] = useState(models[0]?.model ?? "");
  const [simFeature, setSimFeature] = useState(policies[0]?.feature ?? "agent_chat");
  const [simPrompt, setSimPrompt] = useState(1000);
  const [simCompletion, setSimCompletion] = useState(1000);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  const filtered = useMemo(() => {
    const now = new Date();
    const start = range === "custom" && customStart ? new Date(`${customStart}T00:00:00`) : new Date(now.getTime() - Number(range) * 86_400_000);
    const end = range === "custom" && customEnd ? new Date(`${customEnd}T23:59:59`) : now;
    return events.filter((event) => {
      const created = new Date(event.created_at);
      return created >= start && created <= end
        && (featureFilter === "all" || event.feature === featureFilter)
        && (statusFilter === "all" || event.status === statusFilter);
    });
  }, [customEnd, customStart, events, featureFilter, range, statusFilter]);

  const totals = useMemo(() => filtered.reduce((acc, event) => {
    acc.cost += number(event.provider_cost_brl);
    acc.revenue += number(event.nominal_revenue_brl);
    acc.credits += number(event.credits_charged);
    acc.tokens += number(event.prompt_tokens) + number(event.completion_tokens);
    if (event.status === "settled") acc.calls += 1;
    if (event.status === "refunded") acc.refunds += 1;
    return acc;
  }, { cost: 0, revenue: 0, credits: 0, tokens: 0, calls: 0, refunds: 0 }), [filtered]);
  const profit = totals.revenue - totals.cost;
  const margin = totals.revenue > 0 ? (profit / totals.revenue) * 100 : 0;
  const monthCost = number(initialSettings?.monthly_actual_cost_brl);
  const monthReserved = number(initialSettings?.monthly_reserved_cost_brl);
  const budgetUsed = Math.min(100, ((monthCost + monthReserved) / settings.monthlyBudgetBrl) * 100);
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projectedMonthCost = today.getDate() > 0 ? (monthCost / today.getDate()) * daysInMonth : monthCost;
  const activeRate = settings.manualExchangeRate || number(latestRate?.usd_brl);
  const selectedModel = models.find((model) => model.model === simModel);
  const selectedPolicy = policies.find((policy) => policy.feature === simFeature);
  const simulator = selectedModel && activeRate > 0 ? calculateAiPrice({
    providerCostUsd: calculateTokenCostUsd(simPrompt, simCompletion, number(selectedModel.prompt_usd_per_million), number(selectedModel.completion_usd_per_million)),
    exchangeRate: activeRate,
    exchangeBufferPercent: settings.exchangeBufferPercent,
    marginPercent: selectedPolicy?.margin_override_percent == null ? settings.targetMarginPercent : number(selectedPolicy.margin_override_percent),
    creditValueBrl: settings.creditValueBrl,
  }) : null;
  const shownEvents = filtered.slice((page - 1) * 20, page * 20);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const groupedUsage = useMemo(() => {
    const groups = new Map<string, { label: string; calls: number; cost: number; credits: number; tokens: number }>();
    for (const event of filtered) {
      const profile = event.user_id ? profileMap.get(event.user_id) : null;
      const key = groupBy === "feature" ? event.feature : groupBy === "model" ? event.model : (event.user_id || "system");
      const label = groupBy === "user" ? (profile?.full_name || profile?.email || "Sistema") : key;
      const current = groups.get(key) ?? { label, calls: 0, cost: 0, credits: 0, tokens: 0 };
      current.calls += event.status === "settled" ? 1 : 0;
      current.cost += number(event.provider_cost_brl);
      current.credits += number(event.credits_charged);
      current.tokens += number(event.prompt_tokens) + number(event.completion_tokens);
      groups.set(key, current);
    }
    return [...groups.values()].sort((a, b) => b.cost - a.cost).slice(0, 20);
  }, [filtered, groupBy, profileMap]);

  const run = (action: () => Promise<{ success: boolean; message: string }>) => startTransition(async () => {
    const result = await action();
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else toast.danger("Não foi possível salvar", { description: result.message });
  });

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Finanças de IA" title="Créditos de IA" description="Controle custo real, preço ao usuário, franquias e risco de orçamento em uma única central." />

      <Card className={budgetUsed >= 90 ? "border-danger/40" : budgetUsed >= 70 ? "border-warning/40" : "border-success/30"}>
        <Card.Content className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-bold text-foreground"><ShieldCheck className="size-5 text-accent" /> Orçamento mensal protegido</p>
              <p className="mt-1 text-xs text-muted">Real {formatAiCostBrl(monthCost)} + reservado {formatAiCostBrl(monthReserved)} de {money(settings.monthlyBudgetBrl)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${budgetUsed >= 100 ? "bg-danger-soft text-danger-soft-foreground" : budgetUsed >= 90 ? "bg-warning-soft text-warning-soft-foreground" : "bg-success-soft text-success-soft-foreground"}`}>
              {budgetUsed >= 100 ? "Bloqueado" : budgetUsed >= 90 ? "Crítico" : budgetUsed >= 70 ? "Atenção" : "Saudável"}
            </span>
          </div>
          <ProgressBar value={budgetUsed} color={budgetUsed >= 90 ? "danger" : budgetUsed >= 70 ? "warning" : "success"} aria-label="Uso do orçamento mensal">
            <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
          </ProgressBar>
        </Card.Content>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Banknote, "Custo real", formatAiCostBrl(totals.cost), `${totals.calls} chamadas liquidadas`],
          [Coins, "Créditos cobrados", formatAiCredits(totals.credits), `${money(totals.revenue)} nominais`],
          [CircleDollarSign, "Resultado protegido", money(profit), `${margin.toFixed(1)}% de margem realizada`],
          [Gauge, "Tokens", integer(totals.tokens), `${totals.refunds} estornos no período`],
        ].map(([Icon, title, value, detail]) => {
          const MetricIcon = Icon as typeof Banknote;
          return <Card key={String(title)}><Card.Content><MetricIcon className="size-5 text-accent" /><p className="mt-3 text-xs font-semibold text-muted">{String(title)}</p><p className="mt-1 text-2xl font-bold text-foreground">{String(value)}</p><p className="mt-1 text-xs text-muted">{String(detail)}</p></Card.Content></Card>;
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {["7", "30", "90"].map((days) => <Button key={days} size="sm" variant={range === days ? "primary" : "outline"} onPress={() => { setRange(days); setPage(1); }}>{days} dias</Button>)}
        <Button size="sm" variant={range === "custom" ? "primary" : "outline"} onPress={() => setRange("custom")}>Personalizado</Button>
        {range === "custom" && <><input aria-label="Data inicial" type="date" className={inputClass + " max-w-40"} value={customStart} onChange={(event) => setCustomStart(event.target.value)} /><input aria-label="Data final" type="date" className={inputClass + " max-w-40"} value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></>}
      </div>

      <Tabs.Root defaultSelectedKey="overview">
        <Tabs.List aria-label="Áreas de gestão dos créditos" className="overflow-x-auto">
          <Tabs.Tab id="overview">Visão geral</Tabs.Tab><Tabs.Tab id="pricing">Precificação</Tabs.Tab><Tabs.Tab id="simulator">Simulador</Tabs.Tab><Tabs.Tab id="limits">Limites</Tabs.Tab><Tabs.Tab id="usage">Consumo</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="overview" className="space-y-5 pt-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><Card.Header><Card.Title>Consumo por função</Card.Title><Card.Description>Custo real no período selecionado.</Card.Description></Card.Header><Card.Content className="gap-3">
              {policies.map((policy) => {
                const cost = filtered.filter((event) => event.feature === policy.feature).reduce((sum, event) => sum + number(event.provider_cost_brl), 0);
                return <div key={policy.feature} className="flex items-center justify-between rounded-xl bg-background-secondary p-3"><span className="text-sm font-semibold">{policy.display_name}</span><span className="font-bold">{formatAiCostBrl(cost)}</span></div>;
              })}
            </Card.Content></Card>
            <Card><Card.Header><Card.Title>Projeção mensal</Card.Title><Card.Description>Ritmo atual comparado ao teto da plataforma.</Card.Description></Card.Header><Card.Content>
              <p className="text-3xl font-bold">{formatAiCostBrl(projectedMonthCost)}</p><p className="mt-2 text-sm text-muted">Projeção no ritmo atual; custo realizado {formatAiCostBrl(monthCost)}. O bloqueio é automático em {money(settings.monthlyBudgetBrl)} e reservas simultâneas também entram na proteção.</p>
              {budgetUsed >= settings.warningThresholdPercent && <p className="mt-4 flex gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning-soft-foreground"><AlertTriangle className="size-4 shrink-0" /> O consumo passou do primeiro alerta configurado.</p>}
            </Card.Content></Card>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="pricing" className="space-y-5 pt-5">
          <Card><Card.Header><Card.Title>Regra global de preço</Card.Title><Card.Description>Os valores salvos passam a valer nas próximas reservas, sem alterar o histórico.</Card.Description></Card.Header><Card.Content className="gap-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Valor de 1 crédito (R$)" value={settings.creditValueBrl} step="0.001" onChange={(value) => setSettings({ ...settings, creditValueBrl: value })} />
              <Field label="Margem alvo (%)" value={settings.targetMarginPercent} step="0.1" onChange={(value) => setSettings({ ...settings, targetMarginPercent: value })} />
              <Field label="Proteção cambial (%)" value={settings.exchangeBufferPercent} step="0.1" onChange={(value) => setSettings({ ...settings, exchangeBufferPercent: value })} />
              <Field label="Segurança da reserva (%)" value={settings.reservationBufferPercent} step="0.1" onChange={(value) => setSettings({ ...settings, reservationBufferPercent: value })} />
              <Field label="Câmbio manual (R$/USD)" value={settings.manualExchangeRate ?? ""} step="0.0001" onChange={(value) => setSettings({ ...settings, manualExchangeRate: value || null })} help="Vazio usa PTAX automática e, em falha, a última cotação válida." />
            </div>
            <div className="rounded-xl bg-background-secondary p-3 text-xs text-muted">Câmbio efetivo: <strong className="text-foreground">R$ {activeRate.toFixed(4)}</strong> · fonte {settings.manualExchangeRate ? "override manual" : latestRate ? `${latestRate.source} de ${new Date(latestRate.rate_date + "T12:00:00").toLocaleDateString("pt-BR")}` : "ainda indisponível — chamadas serão bloqueadas"}.</div>
            <Button isDisabled={isPending} onPress={() => run(() => saveBillingSettings(settings))}>Salvar regra global</Button>
          </Card.Content></Card>

          <Card><Card.Header><Card.Title>Preços por modelo</Card.Title><Card.Description>Modelos sem preço conhecido ou desativados ficam bloqueados.</Card.Description></Card.Header><Card.Content className="gap-3">
            {models.map((model, index) => <div key={model.model} className="grid gap-3 rounded-xl border border-border p-4 lg:grid-cols-[minmax(180px,1.4fr)_1fr_1fr_auto] lg:items-end">
              <div><p className="font-semibold">{model.display_name}</p><p className="text-xs text-muted">{model.model}</p>{activeRate > 0 && (() => { const base = { exchangeRate: activeRate, exchangeBufferPercent: settings.exchangeBufferPercent, marginPercent: settings.targetMarginPercent, creditValueBrl: settings.creditValueBrl }; const inputSample = calculateAiPrice({ ...base, providerCostUsd: calculateTokenCostUsd(1000, 0, number(model.prompt_usd_per_million), 0) }); const outputSample = calculateAiPrice({ ...base, providerCostUsd: calculateTokenCostUsd(0, 1000, 0, number(model.completion_usd_per_million)) }); return <p className="mt-1 text-[11px] font-semibold text-accent">Por 1k tokens: entrada {formatAiCredits(inputSample.credits)} créditos · saída {formatAiCredits(outputSample.credits)} créditos</p>; })()}</div>
              <Field label="Entrada / 1M tokens (USD)" value={model.prompt_usd_per_million} step="0.0001" onChange={(value) => setModels((current) => current.map((item, i) => i === index ? { ...item, prompt_usd_per_million: value } : item))} />
              <Field label="Saída / 1M tokens (USD)" value={model.completion_usd_per_million} step="0.0001" onChange={(value) => setModels((current) => current.map((item, i) => i === index ? { ...item, completion_usd_per_million: value } : item))} />
              <div className="flex items-center gap-3"><SwitchControl checked={model.enabled} onChange={(enabled) => setModels((current) => current.map((item, i) => i === index ? { ...item, enabled } : item))} label="Liberado" /><Button size="sm" variant="outline" isDisabled={isPending} onPress={() => run(() => saveModelPricing({ model: model.model, promptUsdPerMillion: number(model.prompt_usd_per_million), completionUsdPerMillion: number(model.completion_usd_per_million), enabled: model.enabled }))}>Salvar</Button></div>
            </div>)}
          </Card.Content></Card>
        </Tabs.Panel>

        <Tabs.Panel id="simulator" className="pt-5">
          <Card><Card.Header><Card.Title>Simulador antes de salvar</Card.Title><Card.Description>Compare custo do provedor e débito do usuário com a regra atual.</Card.Description></Card.Header><Card.Content className="gap-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1.5"><span className="text-xs font-semibold text-muted">Função</span><select className={inputClass} value={simFeature} onChange={(event) => setSimFeature(event.target.value)}>{policies.map((policy) => <option key={policy.feature} value={policy.feature}>{policy.display_name}</option>)}</select></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-muted">Modelo</span><select className={inputClass} value={simModel} onChange={(event) => setSimModel(event.target.value)}>{models.map((model) => <option key={model.model} value={model.model}>{model.display_name}</option>)}</select></label>
              <Field label="Tokens de entrada" value={simPrompt} onChange={setSimPrompt} />
              <Field label="Tokens de saída" value={simCompletion} onChange={setSimCompletion} />
            </div>
            {simulator ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Custo USD", `$ ${calculateTokenCostUsd(simPrompt, simCompletion, number(selectedModel?.prompt_usd_per_million), number(selectedModel?.completion_usd_per_million)).toFixed(6)}`], ["Custo em reais", formatAiCostBrl(simulator.providerCostBrl)], ["Cobrança", `${formatAiCredits(simulator.credits)} créditos`], ["Valor nominal", money(simulator.nominalRevenueBrl)]].map(([label, value]) => <div key={label} className="rounded-xl bg-background-secondary p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div> : <p className="rounded-xl bg-danger-soft p-4 text-sm text-danger-soft-foreground">Informe uma cotação válida para simular.</p>}
          </Card.Content></Card>
        </Tabs.Panel>

        <Tabs.Panel id="limits" className="space-y-5 pt-5">
          <Card><Card.Header><Card.Title>Orçamento e franquia padrão</Card.Title></Card.Header><Card.Content className="gap-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Orçamento mensal (R$)" value={settings.monthlyBudgetBrl} step="1" onChange={(value) => setSettings({ ...settings, monthlyBudgetBrl: value })} />
            <Field label="Primeiro alerta (%)" value={settings.warningThresholdPercent} onChange={(value) => setSettings({ ...settings, warningThresholdPercent: value })} />
            <Field label="Alerta crítico (%)" value={settings.criticalThresholdPercent} onChange={(value) => setSettings({ ...settings, criticalThresholdPercent: value })} />
            <Field label="Padrão por dia" value={settings.defaultDailyCredits} step="0.0001" onChange={(value) => setSettings({ ...settings, defaultDailyCredits: value })} />
            <Field label="Padrão por semana" value={settings.defaultWeeklyCredits} step="0.0001" onChange={(value) => setSettings({ ...settings, defaultWeeklyCredits: value })} />
            <Field label="Padrão por mês" value={settings.defaultMonthlyCredits} step="0.0001" onChange={(value) => setSettings({ ...settings, defaultMonthlyCredits: value })} />
          </div><Button isDisabled={isPending} onPress={() => run(() => saveBillingSettings(settings))}>Salvar limites globais</Button></Card.Content></Card>

          <Card><Card.Header><Card.Title>Funções de IA</Card.Title><Card.Description>Pause rapidamente um fluxo ou aplique margem própria.</Card.Description></Card.Header><Card.Content className="gap-3">{policies.map((policy, index) => <div key={policy.feature} className="grid gap-3 rounded-xl border border-border p-4 lg:grid-cols-[1.3fr_auto_auto_160px_160px_auto] lg:items-end"><div><p className="font-semibold">{policy.display_name}</p><p className="text-xs text-muted">{policy.feature}</p></div><SwitchControl label="Ativa" checked={policy.enabled} onChange={(enabled) => setPolicies((current) => current.map((item, i) => i === index ? { ...item, enabled } : item))} /><SwitchControl label="Cobra usuário" checked={policy.charge_user} onChange={(charge_user) => setPolicies((current) => current.map((item, i) => i === index ? { ...item, charge_user } : item))} /><Field label="Margem própria (%)" value={policy.margin_override_percent ?? ""} step="0.1" onChange={(value) => setPolicies((current) => current.map((item, i) => i === index ? { ...item, margin_override_percent: value || null } : item))} /><Field label="Máx. saída" value={policy.max_output_tokens} onChange={(value) => setPolicies((current) => current.map((item, i) => i === index ? { ...item, max_output_tokens: value } : item))} /><Button size="sm" variant="outline" isDisabled={isPending} onPress={() => run(() => saveFeaturePolicy({ feature: policy.feature, enabled: policy.enabled, chargeUser: policy.charge_user, marginOverridePercent: policy.margin_override_percent == null ? null : number(policy.margin_override_percent), maxOutputTokens: number(policy.max_output_tokens) }))}>Salvar</Button></div>)}</Card.Content></Card>

          <Card><Card.Header><Card.Title>Franquias por plano</Card.Title><Card.Description>A assinatura individual ativa prevalece sobre a da organização.</Card.Description></Card.Header><Card.Content className="gap-3">{plans.map((plan, index) => <div key={plan.id} className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-[1.4fr_repeat(3,1fr)_auto] md:items-end"><div><p className="font-semibold">{plan.name}</p><p className="text-xs text-muted">{plan.is_active ? "Ativo" : "Inativo"}</p></div><Field label="Dia" value={plan.ai_daily_credits} step="0.0001" onChange={(value) => setPlans((current) => current.map((item, i) => i === index ? { ...item, ai_daily_credits: value } : item))} /><Field label="Semana" value={plan.ai_weekly_credits} step="0.0001" onChange={(value) => setPlans((current) => current.map((item, i) => i === index ? { ...item, ai_weekly_credits: value } : item))} /><Field label="Mês" value={plan.ai_monthly_credits} step="0.0001" onChange={(value) => setPlans((current) => current.map((item, i) => i === index ? { ...item, ai_monthly_credits: value } : item))} /><Button size="sm" variant="outline" isDisabled={isPending} onPress={() => run(() => savePlanLimits({ planId: plan.id, daily: number(plan.ai_daily_credits), weekly: number(plan.ai_weekly_credits), monthly: number(plan.ai_monthly_credits) }))}>Salvar</Button></div>)}</Card.Content></Card>
        </Tabs.Panel>

        <Tabs.Panel id="usage" className="space-y-4 pt-5">
          <div className="flex flex-wrap gap-3"><select className={inputClass + " max-w-56"} value={featureFilter} onChange={(event) => { setFeatureFilter(event.target.value); setPage(1); }}><option value="all">Todas as funções</option>{policies.map((policy) => <option key={policy.feature} value={policy.feature}>{policy.display_name}</option>)}</select><select className={inputClass + " max-w-48"} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">Todos os status</option><option value="settled">Liquidado</option><option value="reserved">Reservado</option><option value="refunded">Estornado</option><option value="failed">Falhou</option></select><select aria-label="Agrupar consumo por" className={inputClass + " max-w-48"} value={groupBy} onChange={(event) => setGroupBy(event.target.value as typeof groupBy)}><option value="feature">Agrupar por função</option><option value="user">Agrupar por usuário</option><option value="model">Agrupar por modelo</option></select></div>
          <Card><Card.Header><Card.Title>Resumo agrupado</Card.Title><Card.Description>Maiores consumidores por {groupBy === "feature" ? "função" : groupBy === "user" ? "usuário" : "modelo"}.</Card.Description></Card.Header><Card.Content className="overflow-x-auto p-0"><table className="min-w-[650px] w-full text-left text-xs"><thead className="border-b border-border bg-background-secondary text-muted"><tr><th className="px-4 py-3">Grupo</th><th className="px-4 py-3">Chamadas</th><th className="px-4 py-3">Tokens</th><th className="px-4 py-3">Custo real</th><th className="px-4 py-3">Créditos</th></tr></thead><tbody>{groupedUsage.map((group) => <tr key={group.label} className="border-b border-border last:border-0"><td className="px-4 py-3 font-semibold">{group.label}</td><td className="px-4 py-3">{integer(group.calls)}</td><td className="px-4 py-3">{integer(group.tokens)}</td><td className="px-4 py-3">{formatAiCostBrl(group.cost)}</td><td className="px-4 py-3">{formatAiCredits(group.credits)}</td></tr>)}</tbody></table></Card.Content></Card>
          <Card><Card.Content className="overflow-x-auto p-0"><table className="min-w-[1050px] w-full text-left text-xs"><thead className="border-b border-border bg-background-secondary text-muted"><tr>{["Data", "Usuário", "Função / modelo", "Status", "Tokens", "Custo", "Créditos", "Margem", "Auditoria"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{shownEvents.map((event) => { const profile = event.user_id ? profileMap.get(event.user_id) : null; const revenue = number(event.nominal_revenue_brl); const eventMargin = revenue > 0 ? ((revenue - number(event.provider_cost_brl)) / revenue) * 100 : 0; return <tr key={event.id} className="border-b border-border last:border-0"><td className="px-4 py-3 whitespace-nowrap">{new Date(event.created_at).toLocaleString("pt-BR")}</td><td className="px-4 py-3"><p className="font-semibold">{profile?.full_name || "Sistema"}</p><p className="text-muted">{profile?.email || event.user_id?.slice(0, 8) || "—"}</p></td><td className="px-4 py-3"><p className="font-semibold">{event.feature}</p><p className="text-muted">{event.model}</p></td><td className="px-4 py-3">{event.status}{event.pricing_source === "estimated" ? " · estimado" : ""}</td><td className="px-4 py-3">{integer(number(event.prompt_tokens) + number(event.completion_tokens))}</td><td className="px-4 py-3">{formatAiCostBrl(number(event.provider_cost_brl))}</td><td className="px-4 py-3 font-bold">{formatAiCredits(number(event.credits_charged))}</td><td className="px-4 py-3">{eventMargin.toFixed(1)}%</td><td className="px-4 py-3"><p title={event.id}>{event.id.slice(0, 8)}</p><p className="text-muted" title={event.generation_id || ""}>{event.generation_id?.slice(0, 12) || event.error_code || "—"}</p></td></tr>; })}</tbody></table>{shownEvents.length === 0 && <p className="p-8 text-center text-sm text-muted">Nenhum evento no período e filtros escolhidos.</p>}</Card.Content></Card>
          <div className="flex items-center justify-between text-xs text-muted"><span>{filtered.length} eventos</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" isDisabled={page <= 1} onPress={() => setPage((current) => current - 1)}>Anterior</Button><span>{page} de {pageCount}</span><Button size="sm" variant="outline" isDisabled={page >= pageCount} onPress={() => setPage((current) => current + 1)}>Próxima</Button></div></div>
        </Tabs.Panel>
      </Tabs.Root>

      <Card className="border-accent/20 bg-accent-soft"><Card.Content className="flex-row items-start gap-3"><Sparkles className="mt-0.5 size-5 shrink-0 text-accent-soft-foreground" /><div><p className="font-bold text-accent-soft-foreground">Como o preço é calculado</p><p className="mt-1 text-sm text-accent-soft-foreground/80">Custo USD × câmbio × proteção cambial ÷ (1 − margem), dividido pelo valor do crédito e arredondado até 4 casas decimais. O histórico guarda uma fotografia completa da regra usada.</p></div></Card.Content></Card>
    </div>
  );
}
