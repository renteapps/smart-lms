-- ============================================================================
-- VIEW: minutos assistidos (aulas concluídas) por usuário
-- ============================================================================
--
-- Substitui o padrão de `getWatchedHours` (business.ts): buscar uma linha de
-- lesson_progress por aula concluída de cada membro e somar em JS. Para uma
-- empresa com muitos colaboradores e cursos isso trafega uma linha por aula
-- concluída; a view soma no Postgres e devolve 1 linha por usuário.
--
-- Mesmo filtro de `l.is_published = true` de v_user_course_progress, pela
-- mesma razão: aula despublicada não deve contar em métricas agregadas.

CREATE OR REPLACE VIEW public.v_user_watch_time WITH (security_invoker=true) AS
SELECT
    lp.user_id,
    COALESCE(SUM(l.duration_in_minutes) FILTER (WHERE lp.is_completed = true), 0)::integer AS completed_minutes
FROM public.lesson_progress lp
JOIN public.lessons l ON l.id = lp.lesson_id
WHERE l.is_published = true
GROUP BY lp.user_id;
