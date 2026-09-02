-- Aulas textuais geradas sob demanda e personalizadas por aluno.
-- Prompts, contexto e documentos nunca fazem parte da linha pública de lessons.

alter table public.ai_feature_policies
  drop constraint if exists ai_feature_policies_feature_check;

alter table public.ai_feature_policies
  add constraint ai_feature_policies_feature_check
  check (feature in ('agent_chat', 'platform_assistant', 'admin_sandbox', 'personalized_lesson'));

insert into public.ai_feature_policies
  (feature, display_name, enabled, charge_user, minimum_credits, max_output_tokens)
values
  ('personalized_lesson', 'Aula personalizada', true, true, 0, 4000)
on conflict (feature) do update set
  display_name = excluded.display_name,
  max_output_tokens = excluded.max_output_tokens;

create table public.personalized_lesson_configs (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  prompt_template text not null,
  context text not null default '',
  model text not null references public.ai_model_pricing(model),
  questions jsonb not null default '[]'::jsonb,
  variable_bindings jsonb not null default '[]'::jsonb,
  source_refs jsonb not null default '[]'::jsonb,
  revision integer not null default 1 check (revision > 0),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personalized_lesson_configs_prompt_length check (
    char_length(btrim(prompt_template)) between 1 and 20000
  ),
  constraint personalized_lesson_configs_context_length check (char_length(context) <= 120000),
  constraint personalized_lesson_configs_questions_array check (jsonb_typeof(questions) = 'array'),
  constraint personalized_lesson_configs_bindings_array check (jsonb_typeof(variable_bindings) = 'array'),
  constraint personalized_lesson_configs_sources_array check (jsonb_typeof(source_refs) = 'array')
);

create index personalized_lesson_configs_updated_by_idx
  on public.personalized_lesson_configs (updated_by)
  where updated_by is not null;

create table public.student_variable_definitions (
  variable_key text primary key,
  label text not null,
  question_type text not null check (question_type in ('short_text', 'long_text', 'single', 'multiple')),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  source_lesson_id uuid references public.lessons(id) on delete set null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_variable_definitions_key_check
    check (variable_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  constraint student_variable_definitions_label_check
    check (char_length(btrim(label)) between 1 and 300)
);

create index student_variable_definitions_source_lesson_idx
  on public.student_variable_definitions (source_lesson_id)
  where source_lesson_id is not null;

create index student_variable_definitions_created_by_idx
  on public.student_variable_definitions (created_by)
  where created_by is not null;

create table public.student_variable_values (
  user_id uuid not null references auth.users(id) on delete cascade,
  variable_key text not null references public.student_variable_definitions(variable_key),
  answer text not null,
  answer_values jsonb not null default '[]'::jsonb check (jsonb_typeof(answer_values) = 'array'),
  source_lesson_id uuid references public.lessons(id) on delete set null,
  answered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, variable_key),
  constraint student_variable_values_answer_length check (
    char_length(btrim(answer)) between 1 and 4000
  )
);

create index student_variable_values_source_lesson_idx
  on public.student_variable_values (source_lesson_id)
  where source_lesson_id is not null;

create index student_variable_values_key_idx
  on public.student_variable_values (variable_key);

create table public.personalized_lesson_documents (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  content_hash text,
  extracted_text text,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personalized_lesson_documents_name_check
    check (char_length(btrim(file_name)) between 1 and 255),
  constraint personalized_lesson_documents_path_check
    check (storage_path like 'personalized-lessons/%'),
  constraint personalized_lesson_documents_text_length
    check (extracted_text is null or char_length(extracted_text) <= 500000)
);

create index personalized_lesson_documents_lesson_idx
  on public.personalized_lesson_documents (lesson_id, created_at);

create index personalized_lesson_documents_created_by_idx
  on public.personalized_lesson_documents (created_by)
  where created_by is not null;

create table public.personalized_lesson_generations (
  id uuid primary key default gen_random_uuid(),
  request_key uuid not null unique,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version > 0),
  config_revision integer not null check (config_revision > 0),
  input_signature text not null,
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  content_markdown text,
  model text not null,
  usage_event_id uuid unique references public.ai_usage_events(id) on delete set null,
  credits_charged numeric(14,4) not null default 0 check (credits_charged >= 0),
  assistant_name text not null,
  assistant_avatar jsonb not null default '{}'::jsonb check (jsonb_typeof(assistant_avatar) = 'object'),
  source_manifest jsonb not null default '[]'::jsonb check (jsonb_typeof(source_manifest) = 'array'),
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (lesson_id, user_id, version),
  constraint personalized_lesson_generations_content_check check (
    (status = 'ready' and content_markdown is not null and char_length(btrim(content_markdown)) > 0)
    or status <> 'ready'
  )
);

