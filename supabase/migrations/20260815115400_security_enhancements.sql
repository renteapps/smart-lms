-- Adiciona a coluna de créditos de IA na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 10;

-- Atualiza políticas de segurança (RLS) para Módulos
DROP POLICY IF EXISTS "Módulos de cursos publicados visíveis para todos" ON public.modules;
CREATE POLICY "Módulos visíveis apenas para alunos matriculados ou admin" ON public.modules FOR SELECT USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = modules.course_id 
      AND e.user_id = auth.uid() 
      AND e.status = 'active'
  )
);

-- Atualiza políticas de segurança (RLS) para Aulas
DROP POLICY IF EXISTS "Aulas publicadas visíveis para todos" ON public.lessons;
CREATE POLICY "Aulas visíveis apenas para alunos matriculados ou admin" ON public.lessons FOR SELECT USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.enrollments e ON m.course_id = e.course_id
    WHERE m.id = lessons.module_id 
      AND e.user_id = auth.uid() 
      AND e.status = 'active'
  )
);
