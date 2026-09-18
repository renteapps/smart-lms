-- Hardening de segurança (auditoria 2026-09-18) — parte A.
--
-- Tudo aqui é compatível com o código já em produção: nenhuma leitura ou
-- escrita legítima do app depende das permissões removidas. As mudanças que
-- exigem código novo (perfis, quiz_results, colunas de agentes) ficam na
-- parte B, aplicada depois do deploy.

-- ---------------------------------------------------------------------------
-- C1. Matrícula só por admin, webhook de pagamento ou service role.
-- Antes: qualquer aluno inseria a própria matrícula ativa em qualquer curso
-- via PostgREST e destravava o conteúdo pago.
-- ---------------------------------------------------------------------------
drop policy if exists "Usuário insere própria matrícula" on public.enrollments;
drop policy if exists "Usuário deleta própria matrícula" on public.enrollments;

-- ---------------------------------------------------------------------------
-- C2. Certificados só são emitidos pelo trigger de conclusão (ou por admin).
-- ---------------------------------------------------------------------------
drop policy if exists "Apenas sistema gera certificados" on public.certificates;
create policy "Apenas sistema gera certificados" on public.certificates
  for insert with check ((select public.is_admin()));

-- O trigger roda como o dono da função para continuar emitindo sem a policy
-- de INSERT do aluno.
alter function public.issue_course_certificate_after_progress() security definer;
revoke execute on function public.issue_course_certificate_after_progress() from public, anon, authenticated;

-- Progresso só em aulas de cursos a que o aluno tem direito; sem isso, marcar
-- todas as aulas como concluídas via REST emitia o certificado.
drop policy if exists "Usuário altera próprio progresso" on public.lesson_progress;
create policy "Usuário altera próprio progresso" on public.lesson_progress
  for insert with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id = lesson_progress.lesson_id
        and m.course_id = any (public.user_entitled_course_ids())
    )
  );

