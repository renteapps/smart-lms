-- Adicionando colunas geradas e índices GIN para Full-Text Search
-- Baseado nas melhores práticas: https://supabase.com/docs/guides/database/full-text-search

-- 1. PROFILES
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('portuguese', coalesce(full_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(headline, '') || ' ' || coalesce(bio, ''))
) STORED;

CREATE INDEX IF NOT EXISTS profiles_search_idx ON profiles USING GIN (search_vector);


-- 2. COURSES
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, ''))
) STORED;

CREATE INDEX IF NOT EXISTS courses_search_idx ON courses USING GIN (search_vector);


-- 3. LESSONS
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(content, ''))
) STORED;

CREATE INDEX IF NOT EXISTS lessons_search_idx ON lessons USING GIN (search_vector);


-- 4. ARTICLES
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(body, ''))
) STORED;

CREATE INDEX IF NOT EXISTS articles_search_idx ON articles USING GIN (search_vector);


-- 5. AGENTS
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('portuguese', coalesce(name, '') || ' ' || coalesce(role, '') || ' ' || coalesce(description, '') || ' ' || coalesce(greeting, ''))
) STORED;

CREATE INDEX IF NOT EXISTS agents_search_idx ON agents USING GIN (search_vector);


-- 6. COMPANIES
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('portuguese', coalesce(name, '') || ' ' || coalesce(trade_name, '') || ' ' || coalesce(cnpj, ''))
) STORED;

CREATE INDEX IF NOT EXISTS companies_search_idx ON companies USING GIN (search_vector);


-- 7. STUDENT_NOTES
ALTER TABLE student_notes 
ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('portuguese', coalesce(lesson_title, '') || ' ' || coalesce(content, ''))
) STORED;

CREATE INDEX IF NOT EXISTS student_notes_search_idx ON student_notes USING GIN (search_vector);


-- 8. FUNÇÃO RPC PARA BUSCA UNIFICADA
-- SECURITY INVOKER para respeitar RLS (importante para student_notes)
CREATE OR REPLACE FUNCTION search_unified(query_text text)
RETURNS TABLE (
  id text,
  type text,
  title text,
  description text,
  category text,
  url text,
  metadata jsonb,
  rank real
) 
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  parsed_query tsquery;
BEGIN
  -- websearch_to_tsquery converte termos separados por espaço em busca lógica inteligente
  parsed_query := websearch_to_tsquery('portuguese', query_text);

  IF query_text = '' OR query_text IS NULL THEN
    parsed_query := NULL;
  END IF;

  RETURN QUERY

  -- AULAS
  SELECT 
    l.id::text as id,
    'lesson'::text as type,
    l.title as title,
    l.short_description::character varying as description,
    COALESCE((SELECT c.category FROM courses c JOIN modules m ON c.id = m.course_id WHERE m.id = l.module_id LIMIT 1), 'Geral') as category,
    '/courses/' || (SELECT c.id FROM courses c JOIN modules m ON c.id = m.course_id WHERE m.id = l.module_id LIMIT 1) || '/lessons/' || l.id as url,
    jsonb_build_object('duration', l.duration_in_minutes || ' min', 'lessonType', l.type) as metadata,
    CASE WHEN parsed_query IS NULL THEN 0.0 ELSE ts_rank(l.search_vector, parsed_query) END as rank
  FROM lessons l
  WHERE (parsed_query IS NULL OR l.search_vector @@ parsed_query)
    AND l.is_published = true

  UNION ALL

  -- AGENTES
  SELECT 
    a.id::text as id,
    'agent'::text as type,
    a.name as title,
    a.description as description,
    a.category as category,
    '/agentes/' || a.slug as url,
    jsonb_build_object('role', a.role, 'skills', a.skills, 'avatar', a.avatar) as metadata,
    CASE WHEN parsed_query IS NULL THEN 0.0 ELSE ts_rank(a.search_vector, parsed_query) END as rank
  FROM agents a
  WHERE (parsed_query IS NULL OR a.search_vector @@ parsed_query)
    AND a.status = 'active'

  UNION ALL

  -- ARTIGOS
  SELECT 
    ar.id::text as id,
    'article'::text as type,
    ar.title as title,
    ar.excerpt as description,
    ar.category as category,
    '/blog/' || ar.slug as url,
    jsonb_build_object('author', ar.author, 'readingTime', ar.reading_time, 'cover', ar.cover) as metadata,
    CASE WHEN parsed_query IS NULL THEN 0.0 ELSE ts_rank(ar.search_vector, parsed_query) END as rank
  FROM articles ar
  WHERE (parsed_query IS NULL OR ar.search_vector @@ parsed_query)
    AND ar.is_published = true

  UNION ALL

  -- NOTAS (Aplicará RLS da tabela student_notes automaticamente, pois estamos em SECURITY INVOKER)
  SELECT 
    n.id::text as id,
    'note'::text as type,
    n.lesson_title as title,
    n.content as description,
    'Minhas Anotações'::text as category,
    '/notas' as url,
    jsonb_build_object('pinned', n.pinned, 'updatedAt', n.updated_at) as metadata,
    CASE WHEN parsed_query IS NULL THEN 0.0 ELSE ts_rank(n.search_vector, parsed_query) END as rank
  FROM student_notes n
  WHERE (parsed_query IS NULL OR n.search_vector @@ parsed_query)

  -- ORDER BY na união de todos
  ORDER BY rank DESC
  LIMIT 100;
END;
$$;
