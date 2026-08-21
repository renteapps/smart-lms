-- Adiciona coluna de nome do coordenador/diretor para assinatura nos certificados de cursos
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS coordinator_name TEXT;
