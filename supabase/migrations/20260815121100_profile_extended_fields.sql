-- ============================================================================
-- MIGRAÇÃO: Campos adicionais de preferências e localização no perfil
-- ============================================================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS weekly_goal INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS lesson_reminders BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_digest BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS achievement_alerts BOOLEAN DEFAULT false;
