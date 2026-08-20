-- ============================================================================
-- Migração: Policies de storage para o bucket `secure-documents`
-- ============================================================================
-- O bucket já existia (criado em 20260815102600_initial_schema.sql) mas nunca
-- ganhou policies em `storage.objects` — RLS bloqueava qualquer upload/leitura,
-- por isso a base de conhecimento (RAG) dos agentes de IA não conseguia subir
-- arquivo nenhum.

DROP POLICY IF EXISTS "Admins gerenciam documentos seguros" ON storage.objects;
CREATE POLICY "Admins gerenciam documentos seguros" ON storage.objects
  FOR ALL USING (bucket_id = 'secure-documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'secure-documents' AND public.is_admin());
