begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('52000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vars-owner@test.local', '', now(), now(), now()),
  ('52000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vars-other@test.local', '', now(), now(), now()),
  ('52000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vars-admin@test.local', '', now(), now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'admin'
where id = '52000000-0000-0000-0000-000000000003';

insert into public.onboarding_variable_definitions
  (variable_key, question_id, question_text, question_type, active, published_version)
values ('cargo_pretendido', 'q_cargo', 'Qual cargo você pretende ocupar?', 'single', true, 2);

insert into public.student_onboarding_answers
  (user_id, question_id, question_text, variable_key, question_type, answer_values, answer, questionnaire_version)
values
  ('52000000-0000-0000-0000-000000000001', 'q_cargo', 'Qual cargo?', 'cargo_pretendido', 'single', '["Liderança"]', 'Liderança', 2),
  ('52000000-0000-0000-0000-000000000002', 'q_cargo', 'Qual cargo?', 'cargo_pretendido', 'single', '["Produto"]', 'Produto', 2);

set local role anon;
select extensions.throws_ok($$select * from public.student_onboarding_answers$$, '42501', null, 'anon não acessa respostas do onboarding');
select extensions.throws_ok($$select * from public.onboarding_variable_definitions$$, '42501', null, 'anon não acessa o catálogo administrativo');

set local role authenticated;
select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000001', true);
select extensions.results_eq(
  $$select variable_key from public.student_onboarding_answers order by variable_key$$,
  array['cargo_pretendido'::text],
  'aluno lê somente as próprias variáveis'
);
select extensions.is_empty($$select variable_key from public.onboarding_variable_definitions$$, 'aluno não enxerga o catálogo administrativo');
select extensions.throws_ok(
  $$insert into public.student_onboarding_answers
      (user_id, question_id, question_text, variable_key, question_type, answer_values, answer, questionnaire_version)
    values
      ('52000000-0000-0000-0000-000000000002', 'q_nivel', 'Nível?', 'nivel_atual', 'single', '["Sênior"]', 'Sênior', 2)$$,
  '42501', null, 'aluno não cria variável para outra pessoa'
);

select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000003', true);
select extensions.throws_ok(
  $$insert into public.onboarding_variable_definitions
      (variable_key, question_id, question_text, question_type, active, published_version)
    values ('outra_chave', 'q_outra', 'Outra?', 'open', true, 2)$$,
  '42501', null, 'admin não grava definições fora da publicação transacional'
);

select extensions.results_eq(
  $$select variable_key from public.onboarding_variable_definitions$$,
  array['cargo_pretendido'::text],
  'admin consulta o catálogo de variáveis'
);
select extensions.is((select count(*) from public.student_onboarding_answers), 2::bigint, 'admin consulta respostas de todos os alunos');

reset role;
select extensions.throws_ok(
  $$insert into public.student_onboarding_answers
      (user_id, question_id, question_text, variable_key, question_type, answer_values, answer, questionnaire_version)
    values
      ('52000000-0000-0000-0000-000000000001', 'q_invalida', 'Inválida?', 'chave_invalida', 'single', '{}', 'x', 2)$$,
  '23514', null, 'banco exige um array JSON nos valores brutos'
);

select * from extensions.finish();
rollback;
