-- Corrige a view v_course_metrics para permitir que usuários não matriculados (como
-- alunos sem produtos ou visitantes no catálogo público) vejam a contagem correta de
-- aulas e duração total dos cursos.
--
-- Antes, a view utilizava `WITH (security_invoker=true)`. Como a tabela `lessons` possui
-- RLS permitindo SELECT apenas para alunos matriculados ou administradores, as subconsultas
-- agregadas retornavam 0 para usuários não matriculados, fazendo com que getCatalogCourses
-- descartasse todos os cursos (filter lessonCount > 0).
--
-- Ao definir `security_invoker=false`, a view passa a rodar com privilégio do owner (postgres),
-- permitindo calcular as métricas de catálogo com precisão. A cláusula WHERE garante que
-- usuários comuns continuem vendo apenas cursos publicados, enquanto administradores
-- mantêm acesso a todos os cursos.

CREATE OR REPLACE VIEW public.v_course_metrics
WITH (security_invoker = false) AS
SELECT
    c.*,
    (
        SELECT count(l.id)
        FROM public.lessons l
        JOIN public.modules m ON m.id = l.module_id
        WHERE m.course_id = c.id AND l.is_published = true
    )::integer AS lesson_count,
    (
        SELECT coalesce(sum(l.duration_in_minutes), 0)
        FROM public.lessons l
        JOIN public.modules m ON m.id = l.module_id
        WHERE m.course_id = c.id AND l.is_published = true
    )::integer AS total_duration_minutes
FROM public.courses c
WHERE c.is_published = true OR public.is_admin();

GRANT SELECT ON public.v_course_metrics TO anon, authenticated, service_role;
