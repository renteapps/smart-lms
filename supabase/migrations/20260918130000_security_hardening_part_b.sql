-- Hardening de segurança (auditoria 2026-09-18) — parte B.
--
-- APLICAR SOMENTE DEPOIS DO DEPLOY do código que acompanha esta migração:
-- ela remove leituras/escritas que o código antigo ainda faz com a sessão do
-- aluno (username via profiles, autores de comentário, nome no certificado,
-- quiz_results, colunas internas de agentes).

-- ---------------------------------------------------------------------------
-- C3. profiles deixa de ser público. Antes: `USING (true)` sem `TO`, então
-- qualquer visitante com a anon key baixava e-mail, telefone, nascimento,
-- gênero e cidade de todos os usuários.
-- ---------------------------------------------------------------------------
drop policy if exists "Perfis visíveis para todos" on public.profiles;

create policy "Perfil visível para o dono e admin" on public.profiles
  for select using ((select auth.uid()) = id or (select public.is_admin()));

-- Gestor B2B lê o perfil dos membros da própria organização (painel /empresa).
create policy "Gestor vê perfis dos membros" on public.profiles
  for select to authenticated using (
    exists (
      select 1
      from public.organization_members om
      where om.user_id = profiles.id
        and public.is_org_admin(om.organization_id)
    )
  );

-- Cartão público mínimo (autor de comentário etc.): só nome, usuário e foto,
-- e só para quem está logado.
create or replace view public.public_profiles
with (security_invoker = false) as
  select id, full_name, username, avatar_url
  from public.profiles;

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to authenticated;

-- Checagem de username no cadastro (visitante ainda sem conta).
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(btrim(p_username))
      and id is distinct from (select auth.uid())
  );
$function$;

revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Verificação pública de certificado: só o nome do titular daquele hash.
create or replace function public.certificate_holder_name(p_hash text)
returns text
language sql
stable security definer
set search_path to ''
as $function$
  select p.full_name
  from public.certificates c
  join public.profiles p on p.id = c.user_id
  where c.validation_hash = p_hash;
$function$;

revoke execute on function public.certificate_holder_name(text) from public;
grant execute on function public.certificate_holder_name(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- A2. Nota do quiz é calculada e gravada pelo servidor (service role).
-- ---------------------------------------------------------------------------
drop policy if exists "Users can insert their own quiz results" on public.quiz_results;
drop policy if exists "Users can update their own quiz results" on public.quiz_results;

-- ---------------------------------------------------------------------------
-- A10. Prompt, contexto, arquivos e roteiro interno dos agentes publicados
-- deixam de ser legíveis via PostgREST. O backend lê com service role.
-- ---------------------------------------------------------------------------
revoke select on public.agents from anon, authenticated;
grant select (
  id, slug, name, role, description, category, status, avatar, created_by,
  course_id, course_title, skills, rating, avg_minutes, greeting, starters,
  unavailable_note, is_published, order_index, created_at, updated_at,
  course_ids, plan_ids, theme_color, icon_svg, photo_url
) on public.agents to anon, authenticated;
