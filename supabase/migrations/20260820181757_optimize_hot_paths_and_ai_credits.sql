-- Índices alinhados aos caminhos quentes medidos na aplicação.
create index if not exists courses_published_order_created_idx
  on public.courses (order_index, created_at desc)
  where is_published = true;

create index if not exists modules_course_order_idx
  on public.modules (course_id, order_index);

create index if not exists lessons_module_published_order_idx
  on public.lessons (module_id, is_published, order_index);

create index if not exists attachments_lesson_idx
  on public.attachments (lesson_id);

create index if not exists lesson_progress_completed_user_lesson_idx
  on public.lesson_progress (user_id, lesson_id)
  where is_completed = true;

create index if not exists agent_conversations_user_updated_id_idx
  on public.agent_conversations (user_id, updated_at desc, id desc);

-- Débito atômico: não lê o saldo antes de atualizar e nunca permite negativo.
create or replace function public.consume_ai_credit()
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  with consumed as (
    update public.profiles
       set ai_credits = ai_credits - 1
     where id = (select auth.uid())
       and ai_credits > 0
    returning ai_credits
  )
  select coalesce((select ai_credits from consumed), -1);
$$;

revoke all on function public.consume_ai_credit() from public, anon;
grant execute on function public.consume_ai_credit() to authenticated, service_role;

-- Mesmas permissões existentes, evitando reavaliar auth.uid()/is_admin() por linha.
drop policy if exists "Usuário lê próprias matrículas" on public.enrollments;
create policy "Usuário lê próprias matrículas" on public.enrollments
  for select using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists "Usuário insere própria matrícula" on public.enrollments;
create policy "Usuário insere própria matrícula" on public.enrollments
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Usuário deleta própria matrícula" on public.enrollments;
create policy "Usuário deleta própria matrícula" on public.enrollments
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "Usuário lê próprio progresso" on public.lesson_progress;
create policy "Usuário lê próprio progresso" on public.lesson_progress
  for select using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists "Usuário altera próprio progresso" on public.lesson_progress;
create policy "Usuário altera próprio progresso" on public.lesson_progress
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Usuário atualiza próprio progresso" on public.lesson_progress;
create policy "Usuário atualiza próprio progresso" on public.lesson_progress
  for update using ((select auth.uid()) = user_id);

drop policy if exists "Aluno gerencia próprias conversas" on public.agent_conversations;
create policy "Aluno gerencia próprias conversas" on public.agent_conversations
  for all
  using ((select auth.uid()) = user_id or (select public.is_admin()))
  with check ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists "Mensagens seguem a conversa" on public.agent_messages;
create policy "Mensagens seguem a conversa" on public.agent_messages
  for all
  using (
    (select public.is_admin()) or exists (
      select 1 from public.agent_conversations c
      where c.id = agent_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    (select public.is_admin()) or exists (
      select 1 from public.agent_conversations c
      where c.id = agent_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Módulos visíveis apenas para alunos matriculados ou admin" on public.modules;
create policy "Módulos visíveis apenas para alunos matriculados ou admin" on public.modules
  for select to authenticated
  using (
    (select public.is_admin()) or exists (
      select 1 from public.enrollments e
      where e.course_id = modules.course_id
        and e.user_id = (select auth.uid())
        and e.status = 'active'
        and (e.expires_at is null or e.expires_at > now())
    )
  );

drop policy if exists "Aulas visíveis apenas para alunos matriculados ou admin" on public.lessons;
create policy "Aulas visíveis apenas para alunos matriculados ou admin" on public.lessons
  for select to authenticated
  using (
    (select public.is_admin()) or exists (
      select 1
      from public.modules m
      join public.enrollments e on e.course_id = m.course_id
      where m.id = lessons.module_id
        and e.user_id = (select auth.uid())
        and e.status = 'active'
        and (e.expires_at is null or e.expires_at > now())
    )
  );

drop policy if exists "Anexos seguem a aula" on public.attachments;
create policy "Anexos seguem a aula" on public.attachments
  for select to authenticated
  using (
    (select public.is_admin()) or exists (
      select 1
      from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.enrollments e on e.course_id = m.course_id
      where l.id = attachments.lesson_id
        and e.user_id = (select auth.uid())
        and e.status = 'active'
        and (e.expires_at is null or e.expires_at > now())
    )
  );
