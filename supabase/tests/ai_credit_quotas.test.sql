begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

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
  (public.get_ai_credit_balance()->>'weekly_remaining')::integer,
  10,
  'saldo semanal começa completo'
);
select extensions.is(
  (public.get_ai_credit_balance()->>'monthly_remaining')::integer,
  40,
  'saldo mensal começa completo'
);
select extensions.is(public.consume_ai_credit(), 9, 'débito reduz o saldo disponível');
select extensions.is(
  (public.get_ai_credit_balance()->>'monthly_remaining')::integer,
  39,
  'débito também reduz a franquia mensal'
);
select extensions.throws_ok(
  $$update public.profiles set ai_credits = 999 where id = '33000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'aluno não adultera o próprio saldo'
);
select extensions.throws_ok(
  $$select public.get_ai_credit_balance('33000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'aluno não consulta o saldo de outra pessoa'
);

select set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000003', true);
select extensions.is(
  (public.add_ai_credits('33000000-0000-0000-0000-000000000002', 25)->>'additional_credits')::integer,
  25,
  'admin adiciona créditos a um usuário específico'
);
select extensions.is(
  (public.get_ai_credit_balance('33000000-0000-0000-0000-000000000002')->>'available_credits')::integer,
  35,
  'créditos extras somam ao saldo recorrente disponível'
);

select * from extensions.finish();
rollback;
