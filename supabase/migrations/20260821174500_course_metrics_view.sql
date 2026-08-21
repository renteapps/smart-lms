CREATE OR REPLACE VIEW public.v_course_metrics WITH (security_invoker=true) AS
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
FROM public.courses c;

CREATE OR REPLACE VIEW public.v_user_course_progress WITH (security_invoker=true) AS
SELECT 
    m.course_id,
    lp.user_id,
    COUNT(lp.lesson_id) FILTER (WHERE lp.is_completed = true)::integer AS completed_lessons,
    COUNT(lp.lesson_id)::integer AS started_lessons
FROM 
    public.lesson_progress lp
JOIN 
    public.lessons l ON lp.lesson_id = l.id
JOIN 
    public.modules m ON l.module_id = m.id
WHERE 
    l.is_published = true
GROUP BY 
    m.course_id, lp.user_id;
