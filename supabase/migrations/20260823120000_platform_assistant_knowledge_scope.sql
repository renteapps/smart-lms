-- Escopo de conhecimento configurável do Assistente IA.
--
-- Até aqui o alcance era decidido só pela URL: dentro de /courses o assistente
-- via apenas aquele curso, fora dele via um resumo raso do catálogo. O admin
-- passa a escolher o modo global, quais fontes o agente pode ler e abrir
-- exceções por curso.

alter table public.platform_assistant_settings
  add column if not exists knowledge_mode text not null default 'adaptive',
  add column if not exists knowledge_sources jsonb not null default jsonb_build_object(
    'manual', true,
    'courses', true,
    'lessons', true,
    'transcriptions', true,
    'articles', true,
    'plans', true,
    'pilulas', true
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'platform_assistant_settings_knowledge_mode_check'
  ) then
    alter table public.platform_assistant_settings
      add constraint platform_assistant_settings_knowledge_mode_check
      check (knowledge_mode in ('course_strict', 'adaptive', 'platform_always'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'platform_assistant_settings_knowledge_sources_check'
  ) then
    alter table public.platform_assistant_settings
      add constraint platform_assistant_settings_knowledge_sources_check
      check (jsonb_typeof(knowledge_sources) = 'object');
  end if;
end
$$;

comment on column public.platform_assistant_settings.knowledge_mode is
  'course_strict: sempre preso ao curso aberto. adaptive: curso primeiro, complementa com a plataforma. platform_always: conhecimento global em qualquer tela.';
comment on column public.platform_assistant_settings.knowledge_sources is
  'Chaves booleanas: manual, courses, lessons, transcriptions, articles, plans, pilulas. Ausência de chave equivale a habilitado.';

-- Exceção por curso: sobrescreve o modo global apenas quando o chat é aberto
-- dentro daquele curso.
create table if not exists public.platform_assistant_course_rules (
  course_id uuid primary key references public.courses(id) on delete cascade,
  knowledge_mode text not null check (knowledge_mode in ('course_strict', 'adaptive', 'platform_always')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.platform_assistant_course_rules enable row level security;

-- A regra faz parte da configuração privada do assistente: só o servidor lê.
revoke all on table public.platform_assistant_course_rules from anon, authenticated;
grant all on table public.platform_assistant_course_rules to service_role;

comment on table public.platform_assistant_course_rules is
  'Sobrescreve o modo de conhecimento do Assistente IA para um curso específico.';
