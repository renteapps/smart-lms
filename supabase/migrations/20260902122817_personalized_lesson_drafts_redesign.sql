-- Rascunho administrativo separado da configuração usada pelos alunos.
-- Salvar uma seção nunca altera uma aula já publicada; a promoção ocorre em
-- uma única transação por publish_personalized_lesson_draft().

alter table public.personalized_lesson_configs
  add column if not exists authoring_mode text not null default 'advanced',
  add column if not exists guided_config jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'personalized_lesson_configs_authoring_mode_check'
      and conrelid = 'public.personalized_lesson_configs'::regclass
  ) then
    alter table public.personalized_lesson_configs
      add constraint personalized_lesson_configs_authoring_mode_check
      check (authoring_mode in ('guided', 'advanced'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'personalized_lesson_configs_guided_object_check'
      and conrelid = 'public.personalized_lesson_configs'::regclass
  ) then
    alter table public.personalized_lesson_configs
      add constraint personalized_lesson_configs_guided_object_check
      check (jsonb_typeof(guided_config) = 'object');
  end if;
end $$;

create table public.personalized_lesson_drafts (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  lesson_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(lesson_payload) = 'object'),
  authoring_mode text not null default 'guided' check (authoring_mode in ('guided', 'advanced')),
  guided_config jsonb not null default '{}'::jsonb check (jsonb_typeof(guided_config) = 'object'),
  prompt_template text not null default '' check (char_length(prompt_template) <= 20000),
  context text not null default '' check (char_length(context) <= 120000),
  model text references public.ai_model_pricing(model),
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  variable_bindings jsonb not null default '[]'::jsonb check (jsonb_typeof(variable_bindings) = 'array'),
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  base_revision integer not null default 0 check (base_revision >= 0),
  draft_version integer not null default 1 check (draft_version > 0),
  published_draft_version integer not null default 0 check (published_draft_version >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index personalized_lesson_drafts_updated_by_idx
  on public.personalized_lesson_drafts (updated_by)
  where updated_by is not null;

create table public.personalized_lesson_document_refs (
  document_id uuid not null references public.personalized_lesson_documents(id) on delete cascade,
  scope text not null check (scope in ('draft', 'published')),
  created_at timestamptz not null default now(),
  primary key (document_id, scope)
);

create or replace function public.limit_personalized_lesson_documents()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.lesson_id::text, 0));
  -- Até dez documentos podem estar no rascunho e dez na versão publicada
  -- durante uma substituição. A interface continua limitando cada versão a 10.
  if (select count(*) from public.personalized_lesson_documents where lesson_id = new.lesson_id) >= 20 then
    raise check_violation using message = 'Remova documentos antigos antes de enviar novos arquivos.';
  end if;
  return new;
end;
$$;

-- Configurações antigas continuam idênticas e abrem no modo avançado.
insert into public.personalized_lesson_drafts (
  lesson_id,
  lesson_payload,
  authoring_mode,
  guided_config,
  prompt_template,
  context,
  model,
  questions,
  variable_bindings,
  source_refs,
  base_revision,
  draft_version,
  published_draft_version,
  updated_by,
  published_at
)
select
  l.id,
  jsonb_build_object(
    'moduleId', l.module_id,
    'title', l.title,
    'durationInMinutes', l.duration_in_minutes,
    'shortDescription', coalesce(l.short_description, ''),
    'coverUrl', coalesce(l.cover_url, ''),
    'topics', coalesce(to_jsonb(l.topics), '[]'::jsonb),
    'solves', coalesce(to_jsonb(l.solves), '[]'::jsonb),
    'level', coalesce(l.level, 'iniciante'),
    'objective', coalesce(l.objective, ''),
    'audience', coalesce(l.audience, ''),
    'prerequisites', coalesce(to_jsonb(l.prerequisites), '[]'::jsonb),
    'isEligibleForTrail', coalesce(l.is_eligible_for_trail, true)
  ),
  c.authoring_mode,
  c.guided_config,
  c.prompt_template,
  c.context,
  c.model,
  c.questions,
  c.variable_bindings,
  c.source_refs,
  c.revision,
  1,
  1,
  c.updated_by,
  case when l.is_published then now() else null end
from public.lessons l
join public.personalized_lesson_configs c on c.lesson_id = l.id
on conflict (lesson_id) do nothing;

