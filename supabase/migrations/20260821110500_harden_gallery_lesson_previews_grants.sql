-- A view herdou os privilégios default do schema (INSERT/UPDATE/DELETE/etc.
-- para anon/authenticated) — inertes hoje porque é uma view de junção sem
-- trigger INSTEAD OF, mas sem motivo para deixar concedidos. Only SELECT.
REVOKE ALL ON public.gallery_lesson_previews FROM anon, authenticated;
GRANT SELECT ON public.gallery_lesson_previews TO anon, authenticated;
