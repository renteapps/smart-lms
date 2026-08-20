-- Franquias recorrentes de IA. O campo legado ai_credits passa a representar
-- apenas créditos extras, que não expiram e podem ser concedidos por admins.
alter table public.profiles
  alter column ai_credits set default 0;

update public.profiles
set ai_credits = 0
where ai_credits is null;

alter table public.profiles
  alter column ai_credits set not null,
  add column if not exists ai_weekly_credit_limit integer not null default 10,
  add column if not exists ai_monthly_credit_limit integer not null default 40,
  add column if not exists ai_weekly_credits_used integer not null default 0,
  add column if not exists ai_monthly_credits_used integer not null default 0,
  add column if not exists ai_weekly_period_started_at timestamptz not null default (
    date_trunc('week', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza'
  ),
  add column if not exists ai_monthly_period_started_at timestamptz not null default (
    date_trunc('month', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza'
  );

alter table public.profiles
  add constraint profiles_ai_credits_nonnegative check (ai_credits >= 0),
  add constraint profiles_ai_weekly_credit_limit_positive check (ai_weekly_credit_limit > 0),
  add constraint profiles_ai_monthly_credit_limit_positive check (ai_monthly_credit_limit > 0),
  add constraint profiles_ai_weekly_credits_used_nonnegative check (ai_weekly_credits_used >= 0),
  add constraint profiles_ai_monthly_credits_used_nonnegative check (ai_monthly_credits_used >= 0);

-- Bloqueia adulteração direta do saldo pelo próprio aluno. As funções abaixo
-- rodam como o proprietário da função e os administradores continuam podendo
-- gerenciar os campos de crédito.
create or replace function public.protect_ai_credit_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
    old.ai_credits is distinct from new.ai_credits
    or old.ai_weekly_credit_limit is distinct from new.ai_weekly_credit_limit
    or old.ai_monthly_credit_limit is distinct from new.ai_monthly_credit_limit
    or old.ai_weekly_credits_used is distinct from new.ai_weekly_credits_used
    or old.ai_monthly_credits_used is distinct from new.ai_monthly_credits_used
    or old.ai_weekly_period_started_at is distinct from new.ai_weekly_period_started_at
    or old.ai_monthly_period_started_at is distinct from new.ai_monthly_period_started_at
  )
  and current_user not in ('postgres', 'supabase_admin', 'service_role')
  and not (select public.is_admin()) then
    raise insufficient_privilege using message = 'Somente administradores podem alterar créditos de IA.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_ai_credit_columns_on_profiles on public.profiles;
create trigger protect_ai_credit_columns_on_profiles
  before update on public.profiles
  for each row execute function public.protect_ai_credit_columns();

revoke all on function public.protect_ai_credit_columns() from public, anon, authenticated;

-- Retorna o saldo do próprio usuário ou, para administradores, de um usuário
-- específico. A leitura também materializa renovações vencidas.
create or replace function public.get_ai_credit_balance(p_user_id uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_id uuid := coalesce(p_user_id, caller_id);
  current_week_start timestamptz :=
    date_trunc('week', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza';
  current_month_start timestamptz :=
    date_trunc('month', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza';
  balance record;
begin
  if caller_id is null then
    raise insufficient_privilege using message = 'Autenticação necessária para consultar créditos de IA.';
  end if;

  if target_id is distinct from caller_id and not (select public.is_admin()) then
    raise insufficient_privilege using message = 'Você não pode consultar os créditos deste usuário.';
  end if;

  update public.profiles
  set
    ai_weekly_credits_used = case
      when ai_weekly_period_started_at < current_week_start then 0
      else ai_weekly_credits_used
    end,
    ai_weekly_period_started_at = greatest(ai_weekly_period_started_at, current_week_start),
    ai_monthly_credits_used = case
      when ai_monthly_period_started_at < current_month_start then 0
      else ai_monthly_credits_used
    end,
    ai_monthly_period_started_at = greatest(ai_monthly_period_started_at, current_month_start)
  where id = target_id
  returning
    ai_credits,
    ai_weekly_credit_limit,
    ai_monthly_credit_limit,
    ai_weekly_credits_used,
    ai_monthly_credits_used,
    ai_weekly_period_started_at,
    ai_monthly_period_started_at
  into balance;

  if not found then
    raise no_data_found using message = 'Perfil não encontrado.';
  end if;

  return jsonb_build_object(
    'weekly_remaining', greatest(balance.ai_weekly_credit_limit - balance.ai_weekly_credits_used, 0),
    'weekly_limit', balance.ai_weekly_credit_limit,
    'weekly_renews_at', balance.ai_weekly_period_started_at + interval '1 week',
    'monthly_remaining', greatest(balance.ai_monthly_credit_limit - balance.ai_monthly_credits_used, 0),
    'monthly_limit', balance.ai_monthly_credit_limit,
    'monthly_renews_at', balance.ai_monthly_period_started_at + interval '1 month',
    'additional_credits', balance.ai_credits,
    'available_credits',
      least(
        greatest(balance.ai_weekly_credit_limit - balance.ai_weekly_credits_used, 0),
        greatest(balance.ai_monthly_credit_limit - balance.ai_monthly_credits_used, 0)
      ) + balance.ai_credits
  );
end;
$$;

revoke all on function public.get_ai_credit_balance(uuid) from public, anon;
grant execute on function public.get_ai_credit_balance(uuid) to authenticated, service_role;

-- Débito atômico com renovação automática. A franquia recorrente é consumida
-- primeiro; créditos extras só são usados quando um dos limites se esgota.
create or replace function public.consume_ai_credit()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  current_week_start timestamptz :=
    date_trunc('week', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza';
  current_month_start timestamptz :=
    date_trunc('month', timezone('America/Fortaleza', now())) at time zone 'America/Fortaleza';
  balance record;
begin
  if caller_id is null then
    raise insufficient_privilege using message = 'Autenticação necessária para consumir créditos de IA.';
  end if;

  select
    ai_credits,
    ai_weekly_credit_limit,
    ai_monthly_credit_limit,
    case
      when ai_weekly_period_started_at < current_week_start then 0
      else ai_weekly_credits_used
    end as weekly_used,
    case
      when ai_monthly_period_started_at < current_month_start then 0
      else ai_monthly_credits_used
    end as monthly_used
  from public.profiles
  where id = caller_id
  for update
  into balance;

  if not found then
    return -1;
  end if;

  update public.profiles
  set
    ai_weekly_credits_used = balance.weekly_used,
    ai_weekly_period_started_at = greatest(ai_weekly_period_started_at, current_week_start),
    ai_monthly_credits_used = balance.monthly_used,
    ai_monthly_period_started_at = greatest(ai_monthly_period_started_at, current_month_start)
  where id = caller_id;

  if balance.weekly_used < balance.ai_weekly_credit_limit
    and balance.monthly_used < balance.ai_monthly_credit_limit then
    balance.weekly_used := balance.weekly_used + 1;
    balance.monthly_used := balance.monthly_used + 1;

    update public.profiles
    set
      ai_weekly_credits_used = balance.weekly_used,
      ai_monthly_credits_used = balance.monthly_used
    where id = caller_id;
  elsif balance.ai_credits > 0 then
    balance.ai_credits := balance.ai_credits - 1;

    update public.profiles
    set ai_credits = balance.ai_credits
    where id = caller_id;
  else
    return -1;
  end if;

  return least(
    greatest(balance.ai_weekly_credit_limit - balance.weekly_used, 0),
    greatest(balance.ai_monthly_credit_limit - balance.monthly_used, 0)
  ) + balance.ai_credits;
end;
$$;

revoke all on function public.consume_ai_credit() from public, anon;
grant execute on function public.consume_ai_credit() to authenticated, service_role;

-- Concessão manual de saldo extra, restrita a administradores e auditada.
create or replace function public.add_ai_credits(p_user_id uuid, p_amount integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not (select public.is_admin()) then
    raise insufficient_privilege using message = 'Somente administradores podem adicionar créditos de IA.';
  end if;

  if p_amount is null or p_amount < 1 or p_amount > 10000 then
    raise check_violation using message = 'A quantidade deve estar entre 1 e 10.000 créditos.';
  end if;

  update public.profiles
  set ai_credits = ai_credits + p_amount
  where id = p_user_id;

  if not found then
    raise no_data_found using message = 'Perfil não encontrado.';
  end if;

  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (
    caller_id,
    'add_ai_credits',
    'profile',
    p_user_id::text,
    jsonb_build_object('amount', p_amount)
  );

  return public.get_ai_credit_balance(p_user_id);
end;
$$;

revoke all on function public.add_ai_credits(uuid, integer) from public, anon;
grant execute on function public.add_ai_credits(uuid, integer) to authenticated, service_role;
