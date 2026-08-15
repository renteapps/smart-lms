-- ==============================================================================
-- Supabase Schema for Smart LMS - B2B & Corporate Accounts (Empresas & Gestão)
-- ==============================================================================

-- 1. Enums
CREATE TYPE public.company_plan_type AS ENUM ('mensal', 'anual', 'corporativo_custom');
CREATE TYPE public.company_status AS ENUM ('ativo', 'inativo', 'suspenso', 'trial');
CREATE TYPE public.member_role AS ENUM ('gestor', 'colaborador', 'lider_equipe');
CREATE TYPE public.member_status AS ENUM ('ativo', 'convidado', 'desativado');

-- 2. Companies Table
CREATE TABLE public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  domain TEXT,
  auto_domain_approval BOOLEAN DEFAULT false,
  logo_url TEXT,
  manager_name TEXT NOT NULL,
  manager_email TEXT NOT NULL,
  manager_phone TEXT,
  seats_total INTEGER NOT NULL DEFAULT 10,
  seats_used INTEGER NOT NULL DEFAULT 0,
  plan_type company_plan_type DEFAULT 'anual'::company_plan_type,
  status company_status DEFAULT 'ativo'::company_status,
  contract_start DATE NOT NULL DEFAULT CURRENT_DATE,
  contract_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  contract_value NUMERIC(12, 2) DEFAULT 0.00,
  allowed_course_ids UUID[] DEFAULT '{}',
  departments TEXT[] DEFAULT ARRAY['Geral', 'RH', 'Tecnologia', 'Vendas']::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for domain lookups (auto-admissão)
CREATE INDEX idx_companies_domain ON public.companies(domain) WHERE domain IS NOT NULL;

-- 3. Company Members (Colaboradores / Funcionários)
CREATE TABLE public.company_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role_in_company member_role DEFAULT 'colaborador'::member_role,
  department TEXT NOT NULL DEFAULT 'Geral',
  job_title TEXT,
  status member_status DEFAULT 'convidado'::member_status,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE,
  last_access_at TIMESTAMP WITH TIME ZONE,
  progress_percentage NUMERIC(5, 2) DEFAULT 0.00,
  completed_courses_count INTEGER DEFAULT 0,
  assigned_course_ids UUID[] DEFAULT '{}',
  certificates_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_company_member_email UNIQUE(company_id, email)
);

CREATE INDEX idx_company_members_company_id ON public.company_members(company_id);
CREATE INDEX idx_company_members_user_id ON public.company_members(user_id);
CREATE INDEX idx_company_members_department ON public.company_members(company_id, department);

-- 4. Company Invites Table
CREATE TABLE public.company_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  department TEXT DEFAULT 'Geral',
  role_in_company member_role DEFAULT 'colaborador'::member_role,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT DEFAULT 'pendente',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days') NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_company_invites_company_token ON public.company_invites(token);

-- 5. Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is manager of a company
CREATE OR REPLACE FUNCTION public.is_company_manager(target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = target_company_id
      AND user_id = (SELECT auth.uid())
      AND role_in_company = 'gestor'
      AND status = 'ativo'
  );
$$;

-- RLS Policies for Companies
CREATE POLICY "Company managers can view own company"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (public.is_company_manager(id));

CREATE POLICY "Company managers can update own company profile"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (public.is_company_manager(id))
  WITH CHECK (public.is_company_manager(id));

-- RLS Policies for Company Members
CREATE POLICY "Company members can view teammates in same company"
  ON public.company_members
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Company managers can insert members"
  ON public.company_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_manager(company_id));

CREATE POLICY "Company managers can update members in own company"
  ON public.company_members
  FOR UPDATE
  TO authenticated
  USING (public.is_company_manager(company_id))
  WITH CHECK (public.is_company_manager(company_id));

CREATE POLICY "Company managers can delete members in own company"
  ON public.company_members
  FOR DELETE
  TO authenticated
  USING (public.is_company_manager(company_id));
