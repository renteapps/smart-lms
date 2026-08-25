begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

select extensions.ok(public.subscription_grants_access('active', null), 'active sem prazo concede acesso');
select extensions.ok(public.subscription_grants_access('trialing', now() + interval '1 day'), 'trial vigente concede acesso');
select extensions.ok(public.subscription_grants_access('past_due', now() + interval '1 day'), 'past_due preserva período pago futuro');
select extensions.ok(public.subscription_grants_access('canceled', now() + interval '1 day'), 'cancelada preserva acesso até o corte');
select extensions.ok(not public.subscription_grants_access('canceled', null), 'cancelada sem corte não fica vitalícia');
select extensions.ok(not public.subscription_grants_access('suspended', now() - interval '1 second'), 'suspensa após corte bloqueia');
select extensions.ok(not public.subscription_grants_access('pending', now() + interval '1 day'), 'pendente nunca concede acesso');

select extensions.ok(not has_function_privilege('anon', 'public.claim_gateway_webhook_event(text,text,text,jsonb)', 'EXECUTE'), 'anon não executa claim');
select extensions.ok(not has_function_privilege('authenticated', 'public.claim_gateway_webhook_event(text,text,text,jsonb)', 'EXECUTE'), 'authenticated não executa claim');
select extensions.ok(not has_function_privilege('authenticated', 'public.sync_gateway_subscription(text,text,uuid,uuid,uuid,text,text,timestamptz,numeric,timestamptz,boolean,boolean)', 'EXECUTE'), 'authenticated não sincroniza contratos');
select extensions.ok(has_function_privilege('service_role', 'public.claim_gateway_webhook_event(text,text,text,jsonb)', 'EXECUTE'), 'service role executa claim');
select extensions.ok(has_function_privilege('service_role', 'public.sync_gateway_subscription(text,text,uuid,uuid,uuid,text,text,timestamptz,numeric,timestamptz,boolean,boolean)', 'EXECUTE'), 'service role sincroniza contratos');

select extensions.ok(to_regclass('public.gateway_webhook_events_dedup_key') is not null, 'índice de dedupe existe');
select extensions.ok(to_regclass('public.subscriptions_gateway_ref_key') is not null, 'índice de contrato existe');

set local role service_role;
select extensions.is(
  public.claim_gateway_webhook_event('eduzz', 'evt-pgtap', 'myeduzz.contract_updated', '{"authenticated":true}'::jsonb)->>'state',
  'claimed', 'primeiro request reivindica o evento'
);
select extensions.is(
  public.claim_gateway_webhook_event('eduzz', 'evt-pgtap', 'myeduzz.contract_updated', '{"authenticated":true}'::jsonb)->>'state',
  'busy', 'request concorrente observa o lease ativo'
);
update public.gateway_webhook_events set status = 'processed' where gateway = 'eduzz' and event_id = 'evt-pgtap';
select extensions.is(
  public.claim_gateway_webhook_event('eduzz', 'evt-pgtap', 'myeduzz.contract_updated', '{"authenticated":true}'::jsonb)->>'state',
  'duplicate', 'evento concluído é duplicata'
);
update public.gateway_webhook_events set status = 'processing', processing_started_at = now() - interval '6 minutes' where gateway = 'eduzz' and event_id = 'evt-pgtap';
select extensions.is(
  public.claim_gateway_webhook_event('eduzz', 'evt-pgtap', 'myeduzz.contract_updated', '{"authenticated":true}'::jsonb)->>'state',
  'claimed', 'lease abandonado pode ser retomado'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('46000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'eduzz-sync@test.local', '', now(), now(), now())
on conflict (id) do nothing;
insert into public.plans (id, name) values ('46000000-0000-0000-0000-000000000002', 'Plano Eduzz pgTAP');

select public.sync_gateway_subscription(
  'eduzz', 'contract-pgtap', '46000000-0000-0000-0000-000000000001',
  '46000000-0000-0000-0000-000000000002', null, 'active', 'upToDate',
  now() + interval '30 days', 197, '2026-08-24T12:00:00Z', false, false
);
select extensions.is(
  (select status from public.subscriptions where gateway = 'eduzz' and gateway_subscription_id = 'contract-pgtap'),
  'active', 'sincronização cria assinatura pelo contrato'
);
select extensions.is(
  public.sync_gateway_subscription(
    'eduzz', 'contract-pgtap', null, null, null, 'canceled', 'canceled', now(), null,
    '2026-08-23T12:00:00Z', true, false
  )->>'stale',
  'true', 'fallback fora de ordem é descartado'
);
select extensions.is(
  public.sync_gateway_subscription(
    'eduzz', 'contract-pgtap', null, null, null, 'canceled', 'canceled', now(), null,
    '2026-08-23T12:00:00Z', true, true
  )->>'applied',
  'true', 'snapshot autoritativo da API prevalece mesmo com timestamp anterior'
);
select extensions.is(
  (select status from public.subscriptions where gateway = 'eduzz' and gateway_subscription_id = 'contract-pgtap'),
  'canceled', 'sincronização posterior encontra a assinatura pelo contrato'
);

reset role;
set local role authenticated;
select extensions.throws_ok(
  $$select * from public.gateway_webhook_events$$,
  '42501', null, 'papel autenticado não lê payload bruto de webhook'
);

select * from extensions.finish();
rollback;
