-- ============================================================================
-- Migration: drop_zombie_companies_and_move_vector
-- 1. Move extensão vector do schema public para extensions
-- 2. Remove tabelas órfãs/zumbis (companies, company_members, company_invites)
-- 3. Cobre as foreign keys restantes alertadas pelo linter
-- ============================================================================

-- 1. Schema extensions e extensão vector
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- 2. Remoção das tabelas legadas (já substituídas por organizations)
DROP TABLE IF EXISTS public.company_invites CASCADE;
DROP TABLE IF EXISTS public.company_members CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- 3. Índices de cobertura restantes para foreign keys
CREATE INDEX IF NOT EXISTS idx_page_builder_drafts_updated_by ON public.page_builder_drafts(updated_by);
CREATE INDEX IF NOT EXISTS idx_personalized_lesson_configs_model ON public.personalized_lesson_configs(model);
CREATE INDEX IF NOT EXISTS idx_personalized_lesson_drafts_model ON public.personalized_lesson_drafts(model);
CREATE INDEX IF NOT EXISTS idx_platform_assistant_course_rules_updated_by ON public.platform_assistant_course_rules(updated_by);
CREATE INDEX IF NOT EXISTS idx_platform_assistant_settings_updated_by ON public.platform_assistant_settings(updated_by);
