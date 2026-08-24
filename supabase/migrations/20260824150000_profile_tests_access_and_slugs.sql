-- Adiciona colunas para regras de acesso e slug
ALTER TABLE public.profile_tests
ADD COLUMN slug TEXT UNIQUE,
ADD COLUMN access_type TEXT NOT NULL DEFAULT 'logged_in', -- 'public', 'logged_in', 'course_owners', 'plan_owners'
ADD COLUMN required_course_ids UUID[] NOT NULL DEFAULT '{}',
ADD COLUMN required_plan_ids UUID[] NOT NULL DEFAULT '{}';

-- Gera slugs curtos para testes antigos
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
UPDATE public.profile_tests
SET slug = substr(md5(random()::text), 1, 8)
WHERE slug IS NULL;

-- Torna a coluna slug NOT NULL após a geração
ALTER TABLE public.profile_tests
ALTER COLUMN slug SET NOT NULL;
