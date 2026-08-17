--------------------------------------------------------------------------------
-- SMART LMS — SCHEMA COMPLETO DA PLATAFORMA
--
-- Cobre todos os domínios que até aqui viviam em mocks e localStorage:
-- agentes, pílulas, testes de perfil, trilhas, blog, e-mails, integrações,
-- automações, notificações, planos, B2B e ajustes.
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
-- 0. UTILITÁRIOS
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------------------------------------
-- 1. AJUSTES NAS TABELAS EXISTENTES
--------------------------------------------------------------------------------

-- profiles: e-mail espelhado (o admin lista usuários sem service role),
-- último acesso e status de bloqueio.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
-- Campos que o editor de perfil e o AuthContext já liam, mas não existiam.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS career_role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);

-- courses: campos que o catálogo e o admin já exibiam.
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- lessons: metadados de SEO que o editor do admin já escrevia.
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

-- student_notes: passa a guardar também anotações de agente e pessoais,
-- que não têm aula associada.
ALTER TABLE public.student_notes ALTER COLUMN lesson_id DROP NOT NULL;
ALTER TABLE public.student_notes DROP CONSTRAINT IF EXISTS student_notes_user_id_lesson_id_key;
ALTER TABLE public.student_notes ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'lesson';
ALTER TABLE public.student_notes ADD COLUMN IF NOT EXISTS agent_id UUID;
ALTER TABLE public.student_notes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.student_notes ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE public.student_notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS student_notes_user_lesson_key
  ON public.student_notes (user_id, lesson_id)
  WHERE lesson_id IS NOT NULL AND kind = 'lesson';

-- plans: preço e periodicidade que a tela de planos já mostrava.
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS frequency public.plan_frequency DEFAULT 'monthly';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS seats INTEGER;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS plans_slug_key ON public.plans (slug) WHERE slug IS NOT NULL;

-- subscriptions: valor e origem, usados pelas análises de vendas.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS gateway TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS gateway_subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

-- organizations: contrato corporativo completo.
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS trade_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS auto_domain_approval BOOLEAN DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS manager_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS manager_email TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS manager_phone TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'mensal';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contract_start DATE;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contract_end DATE;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contract_value NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS departments TEXT[] DEFAULT '{}';

-- organization_members: dados de convite e último acesso.
ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMPTZ;
ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS notes TEXT;

-- organization_invites: nome de quem foi convidado.
ALTER TABLE public.organization_invites ADD COLUMN IF NOT EXISTS full_name TEXT;

--------------------------------------------------------------------------------
-- 2. AGENTES DE IA
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Comunicação',
  status TEXT NOT NULL DEFAULT 'Disponível',
  avatar TEXT NOT NULL DEFAULT 'tutor',
  created_by TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  course_title TEXT,
  skills TEXT[] DEFAULT '{}',
  rating NUMERIC(3,2) DEFAULT 0,
  avg_minutes INTEGER DEFAULT 0,
  greeting TEXT DEFAULT '',
  starters JSONB DEFAULT '[]'::jsonb,
  replies JSONB DEFAULT '[]'::jsonb,
  fallbacks JSONB DEFAULT '[]'::jsonb,
  files JSONB DEFAULT '[]'::jsonb,
  unavailable_note TEXT,
  system_prompt TEXT,
  ai_model TEXT,
  context TEXT,
  is_published BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  rating INTEGER,
  status TEXT DEFAULT 'em_andamento',
  sentiment TEXT DEFAULT 'neutro',
  duration_seconds INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  course_title TEXT,
  lesson_context TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS agent_conversations_user_idx ON public.agent_conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS agent_conversations_agent_idx ON public.agent_conversations (agent_id);

