-- Migration: Add enrollment expiration support
-- Created at: 2026-08-20 12:00:00

-- 1. Adicionar coluna expires_at em enrollments (NULL = Indeterminado / Vitalício)
ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Criar índices para performance de busca por validade e usuário
CREATE INDEX IF NOT EXISTS idx_enrollments_user_status_expires 
ON public.enrollments(user_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_enrollments_expires_at 
ON public.enrollments(expires_at);

-- 3. Atualizar policy de modules para checar expiração
DROP POLICY IF EXISTS "Módulos visíveis apenas para alunos matriculados ou admin" ON public.modules;
CREATE POLICY "Módulos visíveis apenas para alunos matriculados ou admin" ON public.modules
FOR SELECT TO authenticated
USING (
  is_admin() OR (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = modules.course_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
        AND (e.expires_at IS NULL OR e.expires_at > now())
    )
  )
);

-- 4. Atualizar policy de lessons para checar expiração
DROP POLICY IF EXISTS "Aulas visíveis apenas para alunos matriculados ou admin" ON public.lessons;
CREATE POLICY "Aulas visíveis apenas para alunos matriculados ou admin" ON public.lessons
FOR SELECT TO authenticated
USING (
  is_admin() OR (
    EXISTS (
      SELECT 1 FROM public.modules m
      JOIN public.enrollments e ON m.course_id = e.course_id
      WHERE m.id = lessons.module_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
        AND (e.expires_at IS NULL OR e.expires_at > now())
    )
  )
);

-- 5. Atualizar policy de attachments para checar expiração
DROP POLICY IF EXISTS "Anexos seguem a aula" ON public.attachments;
CREATE POLICY "Anexos seguem a aula" ON public.attachments
FOR SELECT TO authenticated
USING (
  is_admin() OR (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.modules m ON l.module_id = m.id
      JOIN public.enrollments e ON m.course_id = e.course_id
      WHERE l.id = attachments.lesson_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
        AND (e.expires_at IS NULL OR e.expires_at > now())
    )
  )
);

-- 6. Atualizar policy de content_embeddings se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'content_embeddings') THEN
    DROP POLICY IF EXISTS "Acesso as embeddings requer matrícula na aula ou admin" ON public.content_embeddings;
    CREATE POLICY "Acesso as embeddings requer matrícula na aula ou admin" ON public.content_embeddings
    FOR SELECT TO authenticated
    USING (
      is_admin() OR (
        EXISTS (
          SELECT 1 FROM public.lessons l
          JOIN public.modules m ON l.module_id = m.id
          JOIN public.enrollments e ON m.course_id = e.course_id
          WHERE l.id = content_embeddings.lesson_id
            AND e.user_id = auth.uid()
            AND e.status = 'active'
            AND (e.expires_at IS NULL OR e.expires_at > now())
        )
      )
    );
  END IF;
END $$;

-- 7. Atualizar função platform_overview para considerar validade de matrículas
CREATE OR REPLACE FUNCTION public.platform_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    'enrollments', (SELECT count(*) FROM public.enrollments WHERE status = 'active' AND (expires_at IS NULL OR expires_at > now())),
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
$$;
