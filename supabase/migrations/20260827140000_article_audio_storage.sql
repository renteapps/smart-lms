-- ============================================================================
-- MIGRAÇÃO: áudio dos artigos hospedado por nós
--
-- Até aqui o áudio de um artigo era uma URL colada à mão (Bunny CDN). O admin
-- agora envia o arquivo, que é comprimido no navegador e guardado no bucket
-- `article-audio`. A coluna `audio_peaks` guarda a envoltória (picos) calculada
-- durante essa conversão: é o que permite ao player desenhar a forma de onda
-- sem baixar e decodificar o arquivo inteiro no cliente.
-- ============================================================================

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS audio_peaks jsonb;

COMMENT ON COLUMN public.articles.audio_peaks IS
  'Envoltória do áudio: array de inteiros 0–100 (um por barra da forma de onda), gerado no upload.';

-- Bucket público, 100 MB — a 64 kbps mono isso são ~3,5 horas de narração.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-audio',
  'article-audio',
  true,
  104857600,
  ARRAY['audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Leitura pública: o áudio toca para visitantes do blog, sem sessão.
DROP POLICY IF EXISTS "Áudio de artigos visível para todos" ON storage.objects;
CREATE POLICY "Áudio de artigos visível para todos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'article-audio');

-- Escrita restrita a administradores da plataforma.
DROP POLICY IF EXISTS "Admins sobem áudio de artigos" ON storage.objects;
CREATE POLICY "Admins sobem áudio de artigos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'article-audio' AND public.is_admin());

DROP POLICY IF EXISTS "Admins alteram áudio de artigos" ON storage.objects;
CREATE POLICY "Admins alteram áudio de artigos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'article-audio' AND public.is_admin())
WITH CHECK (bucket_id = 'article-audio' AND public.is_admin());

-- Trocar o áudio de um artigo não deve deixar o arquivo antigo ocupando espaço.
DROP POLICY IF EXISTS "Admins removem áudio de artigos" ON storage.objects;
CREATE POLICY "Admins removem áudio de artigos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'article-audio' AND public.is_admin());