create index personalized_lesson_generations_user_lesson_idx
  on public.personalized_lesson_generations (user_id, lesson_id, created_at desc);

create index personalized_lesson_generations_lesson_idx
  on public.personalized_lesson_generations (lesson_id, created_at desc);

create unique index personalized_lesson_generations_inflight_idx
  on public.personalized_lesson_generations (lesson_id, user_id)
  where status = 'generating';

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
    new.source_refs
  ) is distinct from row(
    old.prompt_template,
    old.context,
    old.model,
    old.questions,
    old.variable_bindings,
    old.source_refs
  ) then
    new.revision := greatest(old.revision + 1, new.revision);
  else
    new.revision := greatest(old.revision, new.revision);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger personalized_lesson_configs_revision_trigger
before update on public.personalized_lesson_configs
for each row execute function public.bump_personalized_lesson_revision();

create or replace function public.touch_personalized_lesson_revision(p_lesson_id uuid)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  next_revision integer;
begin
  update public.personalized_lesson_configs
  set revision = revision + 1
  where lesson_id = p_lesson_id
  returning revision into next_revision;
  return next_revision;
end;
$$;

revoke all on function public.touch_personalized_lesson_revision(uuid) from public, anon, authenticated;
grant execute on function public.touch_personalized_lesson_revision(uuid) to service_role;

create or replace function public.limit_personalized_lesson_documents()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.lesson_id::text, 0));
  if (select count(*) from public.personalized_lesson_documents where lesson_id = new.lesson_id) >= 10 then
    raise check_violation using message = 'Uma aula personalizada aceita no máximo 10 documentos.';
  end if;
  return new;
end;
$$;

create trigger personalized_lesson_documents_limit_trigger
before insert on public.personalized_lesson_documents
for each row execute function public.limit_personalized_lesson_documents();

create or replace function public.validate_personalized_lesson_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  config public.personalized_lesson_configs%rowtype;
  variable_key text;
begin
  if new.type <> 'personalized_ai' or new.is_published is not true then
    return new;
  end if;

  select * into config from public.personalized_lesson_configs where lesson_id = new.id;
  if not found or char_length(btrim(config.prompt_template)) = 0 then
    raise check_violation using message = 'Configure o prompt antes de publicar a aula personalizada.';
  end if;
  if not exists (
    select 1 from public.ai_model_pricing where model = config.model and enabled is true
  ) then
    raise check_violation using message = 'O modelo da aula personalizada não está habilitado e precificado.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(config.questions) question
    where jsonb_typeof(question) <> 'object'
       or nullif(btrim(question->>'key'), '') is null
       or not ((question->>'key') ~ '^[a-z][a-z0-9_]{0,63}$')
       or nullif(btrim(question->>'label'), '') is null
       or coalesce(question->>'type', '') not in ('short_text', 'long_text', 'single', 'multiple')
       or not (question ? 'required')
       or coalesce(jsonb_typeof(question->'required'), '') <> 'boolean'
       or (
         question->>'type' in ('single', 'multiple')
         and case
           when jsonb_typeof(question->'options') = 'array'
             then jsonb_array_length(question->'options') < 2
           else true
         end
       )
  ) then
    raise check_violation using message = 'Há uma pergunta incompleta ou inválida na aula personalizada.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(config.questions) question
    group by lower(question->>'key')
    having count(*) > 1
  ) then
    raise check_violation using message = 'As chaves das perguntas não podem se repetir.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(config.variable_bindings) binding
    where jsonb_typeof(binding) <> 'object'
       or nullif(btrim(binding->>'key'), '') is null
       or not ((binding->>'key') ~ '^[a-z][a-z0-9_]{0,63}$')
       or coalesce(binding->>'source', '') not in ('profile', 'onboarding', 'profile_test', 'collected')
       or nullif(btrim(binding->>'sourceRef'), '') is null
  ) then
    raise check_violation using message = 'Há uma variável autorizada incompleta ou inválida.';
  end if;
  if exists (
    select 1
    from (
      select lower(question->>'key') as variable_key from jsonb_array_elements(config.questions) question
      union all
      select lower(binding->>'key') as variable_key from jsonb_array_elements(config.variable_bindings) binding
    ) authorized_variables
    group by variable_key
    having count(*) > 1
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
            select 1 from public.courses where id = (source_ref->>'id')::uuid and status <> 'Arquivado'
          ))
       or (source_ref->>'kind' = 'module' and not exists (
            select 1 from public.modules where id = (source_ref->>'id')::uuid
          ))
       or (source_ref->>'kind' = 'lesson' and (
            (source_ref->>'id')::uuid = new.id
            or not exists (select 1 from public.lessons where id = (source_ref->>'id')::uuid)
          ))
       or (source_ref->>'kind' = 'article' and not exists (
            select 1 from public.articles where id = (source_ref->>'id')::uuid
          ))
  ) then
    raise check_violation using message = 'Uma das fontes selecionadas não existe ou não pode ser usada.';
  end if;
  for variable_key in
    select lower(matches[1])
    from regexp_matches(config.prompt_template, '\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]*)\s*(?:\|[^{}]*)?\}\}', 'g') matches
  loop
    if not exists (
      select 1 from jsonb_array_elements(config.questions) question where lower(question->>'key') = variable_key
      union all
      select 1 from jsonb_array_elements(config.variable_bindings) binding where lower(binding->>'key') = variable_key
    ) then
      raise check_violation using message = format('Variável desconhecida no prompt: {{%s}}.', variable_key);
    end if;
  end loop;
  if exists (
    select 1 from public.personalized_lesson_documents
    where lesson_id = new.id and status <> 'ready'
  ) then
    raise check_violation using message = 'Todos os documentos precisam estar processados antes da publicação.';
  end if;
  return new;
