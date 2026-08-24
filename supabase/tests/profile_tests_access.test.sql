begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

-- Três visitantes: dono do curso, assinante do plano e um aluno comum.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aluno-curso@test.local', '', now(), now(), now()),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aluno-plano@test.local', '', now(), now(), now()),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aluno-comum@test.local', '', now(), now(), now())
on conflict (id) do nothing;

-- O trigger de novo usuário cria os profiles; garante que nenhum é admin.
update public.profiles set role = 'student'
where id in (
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000003'
);

insert into public.courses (id, title, slug, category)
values ('41000000-0000-0000-0000-000000000001', 'Curso Restrito', 'curso-restrito-teste', 'Teste');

-- `features` vazio em courseAccessType='specific': o plano não libera curso
-- nenhum. Sem isso `plan_allows_course()` trataria o plano como "libera tudo" e
-- o assinante passaria também no teste restrito por curso.
insert into public.plans (id, name, features)
values (
  '42000000-0000-0000-0000-000000000001',
  'Plano Restrito',
  '{"courseAccessType":"specific","specificCourses":[]}'::jsonb
);

insert into public.enrollments (user_id, course_id, status)
values ('40000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'active');

insert into public.subscriptions (user_id, plan_id, status, current_period_end)
values ('40000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000001', 'active', now() + interval '30 days');

insert into public.profile_tests (id, slug, title, status, access_type, required_course_ids, required_plan_ids, questions)
values
  ('43000000-0000-0000-0000-000000000001', '90000001', 'Livre sem conta', 'published', 'public', '{}', '{}', '[{"id":"q1"}]'::jsonb),
  ('43000000-0000-0000-0000-000000000002', '90000002', 'Somente logados', 'published', 'logged_in', '{}', '{}', '[{"id":"q1"}]'::jsonb),
  ('43000000-0000-0000-0000-000000000003', '90000003', 'Somente donos do curso', 'published', 'course_owners', '{41000000-0000-0000-0000-000000000001}', '{}', '[{"id":"q1"}]'::jsonb),
  ('43000000-0000-0000-0000-000000000004', '90000004', 'Somente donos do plano', 'published', 'plan_owners', '{}', '{42000000-0000-0000-0000-000000000001}', '[{"id":"q1"}]'::jsonb),
  ('43000000-0000-0000-0000-000000000005', '90000005', 'Rascunho', 'draft', 'public', '{}', '{}', '[{"id":"q1"}]'::jsonb);

-- O slug é gerado pelo banco quando o INSERT não informa um.
insert into public.profile_tests (id, title, status) values ('43000000-0000-0000-0000-000000000006', 'Sem slug', 'draft');
select extensions.matches(
  (select slug from public.profile_tests where id = '43000000-0000-0000-0000-000000000006'),
  '^[0-9]{8}$',
  'insert sem slug recebe número de 8 dígitos'
);

select extensions.throws_ok(
  $$update public.profile_tests set slug = 'meu-teste' where id = '43000000-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'slug com letras é rejeitado pelo CHECK'
);

select extensions.throws_ok(
  $$update public.profile_tests set required_plan_ids = '{42000000-0000-0000-0000-000000000001}' where id = '43000000-0000-0000-0000-000000000003'$$,
  '23514',
  null,
  'lista de plano não é aceita em teste restrito por curso'
);

-- -----------------------------------------------------------------------------
-- Visitante sem conta
-- -----------------------------------------------------------------------------
set local role anon;
select extensions.is(
  (select count(*) from public.profile_tests),
  1::bigint,
  'visitante enxerga apenas o teste livre'
);
select extensions.is(
  (select has_access from public.profile_test_by_slug('90000001')),
  true,
  'visitante responde o teste livre'
);
select extensions.is(
  (select jsonb_array_length(questions) from public.profile_test_by_slug('90000002')),
  0,
  'visitante recebe o cabeçalho mas não as perguntas do teste restrito'
);
select extensions.is(
  (select count(*) from public.profile_test_by_slug('90000005')),
  0::bigint,
  'rascunho não aparece por link'
);

-- -----------------------------------------------------------------------------
-- Aluno comum: só livre e logado
-- -----------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);
select extensions.is(
  (select count(*) from public.profile_tests),
  2::bigint,
  'aluno sem curso nem plano enxerga livre e logado'
);
select extensions.is(
  (select has_access from public.profile_test_by_slug('90000003')),
  false,
  'aluno sem o curso não responde o teste do curso'
);

-- -----------------------------------------------------------------------------
-- Dono do curso
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
select extensions.is(
  (select has_access from public.profile_test_by_slug('90000003')),
  true,
  'matrícula ativa libera o teste do curso'
);
select extensions.is(
  (select has_access from public.profile_test_by_slug('90000004')),
  false,
  'curso não vale como plano'
);

-- -----------------------------------------------------------------------------
-- Assinante do plano
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
select extensions.is(
  (select has_access from public.profile_test_by_slug('90000004')),
  true,
  'assinatura ativa libera o teste do plano'
);
select extensions.is(
  (select has_access from public.profile_test_by_slug('90000003')),
  false,
  'plano sem o curso não vale como curso'
);

-- -----------------------------------------------------------------------------
-- Servidor administrativo
-- -----------------------------------------------------------------------------
reset role;
set local role service_role;
select extensions.is(
  (select count(*) from public.profile_tests),
  6::bigint,
  'servidor administrativo enxerga todos os testes'
);

select * from extensions.finish();
rollback;
