-- Resumos administrativos de avaliações. As views agregam no Postgres para
-- que as telas nunca precisem baixar uma linha de lesson_progress por aluno.
-- security_invoker mantém as políticas das tabelas-base e o predicado de
-- administrador impede que alunos consultem métricas globais.

CREATE OR REPLACE VIEW public.v_admin_lesson_rating_metrics
WITH (security_invoker = true) AS
SELECT
  l.id AS lesson_id,
  m.course_id,
  ROUND(AVG(lp.user_rating)::numeric, 2) AS average_rating,
  COUNT(lp.user_rating)::integer AS ratings_count
FROM public.lessons l
JOIN public.modules m ON m.id = l.module_id
LEFT JOIN public.lesson_progress lp
  ON lp.lesson_id = l.id
 AND lp.user_rating BETWEEN 1 AND 5
WHERE (SELECT public.is_admin())
GROUP BY l.id, m.course_id;

CREATE OR REPLACE VIEW public.v_admin_course_rating_metrics
WITH (security_invoker = true) AS
SELECT
  c.id AS course_id,
  ROUND(AVG(lp.user_rating)::numeric, 2) AS average_rating,
  COUNT(lp.user_rating)::integer AS ratings_count
FROM public.courses c
LEFT JOIN public.modules m ON m.course_id = c.id
LEFT JOIN public.lessons l ON l.module_id = m.id
LEFT JOIN public.lesson_progress lp
  ON lp.lesson_id = l.id
 AND lp.user_rating BETWEEN 1 AND 5
WHERE (SELECT public.is_admin())
GROUP BY c.id;

COMMENT ON VIEW public.v_admin_lesson_rating_metrics IS
  'Média e quantidade de avaliações por aula, disponíveis somente para administradores.';

COMMENT ON VIEW public.v_admin_course_rating_metrics IS
  'Média ponderada e quantidade de avaliações das aulas por curso, disponíveis somente para administradores.';

REVOKE ALL ON public.v_admin_lesson_rating_metrics FROM PUBLIC, anon;
REVOKE ALL ON public.v_admin_course_rating_metrics FROM PUBLIC, anon;
GRANT SELECT ON public.v_admin_lesson_rating_metrics TO authenticated, service_role;
GRANT SELECT ON public.v_admin_course_rating_metrics TO authenticated, service_role;
