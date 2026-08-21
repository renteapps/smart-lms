-- Migration para criar bucket de materiais das aulas
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'lesson-materials',
  'lesson-materials',
  true,
  52428800 -- 50 MB
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = NULL;

-- Políticas de acesso
CREATE POLICY "Materiais públicos visíveis para todos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'lesson-materials');

CREATE POLICY "Admins e Gestores sobem materiais" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lesson-materials' AND (public.is_admin() OR public.is_any_org_admin()));

CREATE POLICY "Admins e Gestores alteram materiais" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'lesson-materials' AND (public.is_admin() OR public.is_any_org_admin()))
WITH CHECK (bucket_id = 'lesson-materials' AND (public.is_admin() OR public.is_any_org_admin()));

CREATE POLICY "Admins e Gestores removem materiais" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'lesson-materials' AND (public.is_admin() OR public.is_any_org_admin()));