end;
$$;

create trigger lessons_validate_personalized_ai_publication
before insert or update on public.lessons
for each row execute function public.validate_personalized_lesson_publication();

create or replace function public.protect_personalized_lesson_generation_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise check_violation using message = 'O histórico de gerações é imutável.';
  end if;
  if old.status in ('ready', 'failed') then
    raise check_violation using message = 'Uma geração finalizada é imutável.';
  end if;
  return new;
end;
$$;

create trigger personalized_lesson_generation_history_trigger
before update or delete on public.personalized_lesson_generations
for each row execute function public.protect_personalized_lesson_generation_history();

alter table public.personalized_lesson_configs enable row level security;
alter table public.student_variable_definitions enable row level security;
alter table public.student_variable_values enable row level security;
alter table public.personalized_lesson_documents enable row level security;
alter table public.personalized_lesson_generations enable row level security;

revoke all on table
  public.personalized_lesson_configs,
  public.student_variable_definitions,
  public.student_variable_values,
  public.personalized_lesson_documents,
  public.personalized_lesson_generations
from public, anon, authenticated;

grant all on table
  public.personalized_lesson_configs,
  public.student_variable_definitions,
  public.student_variable_values,
  public.personalized_lesson_documents,
  public.personalized_lesson_generations
to service_role;

grant select, insert, update, delete on table
  public.personalized_lesson_configs,
  public.student_variable_definitions,
  public.personalized_lesson_documents
to authenticated;

grant select on table
  public.student_variable_values,
  public.personalized_lesson_generations
to authenticated;

create policy "Admins gerenciam configurações de aulas personalizadas"
  on public.personalized_lesson_configs for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins gerenciam definições de variáveis"
  on public.student_variable_definitions for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins gerenciam documentos de aulas personalizadas"
  on public.personalized_lesson_documents for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Aluno lê suas variáveis personalizadas"
  on public.student_variable_values for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

create policy "Aluno lê suas gerações personalizadas"
  on public.personalized_lesson_generations for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

