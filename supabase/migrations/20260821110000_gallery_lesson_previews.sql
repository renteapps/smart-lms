-- Prévia pública das aulas de curso galeria.
--
-- `lessons`/`modules` só liberam SELECT para quem tem matrícula ativa (ou é
-- admin) — correto para o conteúdo em si, mas isso também escondia a galeria
-- inteira de quem ainda não comprou, quebrando a vitrine "veja travado, compre
-- se quiser" que o resto da plataforma já usa para cursos (`CourseCard`).
--
-- Esta view expõe só as colunas de vitrine (nada de video_url, content,
-- blocks, transcription) de aulas de curso galeria publicado, para qualquer
-- usuário autenticado — independente de matrícula. Por não ter
-- `security_invoker`, ela roda com o privilégio do dono (que ignora RLS nas
-- tabelas de baixo), então o GRANT abaixo é o único controle de acesso: quem
-- pode ler a view lê exatamente essas colunas, de aulas publicadas de cursos
-- galeria publicados — nunca o conteúdo real da aula.
CREATE OR REPLACE VIEW public.gallery_lesson_previews AS
SELECT
  l.id,
  l.module_id,
  m.course_id,
  l.title,
  l.short_description,
  l.cover_url,
  l.duration_in_minutes,
  l.order_index,
  l.slug,
  l.created_at
FROM public.lessons l
JOIN public.modules m ON m.id = l.module_id
JOIN public.courses c ON c.id = m.course_id
WHERE c.layout = 'gallery'
  AND c.is_published = true
  AND c.status <> 'Arquivado'
  AND l.is_published = true;

GRANT SELECT ON public.gallery_lesson_previews TO authenticated;
