-- ============================================================================
-- MIGRAÇÃO: Políticas de Storage para Fotos de Perfil (Avatares)
-- Permite upload, visualização, substituição e exclusão com segurança
-- ============================================================================

-- Garante existência do bucket público 'avatars'
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Leitura pública dos avatares
DROP POLICY IF EXISTS "Avatares visíveis para todos" ON storage.objects;
CREATE POLICY "Avatares visíveis para todos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Upload do próprio avatar (owner ou pasta do usuário)
DROP POLICY IF EXISTS "Usuário sobe próprio avatar" ON storage.objects;
CREATE POLICY "Usuário sobe próprio avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND (
    auth.uid() = owner OR 
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Atualização do próprio avatar
DROP POLICY IF EXISTS "Usuário altera próprio avatar" ON storage.objects;
CREATE POLICY "Usuário altera próprio avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND (
    auth.uid() = owner OR 
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Exclusão do próprio avatar (para otimizar armazenamento ao trocar/remover foto)
DROP POLICY IF EXISTS "Usuário deleta próprio avatar" ON storage.objects;
CREATE POLICY "Usuário deleta próprio avatar" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND (
    auth.uid() = owner OR 
    (storage.foldername(name))[1] = auth.uid()::text
  )
);