CREATE TABLE IF NOT EXISTS public.agent_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.agent_conversations(id) ON DELETE CASCADE NOT NULL,
  author TEXT NOT NULL CHECK (author IN ('student', 'agent')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS agent_messages_conversation_idx ON public.agent_messages (conversation_id, created_at);

--------------------------------------------------------------------------------
-- 3. PÍLULAS DE CONHECIMENTO
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pilulas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Geral',
  format TEXT NOT NULL DEFAULT 'texto',
  summary TEXT NOT NULL DEFAULT '',
  challenge TEXT NOT NULL DEFAULT '',
  estimated_minutes INTEGER NOT NULL DEFAULT 3,
  media_url TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  course_title TEXT,
  publish_date DATE,
  status TEXT NOT NULL DEFAULT 'Rascunho',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Uma linha por aluno/pílula: os contadores da UI são COUNT() daqui,
-- e não inteiros que dessincronizam.
CREATE TABLE IF NOT EXISTS public.pilula_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pilula_id UUID REFERENCES public.pilulas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  liked BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (pilula_id, user_id)
);

--------------------------------------------------------------------------------
-- 4. TESTES DE PERFIL
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  result_type TEXT DEFAULT 'single',
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profile_test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES public.profile_tests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_title TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (test_id, user_id)
);

-- lessons.profile_test_id era TEXT solto; vira referência de verdade.
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS profile_test_ref UUID REFERENCES public.profile_tests(id) ON DELETE SET NULL;

--------------------------------------------------------------------------------
-- 5. TRILHA PERSONALIZADA E ONBOARDING
--------------------------------------------------------------------------------

-- Questionário versionado. Só uma versão publicada por vez.
CREATE TABLE IF NOT EXISTS public.trail_questionnaires (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (version)
);
CREATE UNIQUE INDEX IF NOT EXISTS trail_questionnaires_single_published
  ON public.trail_questionnaires ((status)) WHERE status = 'published';

-- Telemetria da trilha (antes em @smartlms:trail-analytics).
CREATE TABLE IF NOT EXISTS public.trail_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS trail_events_user_idx ON public.trail_events (user_id, occurred_at DESC);

-- Estado das micro-pesquisas de recalibração.
CREATE TABLE IF NOT EXISTS public.student_refinements (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  answered_at JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at_last_survey INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Metadados pedagógicos das aulas usados pelo motor de matching.
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS solves TEXT[] DEFAULT '{}';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'iniciante';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS audience TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS prerequisites TEXT[] DEFAULT '{}';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_eligible_for_trail BOOLEAN DEFAULT true;

--------------------------------------------------------------------------------
-- 6. BLOG
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  cover TEXT,
  category TEXT NOT NULL DEFAULT 'Geral',
  author TEXT NOT NULL DEFAULT 'Equipe',
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  reading_time INTEGER,
  format TEXT NOT NULL DEFAULT 'text',
  body TEXT NOT NULL DEFAULT '',
  audio_url TEXT,
  audio_duration INTEGER,
  audio_transcript TEXT,
  related_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  featured BOOLEAN DEFAULT false,
  premium BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

--------------------------------------------------------------------------------
-- 7. E-MAILS, INTEGRAÇÕES E AUTOMAÇÕES
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_templates (
  type TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'platform',
  subject TEXT NOT NULL DEFAULT '',
  preview_text TEXT NOT NULL DEFAULT '',
  html TEXT NOT NULL DEFAULT '',
  is_customized BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'custom',
  status TEXT NOT NULL DEFAULT 'sent',
  resend_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS email_logs_created_idx ON public.email_logs (created_at DESC);

-- Configuração de cada integração (Resend, OpenRouter, Eduzz…).
-- `secrets` nunca sai do servidor: RLS bloqueia leitura para não-admins.
CREATE TABLE IF NOT EXISTS public.integrations (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  secrets JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'not_started',
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_days INTEGER DEFAULT 0,
  trigger_course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  action_title TEXT NOT NULL,
  action_message TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{platform}',
  email_details JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  triggered_count INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

--------------------------------------------------------------------------------
-- 8. NOTIFICAÇÕES (CAMPANHAS + ENTREGA POR USUÁRIO)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notification_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'all',
  target_id TEXT,
  channels TEXT[] NOT NULL DEFAULT '{platform}',
  email_details JSONB DEFAULT '{}'::jsonb,
  views INTEGER DEFAULT 0,
  opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.notification_campaigns(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);

--------------------------------------------------------------------------------
-- 9. AJUSTES DA PLATAFORMA (aparência, menu, preferências)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

--------------------------------------------------------------------------------
-- 10. CURSOS ATRIBUÍDOS A MEMBROS B2B
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_member_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.organization_members(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (member_id, course_id)
);

--------------------------------------------------------------------------------
-- 11. TRIGGERS DE updated_at
--------------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'courses', 'lessons', 'profiles', 'organizations', 'plans', 'subscriptions',
    'agents', 'agent_conversations', 'pilulas', 'profile_tests',
    'trail_questionnaires', 'student_refinements', 'articles', 'automations',
    'app_settings', 'integrations', 'email_templates'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()',
      t
    );
  END LOOP;
END $$;

--------------------------------------------------------------------------------
-- 12. PERFIL: ESPELHAR E-MAIL DE auth.users
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles SET email = new.email WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();

-- Preenche o e-mail dos perfis que já existiam antes desta migration.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

--------------------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY
--------------------------------------------------------------------------------

-- Agentes: catálogo público para quem está logado; escrita só de admin.
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agentes publicados visíveis" ON public.agents;
CREATE POLICY "Agentes publicados visíveis" ON public.agents
  FOR SELECT USING (is_published = true OR public.is_admin());
DROP POLICY IF EXISTS "Admins gerenciam agentes" ON public.agents;
CREATE POLICY "Admins gerenciam agentes" ON public.agents
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aluno gerencia próprias conversas" ON public.agent_conversations;
CREATE POLICY "Aluno gerencia próprias conversas" ON public.agent_conversations
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Mensagens seguem a conversa" ON public.agent_messages;
CREATE POLICY "Mensagens seguem a conversa" ON public.agent_messages
  FOR ALL USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = agent_messages.conversation_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = agent_messages.conversation_id AND c.user_id = auth.uid()
    )
  );

