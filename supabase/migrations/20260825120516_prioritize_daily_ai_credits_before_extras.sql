-- A franquia recorrente (diária, semanal e mensal) é sempre consumida antes
-- do saldo extra. Quando a franquia disponível termina, o restante da reserva
-- passa a ser debitado dos créditos extras sem vencimento.

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

  resolved_daily := settings.default_daily_credits;
  resolved_weekly := settings.default_weekly_credits;
  resolved_monthly := settings.default_monthly_credits;

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

  if not found then
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
  end if;

  resolved_daily := coalesce(resolved_daily, settings.default_daily_credits);
  resolved_weekly := coalesce(resolved_weekly, settings.default_weekly_credits);
  resolved_monthly := coalesce(resolved_monthly, settings.default_monthly_credits);

  insert into public.ai_credit_accounts (user_id, daily_limit, weekly_limit, monthly_limit)
  values (p_user_id, resolved_daily, resolved_weekly, resolved_monthly)
  on conflict (user_id) do update set
    daily_limit = excluded.daily_limit,
    weekly_limit = excluded.weekly_limit,
    monthly_limit = excluded.monthly_limit,
    updated_at = now();

  select * into account from public.ai_credit_accounts where user_id = p_user_id for update;

  account.daily_used := case when account.daily_period_started_at < day_start then 0 else account.daily_used end;
  account.weekly_used := case when account.weekly_period_started_at < week_start then 0 else account.weekly_used end;
  account.monthly_used := case when account.monthly_period_started_at < month_start then 0 else account.monthly_used end;

  if p_charge_user and p_reservation_credits > 0 then
    recurring_available := least(
      greatest(account.daily_limit - account.daily_used, 0),
      greatest(account.weekly_limit - account.weekly_used, 0),
      greatest(account.monthly_limit - account.monthly_used, 0)
    );
    recurring_reserved := least(p_reservation_credits, recurring_available);
    extra_reserved := p_reservation_credits - recurring_reserved;

    if extra_reserved > account.extra_balance then
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

