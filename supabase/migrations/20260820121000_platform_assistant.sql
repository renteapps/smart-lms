-- Assistente IA contextual da plataforma.
-- Mantido separado das tabelas agent_* para preservar os Agentes de IA existentes.

create table if not exists public.platform_assistant_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default true,
  display_name text not null default 'Assistente IA' check (char_length(display_name) between 1 and 60),
  avatar_type text not null default 'icon' check (avatar_type in ('icon', 'photo')),
  icon_key text not null default 'sparkles' check (icon_key in ('sparkles', 'bot', 'message', 'brain', 'graduation', 'headset')),
  avatar_url text,
  primary_color text not null default '#3157B7' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  welcome_message text not null default 'Olá! Como posso ajudar você hoje?' check (char_length(welcome_message) <= 500),
  system_prompt text not null default 'Ajude o aluno com clareza, objetividade e linguagem acolhedora. Quando útil, organize a resposta em passos curtos.',
  model text not null default 'google/gemini-2.0-flash-001',
  platform_knowledge text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('platform', 'course')),
  context_key text not null,
  course_id uuid references public.courses(id) on delete cascade,
  last_lesson_id uuid references public.lessons(id) on delete set null,
  title text not null default 'Nova conversa' check (char_length(title) between 1 and 160),
  in_flight boolean not null default false,
  processing_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_assistant_conversations_context_check check (
    (scope = 'platform' and context_key = 'platform' and course_id is null)
    or
    (scope = 'course' and course_id is not null and context_key = course_id::text)
  ),
  constraint platform_assistant_conversations_user_context_key unique (user_id, context_key)
);

create table if not exists public.platform_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.platform_assistant_conversations(id) on delete cascade,
  author text not null check (author in ('user', 'assistant')),
  content text not null check (
    char_length(content) >= 1
    and ((author = 'user' and char_length(content) <= 4000) or (author = 'assistant' and char_length(content) <= 16000))
  ),
  model text,
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  context_sources jsonb not null default '[]'::jsonb check (jsonb_typeof(context_sources) = 'array'),
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_assistant_conversations_user_updated
  on public.platform_assistant_conversations (user_id, updated_at desc);
create index if not exists idx_platform_assistant_conversations_course_updated
  on public.platform_assistant_conversations (course_id, updated_at desc);
create index if not exists idx_platform_assistant_conversations_updated
  on public.platform_assistant_conversations (updated_at desc);
create index if not exists idx_platform_assistant_conversations_last_lesson
  on public.platform_assistant_conversations (last_lesson_id)
  where last_lesson_id is not null;
create index if not exists idx_platform_assistant_messages_conversation_created
  on public.platform_assistant_messages (conversation_id, created_at);
create index if not exists idx_platform_assistant_messages_user_rate_limit
  on public.platform_assistant_messages (conversation_id, created_at desc)
  where author = 'user';

insert into public.platform_assistant_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.platform_assistant_settings enable row level security;
alter table public.platform_assistant_conversations enable row level security;
alter table public.platform_assistant_messages enable row level security;

-- A configuração contém prompt e base privados: nunca é lida diretamente pelo navegador.
revoke all on table public.platform_assistant_settings from anon, authenticated;
revoke all on table public.platform_assistant_conversations from anon, authenticated;
revoke all on table public.platform_assistant_messages from anon, authenticated;

grant all on table public.platform_assistant_settings to service_role;
grant all on table public.platform_assistant_conversations to service_role;
grant all on table public.platform_assistant_messages to service_role;

-- A Data API exige grants explícitos. Usuários autenticados só podem ler seu histórico.
grant select on table public.platform_assistant_conversations to authenticated;
grant select on table public.platform_assistant_messages to authenticated;

drop policy if exists "Usuários leem as próprias conversas do assistente" on public.platform_assistant_conversations;
create policy "Usuários leem as próprias conversas do assistente"
  on public.platform_assistant_conversations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Usuários leem as próprias mensagens do assistente" on public.platform_assistant_messages;
create policy "Usuários leem as próprias mensagens do assistente"
  on public.platform_assistant_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.platform_assistant_conversations conversation
      where conversation.id = platform_assistant_messages.conversation_id
        and conversation.user_id = (select auth.uid())
    )
  );

comment on table public.platform_assistant_settings is 'Configuração global e privada do Assistente IA da plataforma.';
comment on table public.platform_assistant_conversations is 'Uma conversa por usuário na plataforma e uma por curso.';
comment on table public.platform_assistant_messages is 'Histórico auditável do Assistente IA, persistido até exclusão administrativa.';
