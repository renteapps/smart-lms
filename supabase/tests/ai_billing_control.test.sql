begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('44000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'billing-user@test.local', '', now(), now(), now()),
  ('44000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'billing-admin@test.local', '', now(), now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'admin' where id = '44000000-0000-0000-0000-000000000002';
update public.ai_billing_settings set monthly_budget_brl = 500, monthly_actual_cost_brl = 0, monthly_reserved_cost_brl = 0 where id = 1;
insert into public.ai_credit_accounts (user_id) values ('44000000-0000-0000-0000-000000000001')
on conflict (user_id) do update set daily_used = 0, weekly_used = 0, monthly_used = 0, extra_balance = 0;

set local role authenticated;
select set_config('request.jwt.claim.sub', '44000000-0000-0000-0000-000000000001', true);
select extensions.throws_ok(
  $$select public.reserve_ai_usage('44000000-0000-0000-0000-000000000001', 'agent_chat', 'google/gemini-2.0-flash-001', '44000000-0000-0000-0000-000000000010', 1, 5, 5, true)$$,
  '42501', null, 'usuário não executa RPC de reserva'
);
select extensions.throws_ok(
  $$select * from public.ai_usage_events$$,
  '42501', null, 'usuário não consulta eventos de terceiros'
);
select extensions.throws_ok(
  $$update public.ai_credit_accounts set extra_balance = 999 where user_id = '44000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'usuário não altera a própria conta de créditos'
);

reset role;
set local role service_role;

select extensions.ok(
  (public.reserve_ai_usage('44000000-0000-0000-0000-000000000001', 'agent_chat', 'google/gemini-2.0-flash-001', '44000000-0000-0000-0000-000000000011', 1, 5, 5, true)->>'event_id') is not null,
  'service role cria reserva atômica'
);
select public.reserve_ai_usage('44000000-0000-0000-0000-000000000001', 'agent_chat', 'google/gemini-2.0-flash-001', '44000000-0000-0000-0000-000000000011', 1, 5, 5, true);
select extensions.is((select count(*) from public.ai_usage_events where request_key = '44000000-0000-0000-0000-000000000011'), 1::bigint, 'reserva repetida reutiliza o mesmo evento');
select extensions.is((select daily_used from public.ai_credit_accounts where user_id = '44000000-0000-0000-0000-000000000001'), 5::bigint, 'reserva reduz a franquia imediatamente');
select extensions.is((select amount_credits from public.ai_credit_ledger where usage_event_id = (select id from public.ai_usage_events where request_key = '44000000-0000-0000-0000-000000000011') and entry_type = 'reservation'), (-5)::bigint, 'ledger registra a reserva');

select public.settle_ai_usage(
  (select id from public.ai_usage_events where request_key = '44000000-0000-0000-0000-000000000011'),
  3, 0.10, 0.50, 0.55, 1000, 200, 20, 50, 'generation-test', 'provider', '{"test":true}'::jsonb
);
select extensions.is((select credits_charged from public.ai_usage_events where request_key = '44000000-0000-0000-0000-000000000011'), 3::bigint, 'liquidação grava custo real');
select extensions.is((select daily_used from public.ai_credit_accounts where user_id = '44000000-0000-0000-0000-000000000001'), 3::bigint, 'liquidação devolve a diferença reservada');
select extensions.is((select amount_credits from public.ai_credit_ledger where usage_event_id = (select id from public.ai_usage_events where request_key = '44000000-0000-0000-0000-000000000011') and entry_type = 'refund'), 2::bigint, 'ledger registra estorno parcial');
select extensions.is((public.settle_ai_usage((select id from public.ai_usage_events where request_key = '44000000-0000-0000-0000-000000000011'), 3, 0.10, 0.50, 0.55, 1000, 200)->>'idempotent')::boolean, true, 'liquidação repetida é idempotente');

select public.reserve_ai_usage('44000000-0000-0000-0000-000000000001', 'agent_chat', 'google/gemini-2.0-flash-001', '44000000-0000-0000-0000-000000000012', 1, 4, 5, true);
select extensions.is((public.cancel_ai_usage((select id from public.ai_usage_events where request_key = '44000000-0000-0000-0000-000000000012'), 'provider_error')->>'refunded_credits')::bigint, 4::bigint, 'falha estorna toda a reserva');
select extensions.is((public.cancel_ai_usage((select id from public.ai_usage_events where request_key = '44000000-0000-0000-0000-000000000012'), 'provider_error')->>'idempotent')::boolean, true, 'estorno repetido é idempotente');
select extensions.is((select daily_used from public.ai_credit_accounts where user_id = '44000000-0000-0000-0000-000000000001'), 3::bigint, 'estorno integral restaura a franquia');

select public.reserve_ai_usage('44000000-0000-0000-0000-000000000002', 'admin_sandbox', 'google/gemini-2.0-flash-001', '44000000-0000-0000-0000-000000000013', 1, 0, 5, false);
select extensions.is((select reservation_credits from public.ai_usage_events where request_key = '44000000-0000-0000-0000-000000000013'), 0::bigint, 'sandbox não debita o administrador');
select extensions.is((select monthly_reserved_cost_brl from public.ai_billing_settings where id = 1), 1::numeric, 'sandbox reserva orçamento global');
select public.cancel_ai_usage((select id from public.ai_usage_events where request_key = '44000000-0000-0000-0000-000000000013'), 'test_cleanup');

insert into public.organizations (id, name, slug) values ('44000000-0000-0000-0000-000000000020', 'Empresa Billing', 'empresa-billing');
insert into public.organization_members (organization_id, user_id, status) values ('44000000-0000-0000-0000-000000000020', '44000000-0000-0000-0000-000000000001', 'active');
insert into public.plans (id, name, ai_daily_credits, ai_weekly_credits, ai_monthly_credits)
values
  ('44000000-0000-0000-0000-000000000021', 'Plano individual', 30, 120, 450),
  ('44000000-0000-0000-0000-000000000022', 'Plano empresa', 50, 200, 800);
insert into public.subscriptions (user_id, plan_id, status) values ('44000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000021', 'active');
insert into public.subscriptions (organization_id, plan_id, status) values ('44000000-0000-0000-0000-000000000020', '44000000-0000-0000-0000-000000000022', 'active');
update public.ai_credit_accounts set daily_used = 25, daily_period_started_at = now() - interval '2 days' where user_id = '44000000-0000-0000-0000-000000000001';
select public.reserve_ai_usage('44000000-0000-0000-0000-000000000001', 'agent_chat', 'google/gemini-2.0-flash-001', '44000000-0000-0000-0000-000000000015', 0.01, 1, 5, true);
select extensions.is((select daily_limit from public.ai_credit_accounts where user_id = '44000000-0000-0000-0000-000000000001'), 30::bigint, 'assinatura individual prevalece sobre a organização');
select extensions.is((select daily_used from public.ai_credit_accounts where user_id = '44000000-0000-0000-0000-000000000001'), 1::bigint, 'período diário vencido renova antes da reserva');
select public.cancel_ai_usage((select id from public.ai_usage_events where request_key = '44000000-0000-0000-0000-000000000015'), 'test_cleanup');

select extensions.throws_ok(
  $$update public.ai_credit_ledger set note = 'alterado' where usage_event_id = (select id from public.ai_usage_events where request_key = '44000000-0000-0000-0000-000000000011')$$,
  '42501', null, 'ledger não permite alteração'
);

update public.ai_billing_settings set monthly_budget_brl = 1, monthly_actual_cost_brl = 1, monthly_reserved_cost_brl = 0 where id = 1;
select extensions.throws_ok(
  $$select public.reserve_ai_usage('44000000-0000-0000-0000-000000000001', 'agent_chat', 'google/gemini-2.0-flash-001', '44000000-0000-0000-0000-000000000014', 0.01, 1, 5, true)$$,
  '42501', 'AI_GLOBAL_BUDGET_EXCEEDED', 'orçamento global bloqueia novas reservas'
);

select * from extensions.finish();
rollback;
