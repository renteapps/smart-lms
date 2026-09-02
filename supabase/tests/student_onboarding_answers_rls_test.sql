begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('51000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'onboarding-owner@test.local', '', now(), now(), now()),
  ('51000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'onboarding-other@test.local', '', now(), now(), now()),
  ('51000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'onboarding-admin@test.local', '', now(), now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'admin'
where id = '51000000-0000-0000-0000-000000000003';

insert into public.student_onboarding_answers (user_id, question_id, question_text, answer, questionnaire_version)
values
  ('51000000-0000-0000-0000-000000000001', 'q_objetivo', 'Qual é seu objetivo?', 'Quero liderar com mais segurança.', 1),
  ('51000000-0000-0000-0000-000000000002', 'q_objetivo', 'Qual é seu objetivo?', 'Quero melhorar meu time.', 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (select count(*) from public.student_onboarding_answers),
  1::bigint,
  'aluno vê apenas a própria resposta aberta'
);
select extensions.is(
  (select answer from public.student_onboarding_answers where user_id = '51000000-0000-0000-0000-000000000001'),
  'Quero liderar com mais segurança.',
  'aluno lê o texto que declarou'
);
select extensions.throws_ok(
  $$insert into public.student_onboarding_answers (user_id, question_id, question_text, answer, questionnaire_version) values ('51000000-0000-0000-0000-000000000002', 'q_nova', 'Outra pergunta', 'Não deveria entrar.', 1)$$,
  '42501', null, 'aluno não cria resposta para outra pessoa'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000003', true);
select extensions.is(
  (select count(*) from public.student_onboarding_answers),
  2::bigint,
  'admin consegue consultar as respostas para suporte e IA'
);

select extensions.throws_ok(
  $$insert into public.student_onboarding_answers (user_id, question_id, question_text, answer, questionnaire_version) values ('51000000-0000-0000-0000-000000000003', 'q_longa', 'Pergunta', repeat('x', 2001), 1)$$,
  '23514', null, 'banco limita respostas abertas a 2000 caracteres'
);

select * from extensions.finish();
rollback;
