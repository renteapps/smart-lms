-- ============================================================================
-- Migração: Vínculo de Agentes de IA com múltiplos cursos e planos de assinatura
-- ============================================================================

-- 1. Colunas de arrays rápidos na tabela de agentes
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS course_ids TEXT[] DEFAULT '{}';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS plan_ids TEXT[] DEFAULT '{}';

-- 2. Tabela de relacionamento: Agentes <-> Cursos
CREATE TABLE IF NOT EXISTS public.agent_courses (
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (agent_id, course_id)
);

CREATE INDEX IF NOT EXISTS agent_courses_agent_idx ON public.agent_courses(agent_id);
CREATE INDEX IF NOT EXISTS agent_courses_course_idx ON public.agent_courses(course_id);

-- 3. Tabela de relacionamento: Agentes <-> Planos
CREATE TABLE IF NOT EXISTS public.agent_plans (
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (agent_id, plan_id)
);

CREATE INDEX IF NOT EXISTS agent_plans_agent_idx ON public.agent_plans(agent_id);
CREATE INDEX IF NOT EXISTS agent_plans_plan_idx ON public.agent_plans(plan_id);

-- 4. RLS para agent_courses e agent_plans
ALTER TABLE public.agent_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vínculos de cursos visíveis para leitura pública" ON public.agent_courses;
CREATE POLICY "Vínculos de cursos visíveis para leitura pública" ON public.agent_courses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins gerenciam vínculos de cursos" ON public.agent_courses;
CREATE POLICY "Admins gerenciam vínculos de cursos" ON public.agent_courses
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Vínculos de planos visíveis para leitura pública" ON public.agent_plans;
CREATE POLICY "Vínculos de planos visíveis para leitura pública" ON public.agent_plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins gerenciam vínculos de planos" ON public.agent_plans;
CREATE POLICY "Admins gerenciam vínculos de planos" ON public.agent_plans
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());
