begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-assistant@test.local', '', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other-assistant@test.local', '', now(), now(), now())
on conflict (id) do nothing;

insert into public.platform_assistant_conversations (id, user_id, scope, context_key, title)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'platform', 'platform', 'Conversa do proprietário'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'platform', 'platform', 'Conversa de outro usuário');

insert into public.platform_assistant_messages (conversation_id, author, content)
values
  ('20000000-0000-0000-0000-000000000001', 'user', 'Mensagem do proprietário'),
  ('20000000-0000-0000-0000-000000000002', 'user', 'Mensagem de outro usuário');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select extensions.is((select count(*) from public.platform_assistant_conversations), 1::bigint, 'proprietário lê somente sua conversa');
select extensions.is((select count(*) from public.platform_assistant_messages), 1::bigint, 'proprietário lê somente suas mensagens');
select extensions.throws_ok(
  $$insert into public.platform_assistant_conversations (user_id, scope, context_key) values ('10000000-0000-0000-0000-000000000001', 'platform', 'outro')$$,
  '42501',
  null,
  'authenticated não escreve conversas diretamente'
);
select extensions.throws_ok(
  $$delete from public.platform_assistant_messages$$,
  '42501',
  null,
  'authenticated não exclui mensagens diretamente'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select extensions.is((select count(*) from public.platform_assistant_conversations), 1::bigint, 'outro usuário não lê a conversa do proprietário');

reset role;
set local role anon;
select extensions.throws_ok(
  $$select * from public.platform_assistant_conversations$$,
  '42501',
  null,
  'visitante não lê conversas'
);

reset role;
set local role service_role;
select extensions.is((select count(*) from public.platform_assistant_conversations), 2::bigint, 'servidor administrativo audita todas as conversas');
select extensions.is((select count(*) from public.platform_assistant_settings), 1::bigint, 'configuração privada é acessível ao servidor');

select * from extensions.finish();
rollback;
