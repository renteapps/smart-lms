-- Corrige falha grave: qualquer usuário autenticado — mesmo sem assinatura e
-- sem matrícula em curso algum — recebia uma franquia recorrente de créditos
-- de IA (`ai_billing_settings.default_*_credits`) só por existir. Isso permitia
-- abrir /agentes e conversar com um agente gastando créditos reais sem nunca
-- ter contratado um plano.
--
-- A partir de agora a franquia recorrente (diária/semanal/mensal) só é
-- concedida quando o usuário tem uma assinatura individual ativa, ou pertence
-- a uma organização com assinatura ativa. Sem plano ativo, a única fonte de
-- créditos passa a ser o saldo extra concedido manualmente por um admin
-- (`add_ai_credits`) — que continua funcionando normalmente. Os campos
-- `default_daily_credits`/`default_weekly_credits`/`default_monthly_credits`
-- em `ai_billing_settings` deixam de ser usados como franquia implícita.

create or replace function public.reserve_ai_usage(
  p_user_id uuid,
  p_feature text,
  p_model text,
  p_request_key uuid,
  p_estimated_cost_brl numeric,
  p_reservation_credits numeric,
  p_exchange_rate numeric,
  p_charge_user boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  settings public.ai_billing_settings%rowtype;
  policy public.ai_feature_policies%rowtype;
  model_pricing public.ai_model_pricing%rowtype;
  account public.ai_credit_accounts%rowtype;
  existing_event public.ai_usage_events%rowtype;
  event_id uuid;
  day_start timestamptz := date_trunc('day', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza';
  week_start timestamptz := date_trunc('week', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza';
  month_start timestamptz := date_trunc('month', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza';
  resolved_daily numeric;
  resolved_weekly numeric;
  resolved_monthly numeric;
  has_active_plan boolean := false;
  recurring_available numeric;
  recurring_reserved numeric := 0;
  extra_reserved numeric := 0;
begin
  if p_user_id is null or p_request_key is null or p_reservation_credits < 0 or p_estimated_cost_brl < 0 then
    raise check_violation using message = 'Reserva de IA inválida.';
  end if;

  select * into settings from public.ai_billing_settings where id = 1 for update;
  select * into existing_event from public.ai_usage_events where request_key = p_request_key;
  if found then
    if existing_event.user_id is distinct from p_user_id
      or existing_event.feature is distinct from p_feature
      or existing_event.model is distinct from p_model then
      raise unique_violation using message = 'A chave idempotente já pertence a outra chamada.';
    end if;
    return jsonb_build_object(
      'event_id', existing_event.id,
      'reserved_credits', existing_event.reservation_credits,
      'idempotent', true
    );
  end if;
  if settings.budget_period_started_at < month_start then
    update public.ai_billing_settings
    set monthly_reserved_cost_brl = 0, monthly_actual_cost_brl = 0,
        budget_period_started_at = month_start, updated_at = now()
    where id = 1 returning * into settings;
  end if;

  select * into policy from public.ai_feature_policies where feature = p_feature;
  if not found or not policy.enabled then
    raise insufficient_privilege using message = 'AI_FEATURE_DISABLED';
  end if;

  select * into model_pricing from public.ai_model_pricing where model = p_model and enabled = true;
  if not found then
    raise insufficient_privilege using message = 'AI_MODEL_PRICING_UNAVAILABLE';
  end if;

  if settings.monthly_actual_cost_brl + settings.monthly_reserved_cost_brl + p_estimated_cost_brl > settings.monthly_budget_brl then
    raise insufficient_privilege using message = 'AI_GLOBAL_BUDGET_EXCEEDED';
  end if;

  -- Franquia recorrente só existe com plano ativo (individual ou via
  -- organização) — nada de cair para uma franquia "padrão" global.
  select p.ai_daily_credits, p.ai_weekly_credits, p.ai_monthly_credits
  into resolved_daily, resolved_weekly, resolved_monthly
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing')
    and p.is_active = true
    and (s.current_period_end is null or s.current_period_end > now())
  order by p.ai_monthly_credits desc, p.ai_weekly_credits desc
  limit 1;
  has_active_plan := found;

  if not has_active_plan then
    select p.ai_daily_credits, p.ai_weekly_credits, p.ai_monthly_credits
    into resolved_daily, resolved_weekly, resolved_monthly
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    join public.plans p on p.id = s.plan_id
    where om.user_id = p_user_id
      and om.status = 'active'
      and s.status in ('active', 'trialing')
      and p.is_active = true
      and (s.current_period_end is null or s.current_period_end > now())
    order by p.ai_monthly_credits desc, p.ai_weekly_credits desc
    limit 1;
    has_active_plan := found;
  end if;

  if has_active_plan then
    insert into public.ai_credit_accounts (user_id, daily_limit, weekly_limit, monthly_limit)
    values (p_user_id, resolved_daily, resolved_weekly, resolved_monthly)
    on conflict (user_id) do update set
      daily_limit = excluded.daily_limit,
      weekly_limit = excluded.weekly_limit,
      monthly_limit = excluded.monthly_limit,
      updated_at = now();
  else
    -- Garante que a conta exista (para guardar extra_balance), sem tocar na
    -- franquia recorrente: ela simplesmente não é usada sem plano ativo.
    insert into public.ai_credit_accounts (user_id)
    values (p_user_id)
    on conflict (user_id) do nothing;
  end if;

  select * into account from public.ai_credit_accounts where user_id = p_user_id for update;

  account.daily_used := case when account.daily_period_started_at < day_start then 0 else account.daily_used end;
  account.weekly_used := case when account.weekly_period_started_at < week_start then 0 else account.weekly_used end;
  account.monthly_used := case when account.monthly_period_started_at < month_start then 0 else account.monthly_used end;

  if p_charge_user and p_reservation_credits > 0 then
    if has_active_plan then
      recurring_available := least(
        greatest(account.daily_limit - account.daily_used, 0),
        greatest(account.weekly_limit - account.weekly_used, 0),
        greatest(account.monthly_limit - account.monthly_used, 0)
      );
    else
      recurring_available := 0;
    end if;

    recurring_reserved := least(p_reservation_credits, recurring_available);
    extra_reserved := p_reservation_credits - recurring_reserved;

    if extra_reserved > account.extra_balance then
      if not has_active_plan then
        raise insufficient_privilege using message = 'AI_NO_ACTIVE_PLAN';
      end if;
      if account.daily_used + p_reservation_credits > account.daily_limit then
        raise insufficient_privilege using message = 'AI_DAILY_LIMIT_EXCEEDED';
      end if;
      if account.weekly_used + p_reservation_credits > account.weekly_limit then
        raise insufficient_privilege using message = 'AI_WEEKLY_LIMIT_EXCEEDED';
      end if;
      if account.monthly_used + p_reservation_credits > account.monthly_limit then
        raise insufficient_privilege using message = 'AI_MONTHLY_LIMIT_EXCEEDED';
      end if;
      raise insufficient_privilege using message = 'AI_CREDITS_INSUFFICIENT';
    end if;
  end if;

  update public.ai_credit_accounts
  set
    daily_used = account.daily_used + recurring_reserved,
    weekly_used = account.weekly_used + recurring_reserved,
    monthly_used = account.monthly_used + recurring_reserved,
    extra_balance = account.extra_balance - extra_reserved,
    daily_period_started_at = greatest(account.daily_period_started_at, day_start),
    weekly_period_started_at = greatest(account.weekly_period_started_at, week_start),
    monthly_period_started_at = greatest(account.monthly_period_started_at, month_start),
    updated_at = now()
  where user_id = p_user_id;

  update public.ai_billing_settings
  set monthly_reserved_cost_brl = monthly_reserved_cost_brl + p_estimated_cost_brl, updated_at = now()
  where id = 1;

  insert into public.ai_usage_events (
    request_key, user_id, feature, model, charge_user, reservation_credits,
    reserved_recurring_credits, reserved_extra_credits, estimated_provider_cost_brl,
    exchange_rate, prompt_usd_per_million, completion_usd_per_million,
    credit_value_brl, margin_percent, exchange_buffer_percent
  ) values (
    p_request_key, p_user_id, p_feature, p_model, p_charge_user,
    case when p_charge_user then p_reservation_credits else 0 end,
    recurring_reserved, extra_reserved, p_estimated_cost_brl, p_exchange_rate,
    model_pricing.prompt_usd_per_million, model_pricing.completion_usd_per_million,
    settings.credit_value_brl, coalesce(policy.margin_override_percent, settings.target_margin_percent),
    settings.exchange_buffer_percent
  )
  returning id into event_id;

  if p_charge_user and p_reservation_credits > 0 then
    insert into public.ai_credit_ledger (user_id, usage_event_id, entry_type, amount_credits, note)
    values (p_user_id, event_id, 'reservation', -p_reservation_credits, 'Reserva para chamada de IA');
  end if;

  return jsonb_build_object('event_id', event_id, 'reserved_credits', p_reservation_credits);
end;
$$;

-- Saldo exibido ao usuário precisa refletir a mesma regra: sem plano ativo, a
-- franquia recorrente aparece zerada (só o saldo extra, se houver, conta).
create or replace function public.get_ai_credit_balance(p_user_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_id uuid := coalesce(p_user_id, caller_id);
  settings public.ai_billing_settings%rowtype;
  account public.ai_credit_accounts%rowtype;
  day_start timestamptz := date_trunc('day', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza';
  week_start timestamptz := date_trunc('week', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza';
  month_start timestamptz := date_trunc('month', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza';
  day_used numeric := 0;
  week_used numeric := 0;
  month_used numeric := 0;
  has_active_plan boolean;
  daily_limit numeric := 0;
  weekly_limit numeric := 0;
  monthly_limit numeric := 0;
  extra_balance numeric := 0;
begin
  if caller_id is null then raise insufficient_privilege using message = 'Autenticação necessária.'; end if;
  if target_id is distinct from caller_id and not (select public.is_admin()) then
    raise insufficient_privilege using message = 'Você não pode consultar os créditos deste usuário.';
  end if;

  select * into settings from public.ai_billing_settings where id = 1;

  has_active_plan := exists (
    select 1
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.user_id = target_id
      and s.status in ('active', 'trialing')
      and p.is_active = true
      and (s.current_period_end is null or s.current_period_end > now())
  ) or exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    join public.plans p on p.id = s.plan_id
    where om.user_id = target_id
      and om.status = 'active'
      and s.status in ('active', 'trialing')
      and p.is_active = true
      and (s.current_period_end is null or s.current_period_end > now())
  );

  select * into account from public.ai_credit_accounts where user_id = target_id;
  if found then
    extra_balance := account.extra_balance;
    day_used := case when account.daily_period_started_at < day_start then 0 else account.daily_used end;
    week_used := case when account.weekly_period_started_at < week_start then 0 else account.weekly_used end;
    month_used := case when account.monthly_period_started_at < month_start then 0 else account.monthly_used end;
    if has_active_plan then
      daily_limit := account.daily_limit;
      weekly_limit := account.weekly_limit;
      monthly_limit := account.monthly_limit;
    end if;
  end if;

  return jsonb_build_object(
    'daily_remaining', greatest(daily_limit - day_used, 0),
    'daily_limit', daily_limit,
    'daily_renews_at', day_start + interval '1 day',
    'weekly_remaining', greatest(weekly_limit - week_used, 0),
    'weekly_limit', weekly_limit,
    'weekly_renews_at', week_start + interval '1 week',
    'monthly_remaining', greatest(monthly_limit - month_used, 0),
    'monthly_limit', monthly_limit,
    'monthly_renews_at', month_start + interval '1 month',
    'additional_credits', extra_balance,
    'available_credits', least(
      greatest(daily_limit - day_used, 0),
      greatest(weekly_limit - week_used, 0),
      greatest(monthly_limit - month_used, 0)
    ) + extra_balance,
    'credit_value_brl', settings.credit_value_brl
  );
end;
$$;

revoke all on function public.reserve_ai_usage(uuid, text, text, uuid, numeric, numeric, numeric, boolean) from public, anon, authenticated;
revoke all on function public.get_ai_credit_balance(uuid) from public, anon;

grant execute on function public.reserve_ai_usage(uuid, text, text, uuid, numeric, numeric, numeric, boolean) to service_role;
grant execute on function public.get_ai_credit_balance(uuid) to authenticated, service_role;