-- Pílulas
ALTER TABLE public.pilulas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pílulas ativas visíveis" ON public.pilulas;
CREATE POLICY "Pílulas ativas visíveis" ON public.pilulas
  FOR SELECT USING (status = 'Ativa' OR public.is_admin());
DROP POLICY IF EXISTS "Admins gerenciam pílulas" ON public.pilulas;
CREATE POLICY "Admins gerenciam pílulas" ON public.pilulas
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.pilula_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Interações visíveis para admin e dono" ON public.pilula_interactions;
CREATE POLICY "Interações visíveis para admin e dono" ON public.pilula_interactions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Aluno grava própria interação" ON public.pilula_interactions;
CREATE POLICY "Aluno grava própria interação" ON public.pilula_interactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Testes de perfil
ALTER TABLE public.profile_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Testes publicados visíveis" ON public.profile_tests;
CREATE POLICY "Testes publicados visíveis" ON public.profile_tests
  FOR SELECT USING (status = 'published' OR public.is_admin());
DROP POLICY IF EXISTS "Admins gerenciam testes" ON public.profile_tests;
CREATE POLICY "Admins gerenciam testes" ON public.profile_tests
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.profile_test_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aluno gerencia próprios resultados" ON public.profile_test_results;
CREATE POLICY "Aluno gerencia próprios resultados" ON public.profile_test_results
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Questionário da trilha
ALTER TABLE public.trail_questionnaires ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Questionário publicado visível" ON public.trail_questionnaires;
CREATE POLICY "Questionário publicado visível" ON public.trail_questionnaires
  FOR SELECT USING (status = 'published' OR public.is_admin());
DROP POLICY IF EXISTS "Admins gerenciam questionário" ON public.trail_questionnaires;
CREATE POLICY "Admins gerenciam questionário" ON public.trail_questionnaires
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.trail_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Eventos do próprio aluno" ON public.trail_events;
CREATE POLICY "Eventos do próprio aluno" ON public.trail_events
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.student_refinements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Recalibração do próprio aluno" ON public.student_refinements;
CREATE POLICY "Recalibração do próprio aluno" ON public.student_refinements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Blog: leitura pública, escrita de admin.
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Artigos publicados são públicos" ON public.articles;
CREATE POLICY "Artigos publicados são públicos" ON public.articles
  FOR SELECT USING (is_published = true OR public.is_admin());