insert into public.personalized_lesson_document_refs (document_id, scope)
select d.id, scopes.scope
from public.personalized_lesson_documents d
join public.personalized_lesson_configs c on c.lesson_id = d.lesson_id
cross join (values ('draft'::text), ('published'::text)) scopes(scope)
on conflict (document_id, scope) do nothing;

create or replace function public.bump_personalized_lesson_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.prompt_template,
    new.context,
    new.model,
    new.questions,
    new.variable_bindings,
    new.source_refs,
    new.authoring_mode,
    new.guided_config
  ) is distinct from row(
    old.prompt_template,
    old.context,
    old.model,
    old.questions,
    old.variable_bindings,
    old.source_refs,
    old.authoring_mode,
    old.guided_config
  ) then
    new.revision := greatest(old.revision + 1, new.revision);
  else
    new.revision := greatest(old.revision, new.revision);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.validate_personalized_lesson_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  config public.personalized_lesson_configs%rowtype;
  v_var_key text;
begin
  if new.type <> 'personalized_ai' or new.is_published is not true then
    return new;
  end if;

  select * into config from public.personalized_lesson_configs where lesson_id = new.id;
  if not found or char_length(btrim(config.prompt_template)) = 0 then
    raise check_violation using message = 'Configure as instruções antes de publicar a aula personalizada.';
  end if;
  if not exists (
    select 1 from public.ai_model_pricing where model = config.model and enabled is true
  ) then
    raise check_violation using message = 'O modelo da aula personalizada não está habilitado e precificado.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(config.questions) q_item
    where jsonb_typeof(q_item) <> 'object'
       or nullif(btrim(q_item->>'key'), '') is null
       or not ((q_item->>'key') ~ '^[a-z][a-z0-9_]{0,63}$')
       or nullif(btrim(q_item->>'label'), '') is null
       or coalesce(q_item->>'type', '') not in ('short_text', 'long_text', 'single', 'multiple')
       or not (q_item ? 'required')
       or coalesce(jsonb_typeof(q_item->'required'), '') <> 'boolean'
       or (q_item->>'type' in ('single', 'multiple') and case
            when jsonb_typeof(q_item->'options') = 'array' then jsonb_array_length(q_item->'options') < 2
            else true
          end)
  ) then
    raise check_violation using message = 'Há uma pergunta incompleta ou inválida na aula personalizada.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(config.questions) q_item
    group by lower(q_item->>'key') having count(*) > 1
  ) then
    raise check_violation using message = 'As chaves das perguntas não podem se repetir.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(config.variable_bindings) b_item
    where jsonb_typeof(b_item) <> 'object'
       or nullif(btrim(b_item->>'key'), '') is null
       or not ((b_item->>'key') ~ '^[a-z][a-z0-9_]{0,63}$')
       or coalesce(b_item->>'source', '') not in ('profile', 'onboarding', 'profile_test', 'collected')
       or nullif(btrim(b_item->>'sourceRef'), '') is null
  ) then
    raise check_violation using message = 'Há uma variável autorizada incompleta ou inválida.';
  end if;
  if exists (
    select 1 from (
      select lower(q_sub->>'key') as var_key from jsonb_array_elements(config.questions) q_sub
      union all
      select lower(b_sub->>'key') as var_key from jsonb_array_elements(config.variable_bindings) b_sub
    ) authorized_variables
    group by authorized_variables.var_key having count(*) > 1
  ) then
    raise check_violation using message = 'Cada variável pode ter somente uma origem autorizada.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(config.source_refs) source_ref
    where jsonb_typeof(source_ref) <> 'object'
       or coalesce(source_ref->>'kind', '') not in ('course', 'module', 'lesson', 'article')
       or nullif(btrim(source_ref->>'id'), '') is null
       or not ((source_ref->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
       or nullif(btrim(source_ref->>'title'), '') is null
  ) then
    raise check_violation using message = 'Há uma fonte do LMS incompleta ou inválida.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(config.source_refs) source_ref
    where (source_ref->>'kind' = 'course' and not exists (
            select 1 from public.courses where id = (source_ref->>'id')::uuid and status <> 'Arquivado'))
       or (source_ref->>'kind' = 'module' and not exists (
            select 1 from public.modules where id = (source_ref->>'id')::uuid))
       or (source_ref->>'kind' = 'lesson' and ((source_ref->>'id')::uuid = new.id or not exists (
            select 1 from public.lessons where id = (source_ref->>'id')::uuid)))
       or (source_ref->>'kind' = 'article' and not exists (
            select 1 from public.articles where id = (source_ref->>'id')::uuid))
  ) then
    raise check_violation using message = 'Uma das fontes selecionadas não existe ou não pode ser usada.';
  end if;
  for v_var_key in
    select lower(matches[1])
    from regexp_matches(config.prompt_template, '\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]*)\s*(?:\|[^{}]*)?\}\}', 'g') matches
  loop
    if not exists (
      select 1 from jsonb_array_elements(config.questions) q_search where lower(q_search->>'key') = v_var_key
      union all
      select 1 from jsonb_array_elements(config.variable_bindings) b_search where lower(b_search->>'key') = v_var_key
    ) then
      raise check_violation using message = format('Variável desconhecida no prompt: {{%s}}.', v_var_key);
    end if;
  end loop;
  if exists (
    select 1
    from public.personalized_lesson_document_refs ref
    join public.personalized_lesson_documents document on document.id = ref.document_id
    where ref.scope = 'published' and document.lesson_id = new.id and document.status <> 'ready'
  ) then
    raise check_violation using message = 'Todos os documentos precisam estar processados antes da publicação.';
  end if;
  return new;
