-- Corrige 20260919130000_rls_consolidation_and_indexes.
--
-- Aquela migração revogou de `authenticated` o EXECUTE de add_ai_credits e
-- publish_trail_questionnaire. Os dois são chamados com a sessão do admin
-- (src/app/admin/users/[id]/actions.ts e src/app/actions/admin/content.ts),
-- de propósito: a função lê auth.uid() para registrar o autor. Sem o grant,
-- "Adicionar créditos de IA" e "Publicar questionário" falham com
-- "permission denied". As funções já barram não-admin por dentro
-- (`if not is_admin() then raise`), então o grant não abre nada.
--
-- Atenção: `REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon` daquela
-- migração não tem efeito (o acesso vem do grant a PUBLIC) — e não deve ter:
-- as policies de catálogo público (courses, articles, plans, agents, pilulas)
-- chamam is_admin() para visitantes; sem o EXECUTE elas dariam erro.

grant execute on function public.add_ai_credits(uuid, integer) to authenticated;
grant execute on function public.publish_trail_questionnaire(jsonb, text) to authenticated;