DROP POLICY IF EXISTS "Admins gerenciam artigos" ON public.articles;
CREATE POLICY "Admins gerenciam artigos" ON public.articles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Operacional só de admin.
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Somente admin nos templates" ON public.email_templates;
CREATE POLICY "Somente admin nos templates" ON public.email_templates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Somente admin nos logs" ON public.email_logs;
CREATE POLICY "Somente admin nos logs" ON public.email_logs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Somente admin nas integrações" ON public.integrations;
CREATE POLICY "Somente admin nas integrações" ON public.integrations
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Somente admin nas automações" ON public.automations;
CREATE POLICY "Somente admin nas automações" ON public.automations
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Somente admin nas campanhas" ON public.notification_campaigns;
CREATE POLICY "Somente admin nas campanhas" ON public.notification_campaigns
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Notificações por usuário
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aluno lê próprias notificações" ON public.notifications;
CREATE POLICY "Aluno lê próprias notificações" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Aluno marca como lida" ON public.notifications;
CREATE POLICY "Aluno marca como lida" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins criam notificações" ON public.notifications;
CREATE POLICY "Admins criam notificações" ON public.notifications
  FOR INSERT WITH CHECK (public.is_admin());

-- Ajustes: leitura pública (tema, menu), escrita de admin.
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ajustes são legíveis" ON public.app_settings;
CREATE POLICY "Ajustes são legíveis" ON public.app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins gravam ajustes" ON public.app_settings;
CREATE POLICY "Admins gravam ajustes" ON public.app_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Cursos atribuídos a membros
ALTER TABLE public.organization_member_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Atribuições visíveis para a org" ON public.organization_member_courses;
CREATE POLICY "Atribuições visíveis para a org" ON public.organization_member_courses
  FOR ALL USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.id = organization_member_courses.member_id
        AND (m.user_id = auth.uid() OR public.is_org_admin(m.organization_id))
    )
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.id = organization_member_courses.member_id
        AND public.is_org_admin(m.organization_id)
    )
  );

-- Tabelas que já existiam mas ainda não tinham RLS ligado.
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anexos seguem a aula" ON public.attachments;
CREATE POLICY "Anexos seguem a aula" ON public.attachments
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.modules m ON l.module_id = m.id
      JOIN public.enrollments e ON m.course_id = e.course_id
      WHERE l.id = attachments.lesson_id AND e.user_id = auth.uid() AND e.status = 'active'
    )
  );
DROP POLICY IF EXISTS "Admins gerenciam anexos" ON public.attachments;
CREATE POLICY "Admins gerenciam anexos" ON public.attachments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comentários visíveis para matriculados" ON public.comments;
CREATE POLICY "Comentários visíveis para matriculados" ON public.comments
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Aluno escreve próprio comentário" ON public.comments;
CREATE POLICY "Aluno escreve próprio comentário" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Aluno edita próprio comentário" ON public.comments;
CREATE POLICY "Aluno edita próprio comentário" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Aluno apaga próprio comentário" ON public.comments;
CREATE POLICY "Aluno apaga próprio comentário" ON public.comments
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Planos ativos são públicos" ON public.plans;
CREATE POLICY "Planos ativos são públicos" ON public.plans
  FOR SELECT USING (is_active = true OR public.is_admin());
DROP POLICY IF EXISTS "Admins gerenciam planos" ON public.plans;
CREATE POLICY "Admins gerenciam planos" ON public.plans
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Assinatura visível para o dono" ON public.subscriptions;
CREATE POLICY "Assinatura visível para o dono" ON public.subscriptions
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  );
DROP POLICY IF EXISTS "Admins gerenciam assinaturas" ON public.subscriptions;
CREATE POLICY "Admins gerenciam assinaturas" ON public.subscriptions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.organization_tracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trilhas da org visíveis para membros" ON public.organization_tracks;
CREATE POLICY "Trilhas da org visíveis para membros" ON public.organization_tracks
  FOR SELECT USING (public.is_org_member(organization_id) OR public.is_admin());