drop policy if exists "Usuário atualiza próprio progresso" on public.lesson_progress;
create policy "Usuário atualiza próprio progresso" on public.lesson_progress
  for update
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id = lesson_progress.lesson_id
        and m.course_id = any (public.user_entitled_course_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- A4. profiles.email é espelho de auth.users (sync_profile_email) e é usado
-- para achar o comprador no webhook: o dono não pode reescrevê-lo.
-- ---------------------------------------------------------------------------
create or replace function public.protect_ai_credit_columns()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if (
    old.role is distinct from new.role
    or old.status is distinct from new.status
    or old.email is distinct from new.email
    or old.ai_credits is distinct from new.ai_credits
    or old.ai_weekly_credit_limit is distinct from new.ai_weekly_credit_limit
    or old.ai_monthly_credit_limit is distinct from new.ai_monthly_credit_limit
    or old.ai_weekly_credits_used is distinct from new.ai_weekly_credits_used
    or old.ai_monthly_credits_used is distinct from new.ai_monthly_credits_used
    or old.ai_weekly_period_started_at is distinct from new.ai_weekly_period_started_at
    or old.ai_monthly_period_started_at is distinct from new.ai_monthly_period_started_at
  )
  and current_user not in ('postgres', 'supabase_admin', 'service_role')
  and not (select public.is_admin()) then
    raise insufficient_privilege using message = 'Somente administradores podem alterar permissões, e-mail ou créditos de IA.';
  end if;

  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- A1. Moderação de comentários: aluno sempre entra como pendente, não muda o
-- próprio status e volta para a fila se editar o texto. Só comenta em aula a
-- que tem acesso.
-- ---------------------------------------------------------------------------
create or replace function public.protect_comment_status()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') or (select public.is_admin()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
  elsif new.status is distinct from old.status then
    raise insufficient_privilege using message = 'Somente administradores moderam comentários.';
  elsif new.content is distinct from old.content then
    new.status := 'pending';
  end if;

  return new;
end;
$function$;

revoke execute on function public.protect_comment_status() from public, anon, authenticated;

drop trigger if exists protect_comment_status on public.comments;
create trigger protect_comment_status
  before insert or update on public.comments
  for each row execute function public.protect_comment_status();

drop policy if exists "Aluno escreve próprio comentário" on public.comments;
create policy "Aluno escreve próprio comentário" on public.comments
  for insert with check (
    (select auth.uid()) = user_id
    and (
      (select public.is_admin())
      or exists (
        select 1
        from public.lessons l
        join public.modules m on m.id = l.module_id
        where l.id = comments.lesson_id
          and m.course_id = any (public.user_entitled_course_ids())
      )
    )
  );

-- A policy de leitura consultava a própria tabela para achar o autor do
-- comentário-pai e dava "infinite recursion" para todo não-admin: nenhum aluno
-- conseguia ler comentários. O helper roda como dono e devolve só um booleano.
create or replace function public.is_own_comment(p_comment_id uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.comments
    where id = p_comment_id and user_id = (select auth.uid())
  );
$function$;

revoke execute on function public.is_own_comment(uuid) from public, anon;
grant execute on function public.is_own_comment(uuid) to authenticated;

drop policy if exists "Comentários visíveis para matriculados" on public.comments;
create policy "Comentários visíveis para matriculados" on public.comments
  for select to authenticated using (
    status = 'published'
    or (select auth.uid()) = user_id
    or (select public.is_admin())
    or (parent_id is not null and public.is_own_comment(parent_id))
  );

drop policy if exists "Aluno edita próprio comentário" on public.comments;
create policy "Aluno edita próprio comentário" on public.comments
  for update
  using ((select auth.uid()) = user_id or (select public.is_admin()))
  with check ((select auth.uid()) = user_id or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- A2 (parcial). Quizzes deixam de ser públicos: só quem tem acesso à aula lê.
-- As policies de admin comparavam auth.jwt()->>'role' (sempre 'authenticated')
-- e nunca casavam.
-- ---------------------------------------------------------------------------
drop policy if exists "Quizzes are viewable by everyone" on public.quizzes;
create policy "Quiz visível para quem acessa a aula" on public.quizzes
  for select to authenticated using (
    (select public.is_admin())
    or exists (
      select 1
      from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.quiz_id = quizzes.id
        and m.course_id = any (public.user_entitled_course_ids())
    )
  );

drop policy if exists "Admins can insert quizzes" on public.quizzes;
drop policy if exists "Admins can update quizzes" on public.quizzes;
drop policy if exists "Admins can delete quizzes" on public.quizzes;
create policy "Admins gerenciam quizzes" on public.quizzes
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Admins can view all quiz results" on public.quiz_results;
create policy "Admins leem resultados de quiz" on public.quiz_results
  for select using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- M1. Interações com pílulas: cada aluno lê só as próprias; admin lê tudo.
-- ---------------------------------------------------------------------------
drop policy if exists "Interações visíveis para admin e dono" on public.pilula_interactions;
create policy "Interações visíveis para admin e dono" on public.pilula_interactions
  for select using ((select auth.uid()) = user_id or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- M2. Auditoria: ninguém grava entrada em nome de outra pessoa.
-- ---------------------------------------------------------------------------
drop policy if exists "Permitir inserção em audit_logs para usuários autenticados" on public.audit_logs;
create policy "Usuário registra a própria ação" on public.audit_logs
  for insert with check (
    (select auth.uid()) is not null
    and (actor_id = (select auth.uid()) or (select public.is_admin()))
  );

-- ---------------------------------------------------------------------------
-- M3. Gestor B2B edita dados cadastrais da organização, nunca o contrato.
-- ---------------------------------------------------------------------------
create or replace function public.protect_organization_contract()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if (
    old.slug is distinct from new.slug
    or old.status is distinct from new.status
    or old.is_active is distinct from new.is_active
    or old.plan_type is distinct from new.plan_type
    or old.plan_tier is distinct from new.plan_tier
    or old.max_seats is distinct from new.max_seats
    or old.contract_start is distinct from new.contract_start
    or old.contract_end is distinct from new.contract_end
    or old.contract_value is distinct from new.contract_value
    or old.allowed_domains is distinct from new.allowed_domains
    or old.auto_domain_approval is distinct from new.auto_domain_approval
  )
  and current_user not in ('postgres', 'supabase_admin', 'service_role')
  and not (select public.is_admin()) then
    raise insufficient_privilege using message = 'Somente administradores alteram o contrato da organização.';
  end if;

  return new;
end;
$function$;

revoke execute on function public.protect_organization_contract() from public, anon, authenticated;

drop trigger if exists protect_organization_contract on public.organizations;
create trigger protect_organization_contract
  before update on public.organizations
  for each row execute function public.protect_organization_contract();

-- ---------------------------------------------------------------------------
-- A3. course_progress lia o progresso de qualquer usuário, inclusive anônimo.
-- O app não chama a função (usa v_user_course_progress).
-- ---------------------------------------------------------------------------
create or replace function public.course_progress(p_user_id uuid, p_course_id uuid)
returns integer
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  total integer;
  done integer;
begin
  if p_user_id is distinct from (select auth.uid()) and not (select public.is_admin()) then
    raise insufficient_privilege using message = 'Você não pode consultar o progresso deste usuário.';
  end if;

  select count(*) into total
  from public.lessons l
  join public.modules m on l.module_id = m.id
  where m.course_id = p_course_id and l.is_published = true;

  if total = 0 then return 0; end if;

  select count(*) into done
  from public.lesson_progress lp
  join public.lessons l on lp.lesson_id = l.id
  join public.modules m on l.module_id = m.id
  where m.course_id = p_course_id
    and lp.user_id = p_user_id
    and lp.is_completed = true;

  return round((done::numeric / total) * 100);
end;
$function$;

revoke execute on function public.course_progress(uuid, uuid) from public, anon;

-- ---------------------------------------------------------------------------
-- Funções de trigger/event trigger não são API: tira do /rest/v1/rpc.
-- (EXECUTE só é checado na criação do trigger, não quando ele dispara.)
-- ---------------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_profile_email() from public, anon, authenticated;
revoke execute on function public.sync_profile_role_to_app_metadata() from public, anon, authenticated;
revoke execute on function public.seed_gallery_course_module() from public, anon, authenticated;
revoke execute on function public.enforce_single_gallery_module() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.protect_ai_credit_columns() from public, anon, authenticated;

alter function public.is_company_manager(uuid) set search_path to '';
alter function public.touch_updated_at() set search_path to '';
alter function public.reorder_modules(uuid, uuid[]) set search_path to '';
alter function public.reorder_lessons(uuid, uuid[]) set search_path to '';

-- ---------------------------------------------------------------------------
-- A6. Storage.
-- * Escrita em material de aula e assets públicos só por admin (antes qualquer
--   gestor de qualquer organização B2B sobrescrevia arquivos de todos os cursos).
-- * Buckets públicos servem por URL sem precisar de policy de SELECT; a policy
--   ampla só servia para LISTAR o bucket inteiro (enumerar material pago).
--   Fica só o SELECT de admin, necessário para remove/overwrite.
-- * Avatar só na pasta do próprio usuário, e só imagem.
-- ---------------------------------------------------------------------------
drop policy if exists "Admins e Gestores sobem materiais" on storage.objects;
drop policy if exists "Admins e Gestores alteram materiais" on storage.objects;
drop policy if exists "Admins e Gestores removem materiais" on storage.objects;
drop policy if exists "Materiais públicos visíveis para todos" on storage.objects;
create policy "Admins gerenciam materiais" on storage.objects
  for all to authenticated
  using (bucket_id = 'lesson-materials' and (select public.is_admin()))
  with check (bucket_id = 'lesson-materials' and (select public.is_admin()));

drop policy if exists "Admins e Gestores sobem assets públicos" on storage.objects;
drop policy if exists "Admins e Gestores alteram assets públicos" on storage.objects;
drop policy if exists "Admins e Gestores removem assets públicos" on storage.objects;
drop policy if exists "Assets públicos visíveis para todos" on storage.objects;
create policy "Admins gerenciam assets públicos" on storage.objects
  for all to authenticated
  using (bucket_id = 'public-assets' and (select public.is_admin()))
  with check (bucket_id = 'public-assets' and (select public.is_admin()));

drop policy if exists "Áudio de artigos visível para todos" on storage.objects;
create policy "Admins leem áudio de artigos" on storage.objects
  for select to authenticated
  using (bucket_id = 'article-audio' and (select public.is_admin()));

drop policy if exists "Avatares visíveis para todos" on storage.objects;
drop policy if exists "Usuário sobe próprio avatar" on storage.objects;
drop policy if exists "Usuário altera próprio avatar" on storage.objects;
drop policy if exists "Usuário deleta próprio avatar" on storage.objects;
create policy "Usuário gerencia próprio avatar" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

update storage.buckets
  set allowed_mime_types = array['image/webp', 'image/png', 'image/jpeg', 'image/gif'],
      file_size_limit = 5242880
  where id = 'avatars';
