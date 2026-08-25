begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select extensions.has_table('public', 'page_builder_drafts', 'tabela de rascunhos existe');
select extensions.ok(not has_table_privilege('anon', 'public.page_builder_drafts', 'select'), 'anon não recebe SELECT');
select extensions.ok(not has_table_privilege('anon', 'public.page_builder_drafts', 'insert'), 'anon não recebe INSERT');
select extensions.ok(has_table_privilege('authenticated', 'public.page_builder_drafts', 'select'), 'authenticated recebe SELECT sujeito a RLS');
select extensions.ok(has_table_privilege('authenticated', 'public.page_builder_drafts', 'insert'), 'authenticated recebe INSERT sujeito a RLS');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('51000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'page-admin@test.local', '', now(), now(), now()),
  ('51000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'page-student@test.local', '', now(), now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'admin' where id = '51000000-0000-0000-0000-000000000001';
update public.profiles set role = 'student' where id = '51000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);
select extensions.is((select count(*) from public.page_builder_drafts), 0::bigint, 'aluno não lê rascunhos');
select extensions.throws_ok(
  $$insert into public.page_builder_drafts(page_key, document, updated_by) values ('public-home', '{}'::jsonb, '51000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'aluno não cria rascunho'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
insert into public.page_builder_drafts(page_key, document, updated_by)
values ('public-home', '{"version":1,"pageKey":"public-home","sections":[]}'::jsonb, '51000000-0000-0000-0000-000000000001');
select extensions.is((select count(*) from public.page_builder_drafts), 1::bigint, 'admin cria e lê rascunho');

select * from extensions.finish();
rollback;
