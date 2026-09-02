begin;

create extension if not exists pgtap with schema extensions;
select plan(38);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('59000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'personalized-owner@test.local', '', now(), now(), now()),
  ('59000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'personalized-other@test.local', '', now(), now(), now()),
  ('59000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'personalized-admin@test.local', '', now(), now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'admin' where id = '59000000-0000-0000-0000-000000000003';

insert into public.courses (id, title, slug, category, is_published)
values ('59000000-0000-0000-0000-000000000010', 'Curso personalizado', 'curso-personalizado-test', 'Teste', true);
insert into public.modules (id, course_id, title, order_index)
values ('59000000-0000-0000-0000-000000000011', '59000000-0000-0000-0000-000000000010', 'Módulo', 1);
insert into public.lessons (id, module_id, title, type, order_index, is_published)
values ('59000000-0000-0000-0000-000000000012', '59000000-0000-0000-0000-000000000011', 'Aula IA', 'personalized_ai', 1, false);

insert into public.personalized_lesson_configs
  (lesson_id, prompt_template, model, questions, variable_bindings)
values (
  '59000000-0000-0000-0000-000000000012',
  'Crie uma aula para {{objetivo}}.',
  'google/gemini-2.0-flash-001',
  '[{"id":"q1","key":"objetivo","label":"Qual objetivo?","type":"short_text","required":true,"options":[],"order":0}]',
  '[]'
);
insert into public.student_variable_definitions
  (variable_key, label, question_type, source_lesson_id)
values ('objetivo', 'Qual objetivo?', 'short_text', '59000000-0000-0000-0000-000000000012');
insert into public.student_variable_values (user_id, variable_key, answer, source_lesson_id)
values
  ('59000000-0000-0000-0000-000000000001', 'objetivo', 'Liderar melhor', '59000000-0000-0000-0000-000000000012'),
  ('59000000-0000-0000-0000-000000000002', 'objetivo', 'Comunicar melhor', '59000000-0000-0000-0000-000000000012');
insert into public.personalized_lesson_generations
  (request_key, lesson_id, user_id, version, config_revision, input_signature, status, content_markdown, model, assistant_name, finished_at)
values
  ('59000000-0000-0000-0000-000000000021', '59000000-0000-0000-0000-000000000012', '59000000-0000-0000-0000-000000000001', 1, 1, 'sig-owner', 'ready', '# Aula do owner', 'google/gemini-2.0-flash-001', 'Assistente', now()),
  ('59000000-0000-0000-0000-000000000022', '59000000-0000-0000-0000-000000000012', '59000000-0000-0000-0000-000000000002', 1, 1, 'sig-other', 'ready', '# Aula do other', 'google/gemini-2.0-flash-001', 'Assistente', now());

select extensions.lives_ok(
  $$update public.lessons set is_published = true where id = '59000000-0000-0000-0000-000000000012'$$,
  'configuração válida permite publicar a aula'
);
update public.personalized_lesson_configs
set prompt_template = 'Use {{variavel_nao_autorizada}}.'
where lesson_id = '59000000-0000-0000-0000-000000000012';
select extensions.throws_ok(
  $$update public.lessons set title = title where id = '59000000-0000-0000-0000-000000000012'$$,
  '23514', null, 'variável desconhecida bloqueia a publicação'
);
update public.personalized_lesson_configs
set prompt_template = 'Crie uma aula para {{objetivo}}.'
where lesson_id = '59000000-0000-0000-0000-000000000012';

select extensions.fk_ok('public', 'personalized_lesson_configs', 'lesson_id', 'public', 'lessons', 'id', 'configuração referencia uma aula');
select extensions.fk_ok('public', 'personalized_lesson_generations', 'user_id', 'auth', 'users', 'id', 'geração referencia o aluno');
select extensions.has_index('public', 'personalized_lesson_generations', 'personalized_lesson_generations_user_lesson_idx', 'consulta de aluno/aula tem índice');
select extensions.has_index('public', 'personalized_lesson_generations', 'personalized_lesson_generations_inflight_idx', 'concorrência tem índice parcial único');
select extensions.has_index('public', 'personalized_lesson_generations', 'personalized_lesson_generations_created_idx', 'histórico global por data tem índice');
select extensions.has_index('public', 'personalized_lesson_generations', 'personalized_lesson_generations_status_created_idx', 'filtro de status do histórico tem índice');
select extensions.has_index('public', 'personalized_lesson_generations', 'personalized_lesson_generations_user_created_idx', 'histórico por aluno tem índice');
select extensions.ok(has_table_privilege('authenticated', 'public.personalized_lesson_generations', 'SELECT'), 'authenticated recebe SELECT explícito nas gerações');
select extensions.ok(not has_table_privilege('anon', 'public.personalized_lesson_generations', 'SELECT'), 'anon não recebe acesso às gerações');
select extensions.ok(has_table_privilege('authenticated', 'public.ai_model_pricing', 'SELECT'), 'authenticated pode consultar modelos sujeito a RLS');
select extensions.ok(not has_table_privilege('anon', 'public.ai_model_pricing', 'SELECT'), 'anon não recebe acesso aos modelos');
select extensions.has_column('public', 'personalized_lesson_generations', 'content_blocks', 'geração guarda os blocos do BlockViewer');
select extensions.is(
  (select pg_get_function_identity_arguments(p.oid)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'complete_personalized_lesson_generation'),
  'p_generation_id uuid, p_content_markdown text, p_credits_charged numeric, p_provider_cost_usd numeric, p_provider_cost_brl numeric, p_protected_cost_brl numeric, p_prompt_tokens bigint, p_completion_tokens bigint, p_reasoning_tokens bigint, p_cached_tokens bigint, p_provider_generation_id text, p_pricing_source text, p_metadata jsonb, p_content_blocks jsonb'::text,
  'RPC de conclusão recebe p_content_blocks por último'
);
select extensions.has_table('public', 'personalized_lesson_drafts', 'existe tabela privada de rascunhos');
select extensions.ok(has_table_privilege('authenticated', 'public.personalized_lesson_drafts', 'SELECT'), 'authenticated acessa rascunhos sujeito a RLS');
select extensions.ok(not has_table_privilege('anon', 'public.personalized_lesson_drafts', 'SELECT'), 'anon não recebe acesso aos rascunhos');

set local role authenticated;
select set_config('request.jwt.claim.sub', '59000000-0000-0000-0000-000000000001', true);
select extensions.results_eq(
  $$select content_markdown from public.personalized_lesson_generations order by version$$,
  array['# Aula do owner'::text],
  'aluno lê somente as próprias gerações'
);
select extensions.results_eq(
  $$select answer from public.student_variable_values$$,
  array['Liderar melhor'::text],
  'aluno lê somente as próprias variáveis'
);
select extensions.is_empty($$select lesson_id from public.personalized_lesson_configs$$, 'aluno não lê prompt nem configuração');
select extensions.is_empty($$select model from public.ai_model_pricing$$, 'aluno não lê a tabela de modelos');
select extensions.is_empty($$select lesson_id from public.personalized_lesson_drafts$$, 'aluno não lê rascunhos administrativos');
select extensions.throws_ok(
  $$select public.complete_personalized_lesson_generation('59000000-0000-0000-0000-000000000021', '# invasão', 0, 0, 0, 0, 0, 0)$$,
  '42501', null, 'aluno não executa finalização financeira'
);
select extensions.throws_ok(
  $$select public.publish_personalized_lesson_draft('59000000-0000-0000-0000-000000000012', 1)$$,
  '42501', null, 'aluno não publica rascunho administrativo'
);

select set_config('request.jwt.claim.sub', '59000000-0000-0000-0000-000000000003', true);
select extensions.is((select count(*) from public.personalized_lesson_configs), 1::bigint, 'admin lê a configuração privada');
select extensions.is((select count(*) from public.personalized_lesson_generations), 2::bigint, 'admin audita todas as versões');
select extensions.ok((select count(*) > 0 from public.ai_model_pricing), 'admin lê os modelos habilitados');
select extensions.lives_ok(
  $$insert into public.personalized_lesson_drafts (
      lesson_id, lesson_payload, authoring_mode, guided_config, prompt_template, model,
      questions, variable_bindings, source_refs, base_revision, draft_version, updated_by
    ) values (
      '59000000-0000-0000-0000-000000000012',
      '{"moduleId":"59000000-0000-0000-0000-000000000011","title":"Aula IA revisada","durationInMinutes":15,"shortDescription":"","coverUrl":"","topics":[],"solves":[],"level":"iniciante","objective":"Aplicar o conteúdo","audience":"","prerequisites":[],"isEligibleForTrail":true}',
      'guided', '{"coreInstructions":"Ensine com um caso prático.","personalizationInstructions":"","tone":"didactic","sections":["scenario"]}',
      'Nova aula para {{objetivo}}.', 'google/gemini-2.0-flash-001',
      '[{"id":"q1","key":"objetivo","label":"Qual objetivo?","type":"short_text","required":true,"options":[],"order":0}]',
      '[]', '[]', 1, 1, '59000000-0000-0000-0000-000000000003'
    )$$,
  'admin cria rascunho separado'
);
select extensions.is(
  (select prompt_template from public.personalized_lesson_configs where lesson_id = '59000000-0000-0000-0000-000000000012'),
  'Crie uma aula para {{objetivo}}.'::text,
  'salvar rascunho não altera configuração ativa'
);
select extensions.throws_ok(
  $$select public.save_personalized_lesson_draft(
      '59000000-0000-0000-0000-000000000012', 0, '{}'::jsonb, '{}'::uuid[]
    )$$,
  '40001', null, 'versão esperada impede sobrescrever rascunho concorrente'
);
select extensions.lives_ok(
  $$select public.save_personalized_lesson_draft(
      lesson_id,
      1,
      jsonb_build_object(
        'lessonPayload', lesson_payload,
        'authoringMode', authoring_mode,
        'guidedConfig', guided_config,
        'promptTemplate', prompt_template,
        'context', context,
        'model', model,
        'questions', questions,
        'variableBindings', variable_bindings,
        'sourceRefs', source_refs
      ),
      '{}'::uuid[]
    ) from public.personalized_lesson_drafts
    where lesson_id = '59000000-0000-0000-0000-000000000012'$$,
  'admin salva seção do rascunho atomicamente'
);
select extensions.lives_ok(
  $$select public.publish_personalized_lesson_draft('59000000-0000-0000-0000-000000000012', 2)$$,
  'admin publica o rascunho transacionalmente'
);
select extensions.is(
  (select prompt_template from public.personalized_lesson_configs where lesson_id = '59000000-0000-0000-0000-000000000012'),
  'Nova aula para {{objetivo}}.'::text,
  'publicação promove o novo prompt'
);

reset role;
set local role service_role;
insert into public.personalized_lesson_generations
  (request_key, lesson_id, user_id, version, config_revision, input_signature, status, model, assistant_name)
values ('59000000-0000-0000-0000-000000000023', '59000000-0000-0000-0000-000000000012', '59000000-0000-0000-0000-000000000001', 2, 1, 'sig-pending', 'generating', 'google/gemini-2.0-flash-001', 'Assistente');
select extensions.throws_ok(
  $$insert into public.personalized_lesson_generations
      (request_key, lesson_id, user_id, version, config_revision, input_signature, status, model, assistant_name)
    values ('59000000-0000-0000-0000-000000000024', '59000000-0000-0000-0000-000000000012', '59000000-0000-0000-0000-000000000001', 3, 1, 'sig-pending-2', 'generating', 'google/gemini-2.0-flash-001', 'Assistente')$$,
  '23505', null, 'só existe uma geração em andamento por aluno/aula'
);
select extensions.throws_ok(
  $$insert into public.personalized_lesson_generations
      (request_key, lesson_id, user_id, version, config_revision, input_signature, status, model, assistant_name, content_blocks)
    values ('59000000-0000-0000-0000-000000000025', '59000000-0000-0000-0000-000000000012', '59000000-0000-0000-0000-000000000002', 4, 1, 'sig-blocks', 'failed', 'google/gemini-2.0-flash-001', 'Assistente', '{}'::jsonb)$$,
  '23514', null, 'content_blocks precisa ser um array JSON'
);
select extensions.throws_ok(
  $$update public.personalized_lesson_generations set content_markdown = '# alterada' where request_key = '59000000-0000-0000-0000-000000000021'$$,
  '23514', null, 'versão pronta é imutável'
);
select extensions.throws_ok(
  $$delete from public.personalized_lesson_generations where request_key = '59000000-0000-0000-0000-000000000021'$$,
  '23514', null, 'histórico não pode ser apagado'
);

select * from extensions.finish();
rollback;
