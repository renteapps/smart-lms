-- Migration: Agendamento de posts do blog e políticas de visibilidade temporal
-- 1. Atualizar a política de RLS para que artigos agendados só fiquem visíveis ao público após published_at
DROP POLICY IF EXISTS "Artigos publicados são públicos" ON public.articles;
CREATE POLICY "Artigos publicados são públicos" ON public.articles
  FOR SELECT USING (
    (is_published = true AND published_at <= timezone('utc'::text, now()))
    OR public.is_admin()
  );

-- 2. Índice composto para aceleração de consultas públicas com filtro temporal
CREATE INDEX IF NOT EXISTS idx_articles_published_schedule
  ON public.articles (is_published, published_at DESC);

-- 3. Comentário descritivo na tabela
COMMENT ON COLUMN public.articles.published_at IS 'Data e hora (timestamptz) de publicação. Se is_published=true e published_at for futuro, o artigo fica em estado Agendado.';
