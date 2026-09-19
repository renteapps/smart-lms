-- ============================================================================
-- Migração: Consolidação de Políticas Permissivas de RLS, Short-Circuits e Índices
-- ============================================================================

-- 1. Short-circuit em funções de segurança e RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Checagem rápida no token JWT (app_metadata seguro)
  IF (COALESCE(auth.jwt()->'app_metadata'->>'role', '') = 'admin') THEN
    RETURN true;
  END IF;

  -- 2. Checagem direta na tabela profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_any_org_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin', 'manager')
      AND status = 'active'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = (SELECT auth.uid())
      AND role IN ('owner', 'admin', 'manager')
      AND status = 'active'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = (SELECT auth.uid())
      AND status = 'active'
  );
END;
$function$;

-- 2. Revogar execução desnecessária de roles públicas
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_ai_credits(uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_trail_questionnaire(jsonb, text) FROM anon, authenticated;

-- 3. Índices remanescentes em FKs
CREATE INDEX IF NOT EXISTS idx_ai_billing_settings_updated_by ON public.ai_billing_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_created_by ON public.ai_credit_ledger(created_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON public.api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_automations_trigger_course_id ON public.automations(trigger_course_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_created_by ON public.notification_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_campaign_id ON public.notifications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_created_by ON public.organization_invites(created_by);
CREATE INDEX IF NOT EXISTS idx_organization_member_courses_course_id ON public.organization_member_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_organization_tracks_course_id ON public.organization_tracks(course_id);
CREATE INDEX IF NOT EXISTS idx_pages_created_by ON public.pages(created_by);
CREATE INDEX IF NOT EXISTS idx_trail_questionnaires_created_by ON public.trail_questionnaires(created_by);

-- 4. Consolidação de políticas permissivas (elimina múltiplas avaliações em SELECT)

-- Courses
DROP POLICY IF EXISTS "Apenas admins alteram cursos" ON public.courses;
DROP POLICY IF EXISTS "Cursos publicados visíveis para todos" ON public.courses;
CREATE POLICY "Admins inserem cursos" ON public.courses FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins atualizam cursos" ON public.courses FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins deletam cursos" ON public.courses FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Cursos publicados visíveis para todos" ON public.courses FOR SELECT TO public USING ((is_published = true) OR (SELECT public.is_admin()));

-- Articles
DROP POLICY IF EXISTS "Admins gerenciam artigos" ON public.articles;
DROP POLICY IF EXISTS "Artigos publicados são públicos" ON public.articles;
CREATE POLICY "Admins inserem artigos" ON public.articles FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins atualizam artigos" ON public.articles FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins deletam artigos" ON public.articles FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Artigos publicados são públicos" ON public.articles FOR SELECT TO public USING ((is_published = true) OR (SELECT public.is_admin()));

-- Agents
DROP POLICY IF EXISTS "Admins gerenciam agentes" ON public.agents;
DROP POLICY IF EXISTS "Agentes publicados visíveis" ON public.agents;
CREATE POLICY "Admins inserem agentes" ON public.agents FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins atualizam agentes" ON public.agents FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins deletam agentes" ON public.agents FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Agentes publicados visíveis" ON public.agents FOR SELECT TO public USING ((is_published = true) OR (SELECT public.is_admin()));

-- Pilulas
DROP POLICY IF EXISTS "Admins gerenciam pílulas" ON public.pilulas;
DROP POLICY IF EXISTS "Pílulas ativas visíveis" ON public.pilulas;
CREATE POLICY "Admins inserem pílulas" ON public.pilulas FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins atualizam pílulas" ON public.pilulas FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins deletam pílulas" ON public.pilulas FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Pílulas ativas visíveis" ON public.pilulas FOR SELECT TO public USING ((status = 'Ativa'::text) OR (SELECT public.is_admin()));

-- Plans
DROP POLICY IF EXISTS "Admins gerenciam planos" ON public.plans;
DROP POLICY IF EXISTS "Planos ativos são públicos" ON public.plans;
CREATE POLICY "Admins inserem planos" ON public.plans FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins atualizam planos" ON public.plans FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins deletam planos" ON public.plans FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Planos ativos são públicos" ON public.plans FOR SELECT TO public USING ((is_active = true) OR (SELECT public.is_admin()));

-- Agent Courses
DROP POLICY IF EXISTS "Admins gerenciam vínculos de cursos" ON public.agent_courses;
DROP POLICY IF EXISTS "Vínculos de cursos visíveis para leitura pública" ON public.agent_courses;
CREATE POLICY "Admins inserem vínculos de cursos" ON public.agent_courses FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins atualizam vínculos de cursos" ON public.agent_courses FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins deletam vínculos de cursos" ON public.agent_courses FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Vínculos de cursos visíveis para leitura pública" ON public.agent_courses FOR SELECT TO public USING (true);

-- Agent Plans
DROP POLICY IF EXISTS "Admins gerenciam vínculos de planos" ON public.agent_plans;
DROP POLICY IF EXISTS "Vínculos de planos visíveis para leitura pública" ON public.agent_plans;
CREATE POLICY "Admins inserem vínculos de planos" ON public.agent_plans FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins atualizam vínculos de planos" ON public.agent_plans FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins deletam vínculos de planos" ON public.agent_plans FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Vínculos de planos visíveis para leitura pública" ON public.agent_plans FOR SELECT TO public USING (true);

-- Modules
DROP POLICY IF EXISTS "Apenas admins alteram módulos" ON public.modules;
DROP POLICY IF EXISTS "Módulos visíveis apenas para alunos matriculados ou admin" ON public.modules;
CREATE POLICY "Admins inserem módulos" ON public.modules FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins atualizam módulos" ON public.modules FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins deletam módulos" ON public.modules FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Módulos visíveis apenas para alunos matriculados ou admin" ON public.modules FOR SELECT TO authenticated USING ((SELECT public.is_admin()) OR (course_id = ANY (public.user_entitled_course_ids())));

-- Lessons
DROP POLICY IF EXISTS "Apenas admins alteram aulas" ON public.lessons;
DROP POLICY IF EXISTS "Aulas visíveis apenas para alunos matriculados ou admin" ON public.lessons;
CREATE POLICY "Admins inserem aulas" ON public.lessons FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins atualizam aulas" ON public.lessons FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins deletam aulas" ON public.lessons FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Aulas visíveis apenas para alunos matriculados ou admin" ON public.lessons FOR SELECT TO authenticated USING ((SELECT public.is_admin()) OR (EXISTS (SELECT 1 FROM public.modules m WHERE m.id = lessons.module_id AND m.course_id = ANY (public.user_entitled_course_ids()))));
