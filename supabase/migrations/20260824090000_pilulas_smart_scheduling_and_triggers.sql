-- Migration: 20260824090000_pilulas_smart_scheduling_and_triggers.sql
-- Adiciona colunas para agendamento inteligente, gatilhos de cadastro e tags de onboarding em pilulas

ALTER TABLE public.pilulas
  ADD COLUMN IF NOT EXISTS days_after_signup INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_tags TEXT[] DEFAULT '{}';

-- Adiciona colunas para controle de descarte/fechamento em pilula_interactions
ALTER TABLE public.pilula_interactions
  ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ DEFAULT NULL;

-- Garante índices para consultas rápidas de entrega ao aluno
CREATE INDEX IF NOT EXISTS idx_pilulas_status_publish ON public.pilulas(status, publish_date);
CREATE INDEX IF NOT EXISTS idx_pilula_interactions_user ON public.pilula_interactions(user_id, pilula_id);
