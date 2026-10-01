-- Corrige assinantes com plano ativo vendo "0 de 0" na franquia de IA.
--
-- `get_ai_credit_balance` lia daily/weekly/monthly_limit de
-- `ai_credit_accounts`, mas essa linha só é criada/atualizada por
-- `reserve_ai_usage`. Assinantes que chegam pelo webhook (Hotmart) nunca têm a
-- linha: o saldo aparece zerado, o chat e as aulas personalizadas bloqueiam
-- antes de reservar, e a reserva — que criaria a conta — nunca acontece.
--
-- A franquia passa a vir do plano ativo (mesma regra de `reserve_ai_usage`:
-- assinatura individual primeiro, depois via organização, maior franquia
-- mensal vence). `ai_credit_accounts` continua sendo a fonte apenas do
-- consumo do período e do saldo extra.

create or replace function public.get_ai_credit_balance(p_user_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
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
  has_active_plan boolean := false;
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

  select p.ai_daily_credits, p.ai_weekly_credits, p.ai_monthly_credits
  into daily_limit, weekly_limit, monthly_limit
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = target_id
    and s.status in ('active', 'trialing')
    and p.is_active = true
    and (s.current_period_end is null or s.current_period_end > now())
  order by p.ai_monthly_credits desc, p.ai_weekly_credits desc
  limit 1;
  has_active_plan := found;

  if not has_active_plan then
    select p.ai_daily_credits, p.ai_weekly_credits, p.ai_monthly_credits
    into daily_limit, weekly_limit, monthly_limit
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    join public.plans p on p.id = s.plan_id
    where om.user_id = target_id
      and om.status = 'active'
      and s.status in ('active', 'trialing')
      and p.is_active = true
      and (s.current_period_end is null or s.current_period_end > now())
    order by p.ai_monthly_credits desc, p.ai_weekly_credits desc
    limit 1;
    has_active_plan := found;
  end if;

  if not has_active_plan then
    daily_limit := 0;
    weekly_limit := 0;
    monthly_limit := 0;
  end if;

  select * into account from public.ai_credit_accounts where user_id = target_id;
  if found then
    extra_balance := account.extra_balance;
    day_used := case when account.daily_period_started_at < day_start then 0 else account.daily_used end;
    week_used := case when account.weekly_period_started_at < week_start then 0 else account.weekly_used end;
    month_used := case when account.monthly_period_started_at < month_start then 0 else account.monthly_used end;
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
$function$;
