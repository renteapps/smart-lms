-- Permite que usuários autenticados (ou admins) possam inserir logs de auditoria
CREATE POLICY "Permitir inserção em audit_logs para usuários autenticados" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);
