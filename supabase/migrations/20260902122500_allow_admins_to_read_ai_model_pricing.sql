-- O editor de aulas personalizadas valida o modelo usando a sessão autenticada
-- quando a service role não está configurada. A permissão de tabela habilita a
-- consulta pela Data API; a RLS continua limitando os dados a administradores.

grant select on table public.ai_model_pricing to authenticated;

drop policy if exists "Admins leem modelos de IA habilitados" on public.ai_model_pricing;
create policy "Admins leem modelos de IA habilitados"
  on public.ai_model_pricing
  for select
  to authenticated
  using ((select public.is_admin()));

notify pgrst, 'reload schema';

