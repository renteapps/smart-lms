-- Pendências da auditoria de segurança (2026-09-19).
--
-- APLICAR DEPOIS DO DEPLOY do código que acompanha esta migração: com o
-- bucket privado, o link antigo dos materiais (URL pública direta) para de
-- abrir; o código novo passa por /api/materiais/[id], que assina a URL.

-- ---------------------------------------------------------------------------
-- Logout forçado pelo suporte (/admin/users/[id]). `auth.admin.signOut`
-- espera o JWT da sessão, não o id do usuário, então a action nunca deslogava
-- ninguém. Apagar as sessões derruba os refresh tokens (FK em cascata) e o
-- getUser() do app passa a recusar o access token na próxima requisição.
-- ---------------------------------------------------------------------------
create or replace function public.admin_revoke_user_sessions(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  revoked integer;
begin
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics revoked = row_count;
  return revoked;
end;
$function$;

-- Só o service role (a action checa admin antes de chamar).
revoke execute on function public.admin_revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.admin_revoke_user_sessions(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Material complementar de curso pago deixa de ser público: o download passa
-- por /api/materiais/[attachmentId], que confere o acesso ao curso (RLS de
-- attachments) e devolve uma URL assinada de 60 s.
-- ---------------------------------------------------------------------------
update storage.buckets set public = false where id = 'lesson-materials';
