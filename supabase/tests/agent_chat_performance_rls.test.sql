begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chat-owner@test.local', '', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chat-other@test.local', '', now(), now(), now())
on conflict (id) do nothing;

update public.profiles set ai_credits = 2 where id = '30000000-0000-0000-0000-000000000001';

insert into public.agents (id, slug, name, role, description, category, status, avatar)
values ('31000000-0000-0000-0000-000000000001', 'agente-teste-perf', 'Agente Teste', 'Tutor', '', 'Estudo', 'Disponível', 'tutor')
on conflict (id) do nothing;

insert into public.agent_conversations (id, agent_id, user_id, title)
values
  ('32000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Do proprietário'),
  ('32000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'De outro usuário');

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);

select extensions.is((select count(*) from public.agent_conversations), 1::bigint, 'aluno lê somente conversas próprias');
select extensions.lives_ok(
  $$insert into public.agent_messages (conversation_id, author, text) values ('32000000-0000-0000-0000-000000000001', 'student', 'Minha mensagem')$$,
  'aluno escreve na própria conversa'
);
select extensions.throws_ok(
  $$insert into public.agent_messages (conversation_id, author, text) values ('32000000-0000-0000-0000-000000000002', 'student', 'Mensagem indevida')$$,
  '42501', null, 'aluno não escreve na conversa de outro usuário'
);
select extensions.is(public.consume_ai_credit(), 1, 'primeiro débito devolve saldo um');
select extensions.is(public.consume_ai_credit(), 0, 'segundo débito devolve saldo zero');
select extensions.is(public.consume_ai_credit(), -1, 'saldo não fica negativo');

reset role;
set local role anon;
select extensions.throws_ok(
  $$select public.consume_ai_credit()$$,
  '42501', null, 'visitante não pode consumir créditos'
);

select * from extensions.finish();
rollback;
