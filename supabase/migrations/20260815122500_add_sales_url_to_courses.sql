-- Adiciona o link de compra/checkout por curso.
-- Usado na vitrine da home para usuários sem matrícula ou plano ativo.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS sales_url TEXT;
