begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('33000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'credits-owner@test.local', '', now(), now(), now()),
  ('33000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'credits-other@test.local', '', now(), now(), now()),
  ('33000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'credits-admin@test.local', '', now(), now(), now())
on conflict (id) do nothing;

update public.profiles
set role = 'admin'
where id = '33000000-0000-0000-0000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (public.get_ai_credit_balance()->>'weekly_remaining')::numeric,
  100::numeric,
  'saldo semanal começa completo'
);
select extensions.is(
  (public.get_ai_credit_balance()->>'monthly_remaining')::numeric,
  400::numeric,
  'saldo mensal começa completo'
);
select extensions.is(
  (public.get_ai_credit_balance()->>'daily_remaining')::numeric,
  25::numeric,
  'saldo diário começa completo'
);
select extensions.throws_ok(
  $$select public.consume_ai_credit()$$,
  '42501', null, 'RPC legado de débito por mensagem não é mais acessível'
);
select extensions.throws_ok(
  $$update public.profiles set ai_credits = 999 where id = '33000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'aluno não adultera o próprio saldo'
);
select extensions.throws_ok(
  $$update public.profiles set role = 'admin' where id = '33000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'aluno não eleva o próprio papel para administrador'
);
select extensions.throws_ok(
  $$select public.get_ai_credit_balance('33000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'aluno não consulta o saldo de outra pessoa'
);

select set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000003', true);
select extensions.is(
  (public.add_ai_credits('33000000-0000-0000-0000-000000000002', 25)->>'additional_credits')::numeric,
  25::numeric,
  'admin adiciona créditos a um usuário específico'
);
select extensions.is(
  (public.get_ai_credit_balance('33000000-0000-0000-0000-000000000002')->>'available_credits')::numeric,
  50::numeric,
  'saldo disponível soma a franquia diária aos créditos extras'
);

select * from extensions.finish();
rollback;
