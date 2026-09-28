-- Índices para acelerar ordenação e filtros na tabela profiles
CREATE INDEX IF NOT EXISTS idx_profiles_last_access_at_desc ON public.profiles USING btree (last_access_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc ON public.profiles USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles USING btree (role, status);

-- View administrativa com segurança para administradores
CREATE OR REPLACE VIEW public.v_admin_users
WITH (security_invoker = false) AS
WITH active_subs AS (
  SELECT DISTINCT ON (s.user_id)
    s.user_id,
    s.plan_id,
    p.name AS plan_name,
    s.status AS subscription_status
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.status IN ('active', 'trialing')
    AND (s.current_period_end IS NULL OR s.current_period_end > timezone('utc'::text, now()))
  ORDER BY s.user_id, s.created_at DESC
),
active_enrolls AS (
  SELECT 
    e.user_id,
    COUNT(*)::integer AS active_enrollments_count,
    ARRAY_AGG(e.course_id) AS enrolled_course_ids
  FROM public.enrollments e
  WHERE e.status = 'active'
    AND (e.expires_at IS NULL OR e.expires_at > timezone('utc'::text, now()))
  GROUP BY e.user_id
)
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.avatar_url,
  p.role,
  p.status,
  p.last_access_at,
  p.created_at,
  sub.plan_id AS active_plan_id,
  sub.plan_name AS active_plan_name,
  COALESCE(enr.active_enrollments_count, 0)::integer AS active_enrollments_count,
  COALESCE(enr.enrolled_course_ids, ARRAY[]::uuid[]) AS enrolled_course_ids
FROM public.profiles p
LEFT JOIN active_subs sub ON sub.user_id = p.id
LEFT JOIN active_enrolls enr ON enr.user_id = p.id
WHERE public.is_admin() OR auth.role() = 'service_role' OR current_user = 'postgres';

GRANT SELECT ON public.v_admin_users TO authenticated, service_role;
