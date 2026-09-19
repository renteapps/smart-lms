-- Migration: performance_and_security_hardening
-- 1. Corrige políticas RLS com auth_rls_initplan substituindo auth.uid() por (select auth.uid())
-- 2. Adiciona índices para cobrir foreign keys com alto volume de consulta/delete
-- 3. Revoga execução de funções administrativas sensíveis do papel anon

-- ============================================================================
-- 1. Otimização de RLS (InitPlan em vez de avaliação por linha)
-- ============================================================================

-- profiles
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar o próprio perfil"
  ON public.profiles FOR UPDATE
  USING (id = (SELECT auth.uid()));

-- student_trails
DROP POLICY IF EXISTS "Usuário lê própria trilha" ON public.student_trails;
CREATE POLICY "Usuário lê própria trilha"
  ON public.student_trails FOR SELECT
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Usuário gerencia própria trilha" ON public.student_trails;
CREATE POLICY "Usuário gerencia própria trilha"
  ON public.student_trails FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- student_notes
DROP POLICY IF EXISTS "Usuário gerencia próprias notas" ON public.student_notes;
CREATE POLICY "Usuário gerencia próprias notas"
  ON public.student_notes FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- quiz_results
DROP POLICY IF EXISTS "Users can view their own quiz results" ON public.quiz_results;
CREATE POLICY "Users can view their own quiz results"
  ON public.quiz_results FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- quiz_drafts
DROP POLICY IF EXISTS "Users manage their own quiz drafts" ON public.quiz_drafts;
CREATE POLICY "Users manage their own quiz drafts"
  ON public.quiz_drafts FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- pilula_interactions
DROP POLICY IF EXISTS "Aluno grava própria interação" ON public.pilula_interactions;
CREATE POLICY "Aluno grava própria interação"
  ON public.pilula_interactions FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- profile_test_results
DROP POLICY IF EXISTS "Aluno gerencia próprios resultados" ON public.profile_test_results;
CREATE POLICY "Aluno gerencia próprios resultados"
  ON public.profile_test_results FOR ALL
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

-- trail_events
DROP POLICY IF EXISTS "Eventos do próprio aluno" ON public.trail_events;
CREATE POLICY "Eventos do próprio aluno"
  ON public.trail_events FOR ALL
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- student_refinements
DROP POLICY IF EXISTS "Recalibração do próprio aluno" ON public.student_refinements;
CREATE POLICY "Recalibração do próprio aluno"
  ON public.student_refinements FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- notifications
DROP POLICY IF EXISTS "Aluno lê próprias notificações" ON public.notifications;
CREATE POLICY "Aluno lê próprias notificações"
  ON public.notifications FOR SELECT
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Aluno marca como lida" ON public.notifications;
CREATE POLICY "Aluno marca como lida"
  ON public.notifications FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- comments
DROP POLICY IF EXISTS "Aluno apaga próprio comentário" ON public.comments;
CREATE POLICY "Aluno apaga próprio comentário"
  ON public.comments FOR DELETE
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

-- subscriptions
DROP POLICY IF EXISTS "Assinatura visível para o dono" ON public.subscriptions;
CREATE POLICY "Assinatura visível para o dono"
  ON public.subscriptions FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
    OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  );

-- article_categories
DROP POLICY IF EXISTS "Allow admin full access to article_categories" ON public.article_categories;
CREATE POLICY "Allow admin full access to article_categories"
  ON public.article_categories FOR ALL TO authenticated
  USING ((SELECT public.is_admin()));

-- article_authors
DROP POLICY IF EXISTS "Allow admin full access to article_authors" ON public.article_authors;
CREATE POLICY "Allow admin full access to article_authors"
  ON public.article_authors FOR ALL TO authenticated
  USING ((SELECT public.is_admin()));

-- organization_member_courses
DROP POLICY IF EXISTS "Atribuições visíveis para a org" ON public.organization_member_courses;
CREATE POLICY "Atribuições visíveis para a org"
  ON public.organization_member_courses FOR ALL
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.id = organization_member_courses.member_id
        AND (m.user_id = (SELECT auth.uid()) OR public.is_org_admin(m.organization_id))
    )
  )
  WITH CHECK (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.id = organization_member_courses.member_id
        AND public.is_org_admin(m.organization_id)
    )
  );

-- ============================================================================
-- 2. Índices para cobrir foreign keys críticas (sem cobertura)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_comments_lesson_id ON public.comments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_lessons_quiz_id ON public.lessons(quiz_id);
CREATE INDEX IF NOT EXISTS idx_lessons_profile_test_ref ON public.lessons(profile_test_ref);

CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON public.quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_lesson_id ON public.quiz_results(lesson_id);

CREATE INDEX IF NOT EXISTS idx_quiz_drafts_lesson_id ON public.quiz_drafts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_drafts_user_id ON public.quiz_drafts(user_id);

CREATE INDEX IF NOT EXISTS idx_student_notes_lesson_id ON public.student_notes(lesson_id);

CREATE INDEX IF NOT EXISTS idx_gateway_transactions_subscription_id ON public.gateway_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_gateway_transactions_plan_id ON public.gateway_transactions(plan_id);
CREATE INDEX IF NOT EXISTS idx_gateway_transactions_course_id ON public.gateway_transactions(course_id);

CREATE INDEX IF NOT EXISTS idx_gateway_webhook_events_user_id ON public.gateway_webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_gateway_webhook_events_subscription_id ON public.gateway_webhook_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_gateway_webhook_events_enrollment_id ON public.gateway_webhook_events(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_agents_course_id ON public.agents(course_id);
CREATE INDEX IF NOT EXISTS idx_pilulas_course_id ON public.pilulas(course_id);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_related_course_id ON public.articles(related_course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON public.certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_profile_test_results_user_id ON public.profile_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_organization_id ON public.organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_company_id ON public.company_invites(company_id);

-- ============================================================================
-- 3. Hardening de RPCs administrativas sensíveis contra papel anônimo
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.platform_overview() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_any_org_admin() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM public, anon;