end;
$$;

create or replace function public.save_personalized_lesson_draft(
  p_lesson_id uuid,
  p_expected_draft_version integer,
  p_payload jsonb,
  p_document_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_draft public.personalized_lesson_drafts%rowtype;
  next_version integer;
begin
  if coalesce((select public.is_admin()), false) is not true then
    raise insufficient_privilege using message = 'Acesso restrito a administradores.';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise check_violation using message = 'O conteúdo do rascunho é inválido.';
  end if;
  if cardinality(p_document_ids) > 10 then
    raise check_violation using message = 'A aula pode usar no máximo 10 documentos.';
  end if;
  if exists (
    select 1 from unnest(p_document_ids) document_id
    where not exists (
      select 1 from public.personalized_lesson_documents document
      where document.id = document_id and document.lesson_id = p_lesson_id
    )
  ) then
    raise check_violation using message = 'Um dos documentos não pertence a esta aula.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_lesson_id::text, 0));
  select * into current_draft from public.personalized_lesson_drafts where lesson_id = p_lesson_id for update;

  if p_expected_draft_version = 0 then
    if found then
      raise serialization_failure using message = 'Este rascunho foi criado em outra sessão. Recarregue a página.';
    end if;
    next_version := 1;
    insert into public.personalized_lesson_drafts (
      lesson_id, lesson_payload, authoring_mode, guided_config, prompt_template, context,
      model, questions, variable_bindings, source_refs, draft_version, updated_by, updated_at
    ) values (
      p_lesson_id,
      coalesce(p_payload->'lessonPayload', '{}'::jsonb),
      coalesce(nullif(p_payload->>'authoringMode', ''), 'guided'),
      coalesce(p_payload->'guidedConfig', '{}'::jsonb),
      coalesce(p_payload->>'promptTemplate', ''),
      coalesce(p_payload->>'context', ''),
      nullif(p_payload->>'model', ''),
      coalesce(p_payload->'questions', '[]'::jsonb),
      coalesce(p_payload->'variableBindings', '[]'::jsonb),
      coalesce(p_payload->'sourceRefs', '[]'::jsonb),
      next_version,
      (select auth.uid()),
      now()
    );
  else
    if not found or current_draft.draft_version <> p_expected_draft_version then
      raise serialization_failure using message = 'Este rascunho foi alterado em outra sessão. Recarregue a página.';
    end if;
    next_version := current_draft.draft_version + 1;
    update public.personalized_lesson_drafts set
      lesson_payload = coalesce(p_payload->'lessonPayload', '{}'::jsonb),
      authoring_mode = coalesce(nullif(p_payload->>'authoringMode', ''), 'guided'),
      guided_config = coalesce(p_payload->'guidedConfig', '{}'::jsonb),
      prompt_template = coalesce(p_payload->>'promptTemplate', ''),
      context = coalesce(p_payload->>'context', ''),
      model = nullif(p_payload->>'model', ''),
      questions = coalesce(p_payload->'questions', '[]'::jsonb),
      variable_bindings = coalesce(p_payload->'variableBindings', '[]'::jsonb),
      source_refs = coalesce(p_payload->'sourceRefs', '[]'::jsonb),
      draft_version = next_version,
      updated_by = (select auth.uid()),
      updated_at = now()
    where lesson_id = p_lesson_id;
  end if;

  delete from public.personalized_lesson_document_refs ref
  using public.personalized_lesson_documents document
  where ref.document_id = document.id and ref.scope = 'draft' and document.lesson_id = p_lesson_id;
  insert into public.personalized_lesson_document_refs (document_id, scope)
  select document_id, 'draft' from unnest(p_document_ids) document_id
  on conflict (document_id, scope) do nothing;

  return jsonb_build_object('draft_version', next_version);
end;
$$;

create or replace function public.publish_personalized_lesson_draft(
  p_lesson_id uuid,
  p_expected_draft_version integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  draft public.personalized_lesson_drafts%rowtype;
  current_config public.personalized_lesson_configs%rowtype;
  v_question jsonb;
  existing_definition public.student_variable_definitions%rowtype;
  next_revision integer;
  target_module_id uuid;
  current_course_id uuid;
begin
  if coalesce((select public.is_admin()), false) is not true then
    raise insufficient_privilege using message = 'Acesso restrito a administradores.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_lesson_id::text, 0));
  select * into draft from public.personalized_lesson_drafts where lesson_id = p_lesson_id for update;
  if not found then
    raise no_data_found using message = 'Rascunho da aula personalizada não encontrado.';
  end if;
  if draft.draft_version <> p_expected_draft_version then
    raise serialization_failure using message = 'Este rascunho foi alterado em outra sessão. Recarregue a página.';
  end if;
  if draft.model is null or not exists (
    select 1 from public.ai_model_pricing where model = draft.model and enabled is true
  ) then
    raise check_violation using message = 'Escolha um modelo de IA habilitado.';
  end if;
  if char_length(btrim(draft.prompt_template)) = 0 then
    raise check_violation using message = 'Preencha as instruções da aula.';
  end if;
  if nullif(btrim(draft.lesson_payload->>'title'), '') is null
     or nullif(btrim(draft.lesson_payload->>'objective'), '') is null then
    raise check_violation using message = 'Título e objetivo são obrigatórios.';
  end if;

  select l.module_id, m.course_id into target_module_id, current_course_id
  from public.lessons l join public.modules m on m.id = l.module_id
  where l.id = p_lesson_id and l.type = 'personalized_ai';
  if not found then raise no_data_found using message = 'Aula personalizada não encontrada.'; end if;

  target_module_id := coalesce(nullif(draft.lesson_payload->>'moduleId', '')::uuid, target_module_id);
  if not exists (select 1 from public.modules where id = target_module_id and course_id = current_course_id) then
    raise check_violation using message = 'O módulo escolhido não pertence a este curso.';
  end if;
  if exists (
    select 1
    from public.personalized_lesson_document_refs ref
    join public.personalized_lesson_documents document on document.id = ref.document_id
    where ref.scope = 'draft' and document.lesson_id = p_lesson_id and document.status <> 'ready'
  ) then
    raise check_violation using message = 'Aguarde ou remova os documentos que ainda não estão prontos.';
  end if;
  if (
    select count(*)
    from public.personalized_lesson_document_refs ref
    join public.personalized_lesson_documents document on document.id = ref.document_id
    where ref.scope = 'draft' and document.lesson_id = p_lesson_id
  ) > 10 then
    raise check_violation using message = 'A aula pode usar no máximo 10 documentos.';
  end if;

  for v_question in select value from jsonb_array_elements(draft.questions)
  loop
    select * into existing_definition
    from public.student_variable_definitions
    where variable_key = v_question->>'key';
    if found and (
      existing_definition.question_type <> v_question->>'type'
      or existing_definition.options is distinct from coalesce(v_question->'options', '[]'::jsonb)
    ) then
      raise unique_violation using message = format('A chave {{%s}} já existe com outro tipo ou opções.', v_question->>'key');
    end if;
    insert into public.student_variable_definitions (
      variable_key, label, question_type, options, source_lesson_id, active, created_by, updated_at
    ) values (
      v_question->>'key', v_question->>'label', v_question->>'type', coalesce(v_question->'options', '[]'::jsonb),
      p_lesson_id, true, (select auth.uid()), now()
    )
    on conflict (variable_key) do update
      set label = excluded.label, active = true, updated_at = now();
  end loop;

  update public.student_variable_definitions
  set active = false, updated_at = now()
  where source_lesson_id = p_lesson_id
    and not exists (
      select 1 from jsonb_array_elements(draft.questions) q_elem
      where q_elem->>'key' = student_variable_definitions.variable_key
    );

  select * into current_config from public.personalized_lesson_configs where lesson_id = p_lesson_id;
  next_revision := case when found then current_config.revision + 1 else 1 end;

  insert into public.personalized_lesson_configs (
    lesson_id, prompt_template, context, model, questions, variable_bindings, source_refs,
    revision, updated_by, updated_at, authoring_mode, guided_config
  ) values (
    p_lesson_id, btrim(draft.prompt_template), btrim(draft.context), draft.model, draft.questions,
    draft.variable_bindings, draft.source_refs, next_revision, (select auth.uid()), now(),
    draft.authoring_mode, draft.guided_config
  )
  on conflict (lesson_id) do update set
    prompt_template = excluded.prompt_template,
    context = excluded.context,
    model = excluded.model,
    questions = excluded.questions,
    variable_bindings = excluded.variable_bindings,
    source_refs = excluded.source_refs,
    revision = excluded.revision,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at,
    authoring_mode = excluded.authoring_mode,
    guided_config = excluded.guided_config;

  delete from public.personalized_lesson_document_refs ref
  using public.personalized_lesson_documents document
  where ref.document_id = document.id and ref.scope = 'published' and document.lesson_id = p_lesson_id;
  insert into public.personalized_lesson_document_refs (document_id, scope)
  select ref.document_id, 'published'
  from public.personalized_lesson_document_refs ref
  join public.personalized_lesson_documents document on document.id = ref.document_id
  where ref.scope = 'draft' and document.lesson_id = p_lesson_id
  on conflict (document_id, scope) do nothing;

  update public.lessons set
    module_id = target_module_id,
    title = btrim(draft.lesson_payload->>'title'),
    duration_in_minutes = greatest(1, coalesce((draft.lesson_payload->>'durationInMinutes')::integer, 10)),
    short_description = nullif(btrim(draft.lesson_payload->>'shortDescription'), ''),
    cover_url = nullif(btrim(draft.lesson_payload->>'coverUrl'), ''),
    topics = array(select jsonb_array_elements_text(coalesce(draft.lesson_payload->'topics', '[]'::jsonb))),
    solves = array(select jsonb_array_elements_text(coalesce(draft.lesson_payload->'solves', '[]'::jsonb))),
    level = coalesce(nullif(draft.lesson_payload->>'level', ''), 'iniciante'),
    objective = btrim(draft.lesson_payload->>'objective'),
    audience = nullif(btrim(draft.lesson_payload->>'audience'), ''),
    prerequisites = array(select jsonb_array_elements_text(coalesce(draft.lesson_payload->'prerequisites', '[]'::jsonb))),
    is_eligible_for_trail = coalesce((draft.lesson_payload->>'isEligibleForTrail')::boolean, true),
    is_published = true,
    updated_at = now()
  where id = p_lesson_id;

  select revision into next_revision from public.personalized_lesson_configs where lesson_id = p_lesson_id;
  update public.personalized_lesson_drafts set
    base_revision = next_revision,
    published_draft_version = draft_version,
    published_at = now(),
    updated_at = now()
  where lesson_id = p_lesson_id;

  return jsonb_build_object('revision', next_revision, 'draft_version', draft.draft_version);
end;
$$;

alter table public.personalized_lesson_drafts enable row level security;
alter table public.personalized_lesson_document_refs enable row level security;

revoke all on table public.personalized_lesson_drafts, public.personalized_lesson_document_refs
  from public, anon, authenticated;
grant all on table public.personalized_lesson_drafts, public.personalized_lesson_document_refs to service_role;
grant select, insert, update, delete on table public.personalized_lesson_drafts, public.personalized_lesson_document_refs to authenticated;

create policy "Admins gerenciam rascunhos de aulas personalizadas"
  on public.personalized_lesson_drafts for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "Admins gerenciam referências de documentos personalizados"
  on public.personalized_lesson_document_refs for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on function public.publish_personalized_lesson_draft(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.publish_personalized_lesson_draft(uuid, integer) to authenticated, service_role;
revoke all on function public.save_personalized_lesson_draft(uuid, integer, jsonb, uuid[])
  from public, anon, authenticated;
grant execute on function public.save_personalized_lesson_draft(uuid, integer, jsonb, uuid[]) to authenticated, service_role;

notify pgrst, 'reload schema';
