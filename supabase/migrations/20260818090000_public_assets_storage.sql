-- ============================================================================
-- MIGRAÇÃO: Políticas de Storage para o bucket 'public-assets'
-- O bucket já era criado no schema inicial, mas nunca recebeu policies em
-- storage.objects — na prática, todo upload nele falhava. Este é o bucket usado
-- pelo componente ImageUpload para capas de curso, logos, banners e branding.
-- ============================================================================

-- Garante o bucket público com limite de 5 MB e apenas tipos de imagem.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  5242880,
  ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Leitura pública: as imagens aparecem para alunos e visitantes.
DROP POLICY IF EXISTS "Assets públicos visíveis para todos" ON storage.objects;
CREATE POLICY "Assets públicos visíveis para todos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'public-assets');

-- Escrita restrita a administradores da plataforma.
DROP POLICY IF EXISTS "Admins sobem assets públicos" ON storage.objects;
CREATE POLICY "Admins sobem assets públicos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'public-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admins alteram assets públicos" ON storage.objects;
CREATE POLICY "Admins alteram assets públicos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'public-assets' AND public.is_admin())
WITH CHECK (bucket_id = 'public-assets' AND public.is_admin());

-- Exclusão para que trocar uma imagem não deixe o arquivo antigo ocupando espaço.
DROP POLICY IF EXISTS "Admins removem assets públicos" ON storage.objects;
CREATE POLICY "Admins removem assets públicos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'public-assets' AND public.is_admin());