-- Liquidação e publicação da versão pronta acontecem na mesma transação.
create or replace function public.complete_personalized_lesson_generation(
  p_generation_id uuid,
  p_content_markdown text,
  p_credits_charged numeric,
  p_provider_cost_usd numeric,
  p_provider_cost_brl numeric,
  p_protected_cost_brl numeric,
  p_prompt_tokens bigint,
  p_completion_tokens bigint,
  p_reasoning_tokens bigint default 0,
  p_cached_tokens bigint default 0,
  p_provider_generation_id text default null,
  p_pricing_source text default 'provider',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  generation public.personalized_lesson_generations%rowtype;
  usage_event public.ai_usage_events%rowtype;
  settlement jsonb;
begin
  select * into generation
  from public.personalized_lesson_generations
  where id = p_generation_id
  for update;

  if not found then
    raise no_data_found using message = 'Geração personalizada não encontrada.';
  end if;
  if generation.status = 'ready' then
    return jsonb_build_object(
      'credits_charged', generation.credits_charged,
      'idempotent', true
    );
  end if;
  if generation.status <> 'generating' or generation.usage_event_id is null then
    raise check_violation using message = 'Geração personalizada não pode ser concluída.';
  end if;

  select * into usage_event
  from public.ai_usage_events
  where id = generation.usage_event_id
  for update;

  if not found
     or usage_event.user_id is distinct from generation.user_id
     or usage_event.feature <> 'personalized_lesson'
     or usage_event.model <> generation.model then
    raise check_violation using message = 'O evento financeiro não pertence a esta geração personalizada.';
  end if;

  settlement := public.settle_ai_usage(
    generation.usage_event_id,
    p_credits_charged,
    p_provider_cost_usd,
    p_provider_cost_brl,
    p_protected_cost_brl,
    p_prompt_tokens,
    p_completion_tokens,
    p_reasoning_tokens,
    p_cached_tokens,
    p_provider_generation_id,
    p_pricing_source,
    coalesce(p_metadata, '{}'::jsonb)
  );

  update public.personalized_lesson_generations
  set status = 'ready',
      content_markdown = btrim(p_content_markdown),
      credits_charged = coalesce((settlement->>'credits_charged')::numeric, 0),
      finished_at = now(),
      error_code = null
  where id = p_generation_id;

  return settlement || jsonb_build_object('generation_id', p_generation_id);
end;
$$;

create or replace function public.fail_personalized_lesson_generation(
  p_generation_id uuid,
  p_error_code text default null,
  p_provider_cost_usd numeric default 0,
  p_provider_cost_brl numeric default 0,
  p_prompt_tokens bigint default 0,
  p_completion_tokens bigint default 0,
  p_provider_generation_id text default null
)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  generation public.personalized_lesson_generations%rowtype;
  usage_event public.ai_usage_events%rowtype;
  cancellation jsonb := '{}'::jsonb;
begin
  select * into generation
  from public.personalized_lesson_generations
  where id = p_generation_id
  for update;

  if not found then
    raise no_data_found using message = 'Geração personalizada não encontrada.';
  end if;
  if generation.status = 'failed' then
    return jsonb_build_object('idempotent', true);
  end if;
  if generation.status <> 'generating' then
    raise check_violation using message = 'Geração personalizada não pode ser cancelada.';
  end if;

  if generation.usage_event_id is not null then
    select * into usage_event
    from public.ai_usage_events
    where id = generation.usage_event_id
    for update;

    if not found
       or usage_event.user_id is distinct from generation.user_id
       or usage_event.feature <> 'personalized_lesson'
       or usage_event.model <> generation.model then
      raise check_violation using message = 'O evento financeiro não pertence a esta geração personalizada.';
    end if;

    cancellation := public.cancel_ai_usage(
      generation.usage_event_id,
      p_error_code,
      p_provider_cost_usd,
      p_provider_cost_brl,
      p_prompt_tokens,
      p_completion_tokens,
      p_provider_generation_id
    );
  end if;

  update public.personalized_lesson_generations
  set status = 'failed', error_code = p_error_code, finished_at = now()
  where id = p_generation_id;

  return cancellation || jsonb_build_object('generation_id', p_generation_id);
end;
$$;

revoke all on function public.complete_personalized_lesson_generation(
  uuid, text, numeric, numeric, numeric, numeric, bigint, bigint, bigint, bigint, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.fail_personalized_lesson_generation(
  uuid, text, numeric, numeric, bigint, bigint, text
) from public, anon, authenticated;

grant execute on function public.complete_personalized_lesson_generation(
  uuid, text, numeric, numeric, numeric, numeric, bigint, bigint, bigint, bigint, text, text, jsonb
) to service_role;
grant execute on function public.fail_personalized_lesson_generation(
  uuid, text, numeric, numeric, bigint, bigint, text
) to service_role;

comment on table public.personalized_lesson_configs is
  'Configuração privada e versionada das aulas personalizadas por IA.';
comment on table public.personalized_lesson_generations is
  'Versões imutáveis de conteúdo personalizado por aula e aluno.';

notify pgrst, 'reload schema';
