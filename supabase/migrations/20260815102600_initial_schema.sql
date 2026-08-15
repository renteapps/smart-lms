-- Habilitar a extensão pgvector para IA (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enums
CREATE TYPE public.user_role AS ENUM ('student', 'instructor', 'admin');
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'manager', 'employee');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
CREATE TYPE public.plan_frequency AS ENUM ('monthly', 'yearly', 'lifetime', 'custom');

--------------------------------------------------------------------------------
-- TABELAS B2C E NÚCLEO ACADÊMICO
--------------------------------------------------------------------------------

-- Profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role public.user_role DEFAULT 'student'::public.user_role,
  headline TEXT,
  bio TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cursos
CREATE TABLE public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  duration TEXT,
  level TEXT DEFAULT 'Essencial',
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Módulos
CREATE TABLE public.modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aulas
CREATE TABLE public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'video',
  video_url TEXT,
  content TEXT,
  blocks JSONB DEFAULT '[]'::jsonb,
  duration_in_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL,
  profile_test_id TEXT,
  profile_test_config JSONB,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Anexos
CREATE TABLE public.attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Matrículas
CREATE TABLE public.enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT DEFAULT 'active',
  UNIQUE(user_id, course_id)
);

-- Progresso de Aulas
CREATE TABLE public.lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  last_watched_second INTEGER DEFAULT 0,
  user_rating INTEGER,
  UNIQUE(user_id, lesson_id)
);

-- Trilhas do Aluno
CREATE TABLE public.student_trails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  trail_data JSONB NOT NULL,
  questionnaire_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notas do Aluno
CREATE TABLE public.student_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  lesson_title TEXT,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, lesson_id)
);

-- Comentários (Fórum)
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notificações
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'system',
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

--------------------------------------------------------------------------------
-- TABELAS MULTI-TENANT CORPORATIVO (B2B)
--------------------------------------------------------------------------------

-- Empresas
CREATE TABLE public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  document TEXT,
  logo_url TEXT,
  allowed_domains TEXT[] DEFAULT '{}',
  max_seats INTEGER NOT NULL DEFAULT 10,
  plan_tier TEXT DEFAULT 'business',
  billing_email TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Membros das Empresas
CREATE TABLE public.organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role DEFAULT 'employee'::public.org_role,
  department TEXT,
  job_title TEXT,
  status TEXT DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, user_id)
);

-- Convites
CREATE TABLE public.organization_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.org_role DEFAULT 'employee'::public.org_role,
  department TEXT,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.invite_status DEFAULT 'pending'::public.invite_status,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trilhas Atribuídas B2B
CREATE TABLE public.organization_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN DEFAULT false,
  deadline_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, course_id)
);

-- Chaves de API (Gateway B2B)
CREATE TABLE public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Logs de Auditoria Corporativa
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

--------------------------------------------------------------------------------
-- INTELIGÊNCIA ARTIFICIAL (RAG / EMBEDDINGS)
--------------------------------------------------------------------------------

CREATE TABLE public.content_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  content_chunk TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice para buscas vetoriais rápidas
CREATE INDEX ON public.content_embeddings USING hnsw (embedding vector_cosine_ops);

--------------------------------------------------------------------------------
-- ASSINATURAS, FATURAMENTO E CERTIFICADOS
--------------------------------------------------------------------------------

CREATE TABLE public.plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gateway_product_id TEXT UNIQUE,
  features JSONB,
  is_b2b BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  issue_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  validation_hash TEXT UNIQUE NOT NULL,
  pdf_url TEXT,
  UNIQUE(user_id, course_id)
);

--------------------------------------------------------------------------------
-- STORAGE BUCKETS
--------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('public-assets', 'public-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('secure-documents', 'secure-documents', false) ON CONFLICT (id) DO NOTHING;

--------------------------------------------------------------------------------
-- TRIGGER: CRIAR PERFIL AUTOMATICAMENTE
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

--------------------------------------------------------------------------------
-- FUNÇÕES DE SEGURANÇA (RLS HELPERS)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
--------------------------------------------------------------------------------

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Perfis visíveis para todos" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuários podem atualizar o próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cursos publicados visíveis para todos" ON public.courses FOR SELECT USING (is_published = true OR public.is_admin());
CREATE POLICY "Apenas admins alteram cursos" ON public.courses FOR ALL USING (public.is_admin());

-- Modules
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Módulos de cursos publicados visíveis para todos" ON public.modules FOR SELECT USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = modules.course_id AND (courses.is_published = true OR public.is_admin())));
CREATE POLICY "Apenas admins alteram módulos" ON public.modules FOR ALL USING (public.is_admin());

-- Lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aulas publicadas visíveis para todos" ON public.lessons FOR SELECT USING (is_published = true OR public.is_admin());
CREATE POLICY "Apenas admins alteram aulas" ON public.lessons FOR ALL USING (public.is_admin());

-- Enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário lê próprias matrículas" ON public.enrollments FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Usuário insere própria matrícula" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário deleta própria matrícula" ON public.enrollments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins alteram matrículas" ON public.enrollments FOR ALL USING (public.is_admin());

-- Lesson Progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário lê próprio progresso" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Usuário altera próprio progresso" ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza próprio progresso" ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id);

-- Student Trails
ALTER TABLE public.student_trails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário lê própria trilha" ON public.student_trails FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Usuário gerencia própria trilha" ON public.student_trails FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Student Notes
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia próprias notas" ON public.student_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros e admins podem ler organização" ON public.organizations FOR SELECT USING (public.is_org_member(id) OR public.is_admin());
CREATE POLICY "Apenas gestores alteram organização" ON public.organizations FOR UPDATE USING (public.is_org_admin(id) OR public.is_admin());

-- Organization Members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros da mesma org podem ler" ON public.organization_members FOR SELECT USING (public.is_org_member(organization_id) OR public.is_admin());
CREATE POLICY "Gestores gerenciam membros" ON public.organization_members FOR ALL USING (public.is_org_admin(organization_id) OR public.is_admin());

-- Organization Invites
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestores podem ler e gerenciar convites" ON public.organization_invites FOR ALL USING (public.is_org_admin(organization_id) OR public.is_admin());

-- Content Embeddings
ALTER TABLE public.content_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso as embeddings requer matrícula na aula ou admin" ON public.content_embeddings FOR SELECT USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    JOIN public.enrollments e ON m.course_id = e.course_id
    WHERE l.id = content_embeddings.lesson_id AND e.user_id = auth.uid()
  )
);
CREATE POLICY "Apenas admins alteram embeddings" ON public.content_embeddings FOR ALL USING (public.is_admin());

-- Certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Certificados são públicos pela verificação" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Apenas sistema gera certificados" ON public.certificates FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Storage
CREATE POLICY "Avatares visíveis para todos" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Usuário sobe próprio avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);
CREATE POLICY "Usuário altera próprio avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = owner);
