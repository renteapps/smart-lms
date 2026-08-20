begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  '40000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'certificate-owner@test.local',
  '',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.courses (id, title, slug, category, enable_certificates)
values
  ('41000000-0000-0000-0000-000000000001', 'Curso certificável', 'curso-certificavel-test', 'Teste', true),
  ('41000000-0000-0000-0000-000000000002', 'Curso sem certificado', 'curso-sem-certificado-test', 'Teste', false);

insert into public.modules (id, course_id, title, order_index)
values
  ('42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'Módulo certificável', 1),
  ('42000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000002', 'Módulo sem certificado', 1);

insert into public.lessons (id, module_id, title, order_index, is_published)
values
  ('43000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'Aula um', 1, true),
  ('43000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000001', 'Aula dois', 2, true),
  ('43000000-0000-0000-0000-000000000003', '42000000-0000-0000-0000-000000000002', 'Aula sem certificado', 1, true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);

insert into public.lesson_progress (user_id, lesson_id, is_completed)
values ('40000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (select count(*) from public.certificates where course_id = '41000000-0000-0000-0000-000000000001'),
  0::bigint,
  'não emite antes da última aula publicada'
);

insert into public.lesson_progress (user_id, lesson_id, is_completed)
values ('40000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000002', true);

select extensions.is(
  (select count(*) from public.certificates where course_id = '41000000-0000-0000-0000-000000000001'),
  1::bigint,
  'emite ao concluir a última aula publicada'
);

update public.lesson_progress
set is_completed = true
where user_id = '40000000-0000-0000-0000-000000000001'
  and lesson_id = '43000000-0000-0000-0000-000000000002';

select extensions.is(
  (select count(*) from public.certificates where course_id = '41000000-0000-0000-0000-000000000001'),
  1::bigint,
  'repetição concorrente é idempotente pela chave única'
);

insert into public.lesson_progress (user_id, lesson_id, is_completed)
values ('40000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000003', true);

select extensions.is(
  (select count(*) from public.certificates where course_id = '41000000-0000-0000-0000-000000000002'),
  0::bigint,
  'curso sem certificação não emite registro'
);

select * from extensions.finish();
rollback;
