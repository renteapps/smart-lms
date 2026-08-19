-- ============================================================================
-- MIGRAÇÃO: Correção de Políticas de Storage
-- Corrige o problema "new row violates row-level security policy"
-- 1. Garante que owner_id e owner sejam verificados nos avatares
-- 2. Permite que gestores de organização enviem assets públicos (capas, etc)
-- ============================================================================

-- Função para checar se o usuário é gestor de ALGUMA organização
CREATE OR REPLACE FUNCTION public.is_any_org_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Atualiza políticas de public-assets para permitir admins E gestores
DROP POLICY IF EXISTS "Admins sobem assets públicos" ON storage.objects;
DROP POLICY IF EXISTS "Admins e Gestores sobem assets públicos" ON storage.objects;
CREATE POLICY "Admins e Gestores sobem assets públicos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'public-assets' AND (public.is_admin() OR public.is_any_org_admin()));

DROP POLICY IF EXISTS "Admins alteram assets públicos" ON storage.objects;
DROP POLICY IF EXISTS "Admins e Gestores alteram assets públicos" ON storage.objects;
CREATE POLICY "Admins e Gestores alteram assets públicos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'public-assets' AND (public.is_admin() OR public.is_any_org_admin()))
WITH CHECK (bucket_id = 'public-assets' AND (public.is_admin() OR public.is_any_org_admin()));

DROP POLICY IF EXISTS "Admins removem assets públicos" ON storage.objects;
DROP POLICY IF EXISTS "Admins e Gestores removem assets públicos" ON storage.objects;
CREATE POLICY "Admins e Gestores removem assets públicos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'public-assets' AND (public.is_admin() OR public.is_any_org_admin()));

-- Atualiza políticas de avatars para suportar owner_id corretamente
DROP POLICY IF EXISTS "Usuário sobe próprio avatar" ON storage.objects;
CREATE POLICY "Usuário sobe próprio avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND (
    auth.uid() = owner OR 
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Usuário altera próprio avatar" ON storage.objects;
CREATE POLICY "Usuário altera próprio avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND (
    auth.uid() = owner OR 
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Usuário deleta próprio avatar" ON storage.objects;
CREATE POLICY "Usuário deleta próprio avatar" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND (
    auth.uid() = owner OR 
    (storage.foldername(name))[1] = auth.uid()::text
  )
);
