-- ============================================================================
-- Migração: Adiciona sales_page_url e sales_config à tabela courses
-- Permite armazenar a landing page do curso e a configuração de integrações/ofertas
-- ============================================================================

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS sales_page_url TEXT,
  ADD COLUMN IF NOT EXISTS sales_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.courses.sales_page_url IS 'URL da landing page institucional descritiva do curso';
COMMENT ON COLUMN public.courses.sales_config IS 'Configurações de vendas, plataforma principal e múltiplas ofertas/checkouts com tags dinâmicas';