create or replace function public.settle_ai_usage(
  p_event_id uuid,
  p_credits_charged numeric,
  p_provider_cost_usd numeric,
  p_provider_cost_brl numeric,
  p_protected_cost_brl numeric,
  p_prompt_tokens bigint,
  p_completion_tokens bigint,
  p_reasoning_tokens bigint default 0,
  p_cached_tokens bigint default 0,
  p_generation_id text default null,
  p_pricing_source text default 'provider',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  event public.ai_usage_events%rowtype;
  recurring_charged numeric;
  extra_charged numeric;
  recurring_refund numeric;
  extra_refund numeric;
  total_refund numeric;
  remaining numeric;
begin
  select * into event from public.ai_usage_events where id = p_event_id for update;
  if not found then raise no_data_found using message = 'Evento de IA não encontrado.'; end if;
  if event.status = 'settled' then
    select least(
      greatest(daily_limit - daily_used, 0),
      greatest(weekly_limit - weekly_used, 0),
      greatest(monthly_limit - monthly_used, 0)
    ) + extra_balance
    into remaining
    from public.ai_credit_accounts
    where user_id = event.user_id;
    return jsonb_build_object(
      'credits_charged', event.credits_charged,
      'credits_remaining', coalesce(remaining, 0),
      'refunded_credits', event.reservation_credits - event.credits_charged,
      'idempotent', true
    );
  end if;
  if event.status <> 'reserved' then
    raise check_violation using message = 'Evento de IA não pode ser liquidado.';
  end if;

  p_credits_charged := case when event.charge_user then greatest(0, least(p_credits_charged, event.reservation_credits)) else 0 end;
  recurring_charged := least(p_credits_charged, event.reserved_recurring_credits);
  extra_charged := p_credits_charged - recurring_charged;
  recurring_refund := event.reserved_recurring_credits - recurring_charged;
  extra_refund := event.reserved_extra_credits - extra_charged;
  total_refund := recurring_refund + extra_refund;

  update public.ai_billing_settings
  set
    monthly_reserved_cost_brl = greatest(monthly_reserved_cost_brl - event.estimated_provider_cost_brl, 0),
    monthly_actual_cost_brl = monthly_actual_cost_brl + greatest(p_provider_cost_brl, 0),
    updated_at = now()
  where id = 1;

  update public.ai_credit_accounts
  set
    daily_used = greatest(daily_used - recurring_refund, 0),
    weekly_used = greatest(weekly_used - recurring_refund, 0),
    monthly_used = greatest(monthly_used - recurring_refund, 0),
    extra_balance = extra_balance + extra_refund,
    updated_at = now()
  where user_id = event.user_id;

  update public.ai_usage_events
  set
    status = 'settled', credits_charged = p_credits_charged,
    prompt_tokens = greatest(p_prompt_tokens, 0), completion_tokens = greatest(p_completion_tokens, 0),
    reasoning_tokens = greatest(p_reasoning_tokens, 0), cached_tokens = greatest(p_cached_tokens, 0),
    provider_cost_usd = greatest(p_provider_cost_usd, 0), provider_cost_brl = greatest(p_provider_cost_brl, 0),
    protected_cost_brl = greatest(p_protected_cost_brl, 0),
    nominal_revenue_brl = p_credits_charged * event.credit_value_brl,
    generation_id = p_generation_id, pricing_source = p_pricing_source,
    metadata = coalesce(p_metadata, '{}'::jsonb), settled_at = now()
  where id = p_event_id;

  if total_refund > 0 then
    insert into public.ai_credit_ledger (user_id, usage_event_id, entry_type, amount_credits, note)
    values (event.user_id, event.id, 'refund', total_refund, 'Devolução da diferença entre reserva e custo real');
  end if;

  select least(
    greatest(daily_limit - daily_used, 0),
    greatest(weekly_limit - weekly_used, 0),
    greatest(monthly_limit - monthly_used, 0)
  ) + extra_balance
  into remaining
  from public.ai_credit_accounts
  where user_id = event.user_id;

  return jsonb_build_object(
    'credits_charged', p_credits_charged,
    'credits_remaining', coalesce(remaining, 0),
    'refunded_credits', total_refund
  );
end;
$$;

create or replace function public.cancel_ai_usage(
  p_event_id uuid,
  p_error_code text default null,
  p_provider_cost_usd numeric default 0,
  p_provider_cost_brl numeric default 0,
  p_prompt_tokens bigint default 0,
  p_completion_tokens bigint default 0,
  p_generation_id text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  event public.ai_usage_events%rowtype;
begin
  select * into event from public.ai_usage_events where id = p_event_id for update;
  if not found then raise no_data_found using message = 'Evento de IA não encontrado.'; end if;
  if event.status in ('refunded', 'failed') then
    return jsonb_build_object('refunded_credits', event.reservation_credits, 'idempotent', true);
  end if;
  if event.status <> 'reserved' then
    raise check_violation using message = 'Evento de IA não pode ser cancelado.';
  end if;

  update public.ai_billing_settings
  set
    monthly_reserved_cost_brl = greatest(monthly_reserved_cost_brl - event.estimated_provider_cost_brl, 0),
    monthly_actual_cost_brl = monthly_actual_cost_brl + greatest(p_provider_cost_brl, 0),
    updated_at = now()
  where id = 1;

  update public.ai_credit_accounts
  set
    daily_used = greatest(daily_used - event.reserved_recurring_credits, 0),
    weekly_used = greatest(weekly_used - event.reserved_recurring_credits, 0),
    monthly_used = greatest(monthly_used - event.reserved_recurring_credits, 0),
    extra_balance = extra_balance + event.reserved_extra_credits,
    updated_at = now()
  where user_id = event.user_id;

  update public.ai_usage_events
  set
    status = 'refunded', error_code = p_error_code,
    provider_cost_usd = greatest(p_provider_cost_usd, 0),
    provider_cost_brl = greatest(p_provider_cost_brl, 0),
    prompt_tokens = greatest(p_prompt_tokens, 0),
    completion_tokens = greatest(p_completion_tokens, 0),
    generation_id = p_generation_id,
    settled_at = now()
  where id = p_event_id;

  if event.reservation_credits > 0 then
    insert into public.ai_credit_ledger (user_id, usage_event_id, entry_type, amount_credits, note)
    values (event.user_id, event.id, 'refund', event.reservation_credits, 'Estorno integral de chamada de IA');
  end if;

  return jsonb_build_object('refunded_credits', event.reservation_credits);
end;
$$;

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
  day_used numeric;
  week_used numeric;
  month_used numeric;
begin
  if caller_id is null then raise insufficient_privilege using message = 'Autenticação necessária.'; end if;
  if target_id is distinct from caller_id and not (select public.is_admin()) then
    raise insufficient_privilege using message = 'Você não pode consultar os créditos deste usuário.';
  end if;

  select * into settings from public.ai_billing_settings where id = 1;
  select * into account from public.ai_credit_accounts where user_id = target_id;
  if not found then
    account.daily_limit := settings.default_daily_credits;
    account.weekly_limit := settings.default_weekly_credits;
    account.monthly_limit := settings.default_monthly_credits;
    account.daily_used := 0; account.weekly_used := 0; account.monthly_used := 0; account.extra_balance := 0;
    account.daily_period_started_at := day_start; account.weekly_period_started_at := week_start; account.monthly_period_started_at := month_start;
  end if;

  day_used := case when account.daily_period_started_at < day_start then 0 else account.daily_used end;
  week_used := case when account.weekly_period_started_at < week_start then 0 else account.weekly_used end;
  month_used := case when account.monthly_period_started_at < month_start then 0 else account.monthly_used end;

  return jsonb_build_object(
    'daily_remaining', greatest(account.daily_limit - day_used, 0),
    'daily_limit', account.daily_limit,
    'daily_renews_at', day_start + interval '1 day',
    'weekly_remaining', greatest(account.weekly_limit - week_used, 0),
    'weekly_limit', account.weekly_limit,
    'weekly_renews_at', week_start + interval '1 week',
    'monthly_remaining', greatest(account.monthly_limit - month_used, 0),
    'monthly_limit', account.monthly_limit,
    'monthly_renews_at', month_start + interval '1 month',
    'additional_credits', account.extra_balance,
    'available_credits', least(
      greatest(account.daily_limit - day_used, 0),
      greatest(account.weekly_limit - week_used, 0),
      greatest(account.monthly_limit - month_used, 0)
    ) + account.extra_balance,
    'credit_value_brl', settings.credit_value_brl
  );
end;
$$;

revoke all on function public.reserve_ai_usage(uuid, text, text, uuid, numeric, numeric, numeric, boolean) from public, anon, authenticated;
revoke all on function public.settle_ai_usage(uuid, numeric, numeric, numeric, numeric, bigint, bigint, bigint, bigint, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.cancel_ai_usage(uuid, text, numeric, numeric, bigint, bigint, text) from public, anon, authenticated;
revoke all on function public.get_ai_credit_balance(uuid) from public, anon;

grant execute on function public.reserve_ai_usage(uuid, text, text, uuid, numeric, numeric, numeric, boolean) to service_role;
grant execute on function public.settle_ai_usage(uuid, numeric, numeric, numeric, numeric, bigint, bigint, bigint, bigint, text, text, jsonb) to service_role;
grant execute on function public.cancel_ai_usage(uuid, text, numeric, numeric, bigint, bigint, text) to service_role;
grant execute on function public.get_ai_credit_balance(uuid) to authenticated, service_role;
