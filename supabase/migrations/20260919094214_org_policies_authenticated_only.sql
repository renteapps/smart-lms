-- Complemento de 20260919100000_performance_and_security_hardening.
--
-- Aquela migração revogou de `anon` o EXECUTE de is_org_admin, is_org_member
-- e is_any_org_admin. As policies abaixo chamam essas funções e valiam para
-- todos os papéis, então qualquer consulta de visitante a estas tabelas
-- passou a falhar com "permission denied for function" em vez de voltar
-- vazia — uma página pública que as tocasse daria erro 500.
--
-- Nenhuma delas faz sentido para visitante: restringir a `authenticated`
-- mantém o bloqueio das funções e devolve resultado vazio para `anon`.

alter policy "Chaves para gestores da org" on public.api_keys to authenticated;
alter policy "Auditoria para gestores" on public.audit_logs to authenticated;
alter policy "Gestores podem ler e gerenciar convites" on public.organization_invites to authenticated;
alter policy "Atribuições visíveis para a org" on public.organization_member_courses to authenticated;
alter policy "Gestores gerenciam membros" on public.organization_members to authenticated;
alter policy "Membros da mesma org podem ler" on public.organization_members to authenticated;
alter policy "Trilhas da org visíveis para membros" on public.organization_tracks to authenticated;
alter policy "Gestores gerenciam trilhas da org" on public.organization_tracks to authenticated;
alter policy "Membros e admins podem ler organização" on public.organizations to authenticated;
alter policy "Apenas gestores alteram organização" on public.organizations to authenticated;
alter policy "Assinatura visível para o dono" on public.subscriptions to authenticated;