DROP POLICY IF EXISTS "Gestores gerenciam trilhas da org" ON public.organization_tracks;
CREATE POLICY "Gestores gerenciam trilhas da org" ON public.organization_tracks
  FOR ALL USING (public.is_org_admin(organization_id) OR public.is_admin())
  WITH CHECK (public.is_org_admin(organization_id) OR public.is_admin());

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auditoria para gestores" ON public.audit_logs;
CREATE POLICY "Auditoria para gestores" ON public.audit_logs
  FOR SELECT USING (
    public.is_admin() OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  );

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chaves para gestores da org" ON public.api_keys;
CREATE POLICY "Chaves para gestores da org" ON public.api_keys
  FOR ALL USING (public.is_org_admin(organization_id) OR public.is_admin())
  WITH CHECK (public.is_org_admin(organization_id) OR public.is_admin());

-- Organizações: faltava permitir a criação por um admin da plataforma.
DROP POLICY IF EXISTS "Admins criam organizações" ON public.organizations;
CREATE POLICY "Admins criam organizações" ON public.organizations
  FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins removem organizações" ON public.organizations;
CREATE POLICY "Admins removem organizações" ON public.organizations
  FOR DELETE USING (public.is_admin());

-- Perfis: admin precisa poder editar papel e status de qualquer um.
DROP POLICY IF EXISTS "Admins gerenciam perfis" ON public.profiles;
CREATE POLICY "Admins gerenciam perfis" ON public.profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

--------------------------------------------------------------------------------
-- 14. FUNÇÕES DE AGREGAÇÃO PARA AS ANÁLISES
--------------------------------------------------------------------------------

-- Progresso de um aluno em um curso, em porcentagem.
CREATE OR REPLACE FUNCTION public.course_progress(p_user_id UUID, p_course_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
  done INTEGER;
BEGIN
  SELECT count(*) INTO total
  FROM public.lessons l
  JOIN public.modules m ON l.module_id = m.id
  WHERE m.course_id = p_course_id AND l.is_published = true;

  IF total = 0 THEN RETURN 0; END IF;

  SELECT count(*) INTO done
  FROM public.lesson_progress lp
  JOIN public.lessons l ON lp.lesson_id = l.id
  JOIN public.modules m ON l.module_id = m.id
  WHERE m.course_id = p_course_id
    AND lp.user_id = p_user_id
    AND lp.is_completed = true;

  RETURN round((done::numeric / total) * 100);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Números do topo do painel admin, em uma ida ao banco.
CREATE OR REPLACE FUNCTION public.platform_overview()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'students', (SELECT count(*) FROM public.profiles WHERE role = 'student'),
    'courses', (SELECT count(*) FROM public.courses WHERE is_published = true),
    'lessons', (SELECT count(*) FROM public.lessons WHERE is_published = true),
    'enrollments', (SELECT count(*) FROM public.enrollments WHERE status = 'active'),
    'completedLessons', (SELECT count(*) FROM public.lesson_progress WHERE is_completed = true),
    'certificates', (SELECT count(*) FROM public.certificates),
    'organizations', (SELECT count(*) FROM public.organizations WHERE is_active = true),
    'activeSubscriptions', (SELECT count(*) FROM public.subscriptions WHERE status = 'active'),
    'mrr', (
      SELECT coalesce(sum(s.amount), 0)
      FROM public.subscriptions s
      WHERE s.status = 'active'
    ),
    'conversations', (SELECT count(*) FROM public.agent_conversations),
    'agents', (SELECT count(*) FROM public.agents WHERE is_published = true),
    'newStudents30d', (
      SELECT count(*) FROM public.profiles
      WHERE role = 'student' AND created_at > now() - interval '30 days'
    ),
    'activeStudents7d', (
      SELECT count(DISTINCT user_id) FROM public.lesson_progress
      WHERE completed_at > now() - interval '7 days'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';
