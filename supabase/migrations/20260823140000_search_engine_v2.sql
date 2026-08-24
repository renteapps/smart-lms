-- =============================================================================
-- Motor de busca v2
-- =============================================================================
-- A v1 (20260821071700) tinha três problemas estruturais:
--
--  1. `search_unified` nunca retornava CURSOS (a aba existia e vivia zerada) e
--     filtrava agentes por `status = 'active'`, valor que nenhuma linha usa —
--     a aba "Agentes IA" também vivia zerada.
--  2. Rodava como SECURITY INVOKER, e a RLS de `lessons`/`modules` só libera
--     aula para quem tem matrícula ativa. Resultado: busca de aula só
--     funcionava dentro do que o aluno já comprou — o oposto de descoberta.
--  3. `to_tsvector('portuguese', ...)` sem `unaccent` e sem `setweight`:
--     "comunicacao" não achava "comunicação", e um termo no corpo do texto
--     pesava igual ao mesmo termo no título.
--
-- Esta migração troca o motor inteiro:
--   * configuração `pt_unaccent` (português + unaccent) → busca cega a acento;
--   * `setweight` A/B/C → título > metadados > corpo;
--   * consulta com prefixo (`:*`) → resultado enquanto se digita;
--   * fallback por trigrama → tolera erro de digitação;
--   * SECURITY DEFINER com recorte explícito do que é publicado, mais um
--     vetor "de vitrine" para aula travada (nunca casa no corpo/transcrição
--     de conteúdo que a pessoa não comprou);
--   * facetas e paginação calculadas no banco, em uma única ida.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensões e configuração de busca
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

/*
 * `unaccent(text)` de um argumento é STABLE (resolve o dicionário em tempo de
 * execução), então não pode entrar em coluna gerada nem em índice. A forma de
 * dois argumentos, com o dicionário fixado, é IMMUTABLE — este wrapper existe
 * só para poder indexar e normalizar em expressões.
 */
CREATE OR REPLACE FUNCTION public.f_unaccent(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path = ''
AS $$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary, txt);
$$;

/*
 * `array_to_string(anyarray, text)` é declarada STABLE — genérica, teria que
 * chamar a função de saída de qualquer tipo de elemento. Para `text[]` a
 * conversão é trivialmente imutável, e coluna gerada só aceita IMMUTABLE.
 */
CREATE OR REPLACE FUNCTION public.f_array_text(arr text[], sep text DEFAULT ' ')
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT coalesce(array_to_string(coalesce(arr, '{}'::text[]), sep), '');
$$;

/*
 * Nota de cada termo digitado contra o texto do documento, resumida pelo
 * **pior** termo (`min`). Exigir que todos passem é a mesma semântica "E" da
 * busca estrita — o contrário faria "comunicação futebol" casar com qualquer
 * aula de comunicação.
 *
 * Termos de até dois caracteres saem fora: são preposição e artigo, e num
 * texto longo qualquer sequência curta encontra parecença.
 *
 * Com um termo só, `min` é o próprio `word_similarity` — o comportamento
 * anterior continua valendo.
 */
CREATE OR REPLACE FUNCTION public.search_fuzzy_score(p_norm text, p_target text)
RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  -- Função total: nunca devolve NULL. A nota entra numa soma ponderada, e um
  -- NULL ali zeraria a pontuação inteira do documento, não só esta parcela.
  SELECT CASE
    WHEN coalesce(p_norm, '') = '' OR coalesce(p_target, '') = '' THEN 0::real
    ELSE coalesce(
      (
        SELECT min(extensions.word_similarity(tok, p_target))::real
        FROM regexp_split_to_table(p_norm, '[^[:alnum:]]+') AS tok
        WHERE length(tok) >= 3
      ),
      0::real
    )
  END;
$$;

/*
 * Configuração de busca do produto: stemmer português + remoção de acento.
 * Criada condicionalmente porque um DROP levaria junto (CASCADE) todas as
 * colunas geradas que dependem dela.
 */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_ts_config c
    JOIN pg_namespace n ON n.oid = c.cfgnamespace
    WHERE n.nspname = 'public' AND c.cfgname = 'pt_unaccent'
  ) THEN
    CREATE TEXT SEARCH CONFIGURATION public.pt_unaccent (COPY = pg_catalog.portuguese);
    ALTER TEXT SEARCH CONFIGURATION public.pt_unaccent
      ALTER MAPPING FOR hword, hword_part, word
      WITH extensions.unaccent, portuguese_stem;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Vetores de busca ponderados
-- -----------------------------------------------------------------------------
-- Peso A = título (o que a pessoa provavelmente digitou)
-- Peso B = metadados de navegação (categoria, tags, papel, autor)
-- Peso C = corpo (descrição longa, conteúdo, transcrição)
--
-- `left(...)` limita o corpo porque tsvector estoura em 1MB e transcrição de
-- vídeo passa disso com facilidade.

/*
 * `v_course_metrics` faz `SELECT c.*`, então depende nominalmente de
 * `courses.search_vector` e bloqueia o DROP da coluna. Cai aqui e volta
 * idêntica no fim da seção.
 */
DROP VIEW IF EXISTS public.v_course_metrics;

-- CURSOS -----------------------------------------------------------------
ALTER TABLE public.courses DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.courses ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('public.pt_unaccent', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('public.pt_unaccent',
    coalesce(category, '') || ' ' ||
    public.f_array_text(tags) || ' ' ||
    coalesce(level, '') || ' ' ||
    coalesce(coordinator_name, '') || ' ' ||
    public.f_array_text(instructor_names)
  ), 'B') ||
  setweight(to_tsvector('public.pt_unaccent',
    coalesce(short_description, '') || ' ' || left(coalesce(description, ''), 60000)
  ), 'C')
) STORED;
CREATE INDEX IF NOT EXISTS courses_search_idx ON public.courses USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS courses_title_trgm_idx
  ON public.courses USING GIN (public.f_unaccent(lower(title)) extensions.gin_trgm_ops);

-- AULAS ------------------------------------------------------------------
ALTER TABLE public.lessons DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.lessons ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('public.pt_unaccent', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('public.pt_unaccent',
    coalesce(short_description, '') || ' ' ||
    coalesce(objective, '') || ' ' ||
    coalesce(level, '') || ' ' ||
    public.f_array_text(topics) || ' ' ||
    public.f_array_text(solves)
  ), 'B') ||
  setweight(to_tsvector('public.pt_unaccent',
    left(coalesce(content, ''), 60000) || ' ' || left(coalesce(transcription, ''), 200000)
  ), 'C')
) STORED;
CREATE INDEX IF NOT EXISTS lessons_search_idx ON public.lessons USING GIN (search_vector);

/*
 * Vetor de vitrine: só o que já é público na capa do curso (título, resumo,
 * objetivo, tópicos). Aula travada é casada por ESTE vetor, nunca pelo
 * completo — do contrário a busca viraria um oráculo sobre o conteúdo pago
 * ("existe a palavra X na transcrição da aula que eu não comprei?").
 */
ALTER TABLE public.lessons DROP COLUMN IF EXISTS search_vector_public;
ALTER TABLE public.lessons ADD COLUMN search_vector_public tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('public.pt_unaccent', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('public.pt_unaccent',
    coalesce(short_description, '') || ' ' ||
    coalesce(objective, '') || ' ' ||
    coalesce(level, '') || ' ' ||
    public.f_array_text(topics)
  ), 'B')
) STORED;
CREATE INDEX IF NOT EXISTS lessons_search_public_idx
  ON public.lessons USING GIN (search_vector_public);
CREATE INDEX IF NOT EXISTS lessons_title_trgm_idx
  ON public.lessons USING GIN (public.f_unaccent(lower(title)) extensions.gin_trgm_ops);

-- ARTIGOS ----------------------------------------------------------------
ALTER TABLE public.articles DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.articles ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('public.pt_unaccent', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('public.pt_unaccent',
    coalesce(category, '') || ' ' || coalesce(author, '')
  ), 'B') ||
  setweight(to_tsvector('public.pt_unaccent',
    coalesce(excerpt, '') || ' ' ||
    left(coalesce(body, ''), 60000) || ' ' ||
    left(coalesce(audio_transcript, ''), 60000)
  ), 'C')
) STORED;
CREATE INDEX IF NOT EXISTS articles_search_idx ON public.articles USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS articles_title_trgm_idx
  ON public.articles USING GIN (public.f_unaccent(lower(title)) extensions.gin_trgm_ops);

-- AGENTES ----------------------------------------------------------------
ALTER TABLE public.agents DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.agents ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('public.pt_unaccent', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('public.pt_unaccent',
    coalesce(role, '') || ' ' ||
    coalesce(category, '') || ' ' ||
    public.f_array_text(skills) || ' ' ||
    coalesce(course_title, '')
  ), 'B') ||
  setweight(to_tsvector('public.pt_unaccent',
    coalesce(description, '') || ' ' || coalesce(greeting, '')
  ), 'C')
) STORED;
CREATE INDEX IF NOT EXISTS agents_search_idx ON public.agents USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS agents_name_trgm_idx
  ON public.agents USING GIN (public.f_unaccent(lower(name)) extensions.gin_trgm_ops);

-- ANOTAÇÕES --------------------------------------------------------------
ALTER TABLE public.student_notes DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.student_notes ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('public.pt_unaccent', coalesce(lesson_title, '')), 'A') ||
  setweight(to_tsvector('public.pt_unaccent',
    public.f_array_text(tags)
  ), 'B') ||
  setweight(to_tsvector('public.pt_unaccent', left(coalesce(content, ''), 60000)), 'C')
) STORED;
CREATE INDEX IF NOT EXISTS student_notes_search_idx
  ON public.student_notes USING GIN (search_vector);

-- PERFIS / EMPRESAS (busca do admin) -------------------------------------
ALTER TABLE public.profiles DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.profiles ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('public.pt_unaccent', coalesce(full_name, '') || ' ' || coalesce(email, '')), 'A') ||
  setweight(to_tsvector('public.pt_unaccent', coalesce(headline, '')), 'B') ||
  setweight(to_tsvector('public.pt_unaccent', coalesce(bio, '')), 'C')
) STORED;
CREATE INDEX IF NOT EXISTS profiles_search_idx ON public.profiles USING GIN (search_vector);

ALTER TABLE public.companies DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.companies ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('public.pt_unaccent', coalesce(name, '') || ' ' || coalesce(trade_name, '')), 'A') ||
  setweight(to_tsvector('public.pt_unaccent', coalesce(cnpj, '')), 'B')
) STORED;
CREATE INDEX IF NOT EXISTS companies_search_idx ON public.companies USING GIN (search_vector);

-- Recria a view derrubada acima, com a mesma definição de
-- 20260821174500_course_metrics_view.sql.
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

-- -----------------------------------------------------------------------------
-- 3. Interpretação do termo digitado
-- -----------------------------------------------------------------------------
/*
 * Une duas leituras do mesmo texto:
 *
 *   websearch_to_tsquery — respeita "aspas", -exclusão e OR, como o usuário
 *     espera de um campo de busca;
 *   consulta com prefixo — cada token vira `token:*`, o que faz "comunic"
 *     achar "comunicação" enquanto a pessoa ainda digita.
 *
 * O prefixo é desligado quando há operador explícito no texto: quem escreveu
 * `"prática deliberada"` pediu a frase exata, não um prefixo.
 */
CREATE OR REPLACE FUNCTION public.search_build_tsquery(query_text text)
RETURNS tsquery
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  cleaned  text;
  web      tsquery;
  prefix   tsquery;
  tokens   text[];
BEGIN
  cleaned := btrim(coalesce(query_text, ''));
  IF cleaned = '' THEN RETURN NULL; END IF;
  cleaned := left(cleaned, 160);

  BEGIN
    web := websearch_to_tsquery('public.pt_unaccent', cleaned);
  EXCEPTION WHEN OTHERS THEN
    web := NULL;
  END;
  IF web = ''::tsquery THEN web := NULL; END IF;

  IF position('"' IN cleaned) = 0
     AND cleaned !~ '(^|\s)-\S'
     AND cleaned !~* '(^|\s)or(\s|$)'
  THEN
    tokens := ARRAY(
      SELECT tok
      FROM regexp_split_to_table(public.f_unaccent(lower(cleaned)), '[^[:alnum:]]+') AS tok
      WHERE length(tok) > 0
      LIMIT 8
    );

    IF coalesce(array_length(tokens, 1), 0) > 0 THEN
      BEGIN
        prefix := to_tsquery('public.pt_unaccent', array_to_string(tokens, ':* & ') || ':*');
      EXCEPTION WHEN OTHERS THEN
        prefix := NULL;
      END;
      IF prefix = ''::tsquery THEN prefix := NULL; END IF;
    END IF;
  END IF;

  IF web IS NULL THEN RETURN prefix; END IF;
  IF prefix IS NULL THEN RETURN web; END IF;
  RETURN web || prefix;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Direito de acesso a curso (espelha src/lib/courseAccess.ts)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plan_allows_course(features jsonb, course_id uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    -- Sem features, ou features em formato de lista legado: plano libera tudo.
    WHEN features IS NULL OR jsonb_typeof(features) <> 'object' THEN true
    WHEN coalesce(
           features ->> 'courseAccessType',
           CASE
             WHEN jsonb_typeof(features -> 'specificCourses') = 'array'
              AND jsonb_array_length(features -> 'specificCourses') > 0
             THEN 'specific' ELSE 'all'
           END
         ) = 'all' THEN true
    ELSE jsonb_typeof(features -> 'specificCourses') = 'array'
         AND (features -> 'specificCourses') ? course_id::text
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_entitled_course_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(DISTINCT cid), '{}'::uuid[])
  FROM (
    SELECT e.course_id AS cid
    FROM public.enrollments e
    WHERE e.user_id = (SELECT auth.uid())
      AND e.status = 'active'
      AND (e.expires_at IS NULL OR e.expires_at > now())

    UNION

    SELECT c.id
    FROM public.courses c
    WHERE EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.plans p ON p.id = s.plan_id
      WHERE s.user_id = (SELECT auth.uid())
        AND s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
        AND coalesce(p.is_active, true) = true
        AND public.plan_allows_course(p.features, c.id)
    )
  ) t;
$$;

/*
 * Auxiliar interno: só `search_documents` chama. O Supabase concede EXECUTE a
 * anon/authenticated por privilégio padrão na criação, e `REVOKE ... FROM
 * PUBLIC` não desfaz concessão nominal — daí revogar os papéis por nome.
 */
REVOKE ALL ON FUNCTION public.user_entitled_course_ids() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Candidatos: um documento por conteúdo pesquisável
-- -----------------------------------------------------------------------------
/*
 * SECURITY DEFINER porque `lessons`/`modules` só liberam SELECT para quem tem
 * matrícula ativa — regra correta para o conteúdo, errada para a descoberta.
 * O recorte do que é visível passa a ser explícito aqui:
 *
 *   - curso/aula/artigo/agente: apenas publicado e não arquivado;
 *   - aula sem direito de acesso: casa no `search_vector_public` (título,
 *     resumo, objetivo, tópicos) e devolve `body = NULL`, então nunca vaza
 *     conteúdo nem transcrição de aula paga;
 *   - anotação: `user_id = auth.uid()`, sem exceção.
 *
 * A tolerância a erro de digitação usa `search_fuzzy_score`, que aplica
 * `word_similarity` **por termo digitado** e fica com o pior deles (ver
 * 20260824100000). Comparar a frase inteira de uma vez fazia
 * `comunicaçao assertva` devolver zero: a média de duas palavras erradas
 * afunda abaixo do limiar mesmo quando cada uma, sozinha, casaria.
 *
 * `p_query NULL` + `p_fuzzy false` = modo navegação (vitrine sem termo).
 * `p_query NULL` + `p_fuzzy true`  = passada por trigrama (tolerância a erro
 *                                    de digitação), usada só quando a passada
 *                                    estrita não achou nada.
 */
CREATE OR REPLACE FUNCTION public.search_documents(
  p_query text,
  p_norm  text,
  p_fuzzy boolean DEFAULT false
)
RETURNS TABLE (
  doc_id      text,
  doc_type    text,
  doc_title   text,
  description text,
  category    text,
  url         text,
  body        text,
  sort_date   timestamptz,
  has_access  boolean,
  metadata    jsonb,
  fts         real,
  trgm        real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ts      tsquery := public.search_build_tsquery(p_query);
  v_norm    text    := coalesce(p_norm, '');
  v_admin   boolean := public.is_admin();
  v_owned   uuid[]  := public.user_entitled_course_ids();
  v_uid     uuid    := auth.uid();
  v_weights float4[] := '{0.05, 0.30, 0.70, 1.00}';  -- {D, C, B, A}
  v_cap     int     := 250;                          -- teto por fonte
BEGIN
  RETURN QUERY

  -- CURSOS -----------------------------------------------------------------
  (
    SELECT
      c.id::text,
      'course'::text,
      c.title,
      coalesce(nullif(btrim(c.short_description), ''), left(coalesce(c.description, ''), 240)),
      coalesce(nullif(btrim(c.category), ''), 'Geral'),
      '/courses/' || coalesce(nullif(c.slug, ''), c.id::text),
      left(coalesce(c.description, ''), 4000),
      coalesce(c.updated_at, c.created_at),
      (v_admin OR c.id = ANY(v_owned)),
      jsonb_strip_nulls(jsonb_build_object(
        'courseId',   c.id::text,
        'cover',      c.cover_url,
        'level',      c.level,
        'duration',   c.duration,
        'tags',       to_jsonb(coalesce(c.tags, '{}'::text[])),
        'isFeatured', c.is_featured,
        'hasAccess',  (v_admin OR c.id = ANY(v_owned))
      )),
      CASE WHEN v_ts IS NULL THEN 0::real ELSE ts_rank_cd(v_weights, c.search_vector, v_ts, 32) END,
      CASE WHEN v_norm = '' THEN 0::real
           ELSE public.search_fuzzy_score(v_norm, public.f_unaccent(lower(c.title || ' ' || coalesce(c.short_description, '')))) END
    FROM public.courses c
    WHERE c.is_published = true
      AND coalesce(c.status, '') <> 'Arquivado'
      AND (
        (v_ts IS NOT NULL AND c.search_vector @@ v_ts)
        OR (v_ts IS NULL AND NOT p_fuzzy)
        OR (p_fuzzy AND v_norm <> '' AND public.search_fuzzy_score(v_norm, public.f_unaccent(lower(c.title || ' ' || coalesce(c.short_description, '')))) >= 0.45)
      )
    ORDER BY CASE WHEN v_ts IS NULL THEN 0::real ELSE ts_rank_cd(v_weights, c.search_vector, v_ts, 32) END DESC
    LIMIT v_cap
  )

  UNION ALL

  -- AULAS ------------------------------------------------------------------
  (
    SELECT
      l.id::text,
      'lesson'::text,
      l.title,
      coalesce(nullif(btrim(l.short_description::text), ''), nullif(btrim(l.objective), ''), ''),
      coalesce(nullif(btrim(c.category), ''), 'Geral'),
      '/courses/' || coalesce(nullif(c.slug, ''), c.id::text)
        || '/lessons/' || coalesce(nullif(l.slug, ''), l.id::text),
      -- Corpo só para quem tem acesso: sem isso a busca viraria um oráculo
      -- sobre o conteúdo pago.
      CASE WHEN (v_admin OR c.id = ANY(v_owned))
           THEN left(coalesce(l.content, '') || ' ' || coalesce(l.transcription, ''), 8000)
           ELSE NULL END,
      coalesce(l.updated_at, l.created_at),
      (v_admin OR c.id = ANY(v_owned)),
      jsonb_strip_nulls(jsonb_build_object(
        'courseId',    c.id::text,
        'courseSlug',  coalesce(nullif(c.slug, ''), c.id::text),
        'courseTitle', c.title,
        'moduleTitle', m.title,
        'duration',    l.duration_in_minutes,
        'lessonType',  l.type,
        'level',       l.level,
        'cover',       coalesce(l.cover_url, c.cover_url),
        'hasAccess',   (v_admin OR c.id = ANY(v_owned)),
        -- Aula já concluída não deve parecer idêntica a uma nunca vista.
        'isCompleted', coalesce(lp.is_completed, false)
      )),
      CASE WHEN v_ts IS NULL THEN 0::real
           ELSE ts_rank_cd(
             v_weights,
             CASE WHEN (v_admin OR c.id = ANY(v_owned)) THEN l.search_vector ELSE l.search_vector_public END,
             v_ts, 32) END,
      CASE WHEN v_norm = '' THEN 0::real
           ELSE public.search_fuzzy_score(v_norm, public.f_unaccent(lower(l.title || ' ' || coalesce(l.short_description::text, '')))) END
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    -- LEFT: a aula existe para quem nunca a abriu.
    LEFT JOIN public.lesson_progress lp
           ON lp.lesson_id = l.id AND lp.user_id = v_uid
    WHERE l.is_published = true
      AND c.is_published = true
      AND coalesce(c.status, '') <> 'Arquivado'
      AND (
        (v_ts IS NOT NULL AND
          CASE WHEN (v_admin OR c.id = ANY(v_owned)) THEN l.search_vector ELSE l.search_vector_public END @@ v_ts)
        OR (v_ts IS NULL AND NOT p_fuzzy)
        OR (p_fuzzy AND v_norm <> '' AND public.search_fuzzy_score(v_norm, public.f_unaccent(lower(l.title || ' ' || coalesce(l.short_description::text, '')))) >= 0.45)
      )
    ORDER BY CASE WHEN v_ts IS NULL THEN 0::real
                  ELSE ts_rank_cd(v_weights,
                    CASE WHEN (v_admin OR c.id = ANY(v_owned)) THEN l.search_vector ELSE l.search_vector_public END,
                    v_ts, 32) END DESC
    LIMIT v_cap
  )

  UNION ALL

  -- AGENTES ------------------------------------------------------------------
  (
    SELECT
      a.id::text,
      'agent'::text,
      a.name,
      coalesce(nullif(btrim(a.description), ''), coalesce(a.role, '')),
      coalesce(nullif(btrim(a.category), ''), 'Agentes'),
      '/agentes/' || coalesce(nullif(a.slug, ''), a.id::text),
      left(coalesce(a.description, '') || ' ' || coalesce(a.greeting, ''), 4000),
      coalesce(a.updated_at, a.created_at),
      true,
      jsonb_strip_nulls(jsonb_build_object(
        'role',        a.role,
        'avatar',      coalesce(a.photo_url, a.avatar),
        'skills',      to_jsonb(coalesce(a.skills, '{}'::text[])),
        'rating',      a.rating,
        'agentStatus', a.status,
        'courseTitle', a.course_title,
        'themeColor',  a.theme_color
      )),
      CASE WHEN v_ts IS NULL THEN 0::real ELSE ts_rank_cd(v_weights, a.search_vector, v_ts, 32) END,
      CASE WHEN v_norm = '' THEN 0::real
           ELSE public.search_fuzzy_score(v_norm, public.f_unaccent(lower(a.name || ' ' || coalesce(a.role, '')))) END
    FROM public.agents a
    WHERE a.is_published = true
      AND (
        (v_ts IS NOT NULL AND a.search_vector @@ v_ts)
        OR (v_ts IS NULL AND NOT p_fuzzy)
        OR (p_fuzzy AND v_norm <> '' AND public.search_fuzzy_score(v_norm, public.f_unaccent(lower(a.name || ' ' || coalesce(a.role, '')))) >= 0.45)
      )
    ORDER BY CASE WHEN v_ts IS NULL THEN 0::real ELSE ts_rank_cd(v_weights, a.search_vector, v_ts, 32) END DESC
    LIMIT v_cap
  )

  UNION ALL

  -- ARTIGOS ------------------------------------------------------------------
  (
    SELECT
      ar.id::text,
      'article'::text,
      ar.title,
      coalesce(nullif(btrim(ar.excerpt), ''), ''),
      coalesce(nullif(btrim(ar.category), ''), 'Revista'),
      '/blog/' || coalesce(nullif(ar.slug, ''), ar.id::text),
      left(coalesce(ar.body, '') || ' ' || coalesce(ar.audio_transcript, ''), 8000),
      coalesce(ar.published_at, ar.updated_at, ar.created_at),
      true,
      jsonb_strip_nulls(jsonb_build_object(
        'author',      ar.author,
        'readingTime', ar.reading_time,
        'hasAudio',    (ar.audio_url IS NOT NULL AND ar.audio_url <> ''),
        'cover',       ar.cover,
        'isFeatured',  ar.featured
      )),
      CASE WHEN v_ts IS NULL THEN 0::real ELSE ts_rank_cd(v_weights, ar.search_vector, v_ts, 32) END,
      CASE WHEN v_norm = '' THEN 0::real
           ELSE public.search_fuzzy_score(v_norm, public.f_unaccent(lower(ar.title || ' ' || coalesce(ar.excerpt, '')))) END
    FROM public.articles ar
    WHERE ar.is_published = true
      AND (
        (v_ts IS NOT NULL AND ar.search_vector @@ v_ts)
        OR (v_ts IS NULL AND NOT p_fuzzy)
        OR (p_fuzzy AND v_norm <> '' AND public.search_fuzzy_score(v_norm, public.f_unaccent(lower(ar.title || ' ' || coalesce(ar.excerpt, '')))) >= 0.45)
      )
    ORDER BY CASE WHEN v_ts IS NULL THEN 0::real ELSE ts_rank_cd(v_weights, ar.search_vector, v_ts, 32) END DESC
    LIMIT v_cap
  )

  UNION ALL

  -- ANOTAÇÕES ----------------------------------------------------------------
  (
    SELECT
      n.id::text,
      'note'::text,
      coalesce(nullif(btrim(n.lesson_title), ''), 'Anotação sem título'),
      left(coalesce(n.content, ''), 240),
      'Minhas Anotações'::text,
      '/notas?nota=' || n.id::text,
      left(coalesce(n.content, ''), 8000),
      coalesce(n.updated_at, n.created_at),
      true,
      jsonb_strip_nulls(jsonb_build_object(
        'tags',      to_jsonb(coalesce(n.tags, '{}'::text[])),
        'pinned',    n.pinned,
        'updatedAt', n.updated_at,
        'noteKind',  coalesce(n.kind, 'lesson'),
        'lessonId',  n.lesson_id::text
      )),
      CASE WHEN v_ts IS NULL THEN 0::real ELSE ts_rank_cd(v_weights, n.search_vector, v_ts, 32) END,
      CASE WHEN v_norm = '' THEN 0::real
           ELSE public.search_fuzzy_score(v_norm, public.f_unaccent(lower(coalesce(n.lesson_title, '') || ' ' || left(coalesce(n.content, ''), 400)))) END
    FROM public.student_notes n
    WHERE v_uid IS NOT NULL
      AND n.user_id = v_uid
      AND (
        (v_ts IS NOT NULL AND n.search_vector @@ v_ts)
        OR (v_ts IS NULL AND NOT p_fuzzy)
        OR (p_fuzzy AND v_norm <> '' AND public.search_fuzzy_score(v_norm, public.f_unaccent(lower(coalesce(n.lesson_title, '') || ' ' || left(coalesce(n.content, ''), 400)))) >= 0.45)
      )
    ORDER BY CASE WHEN v_ts IS NULL THEN 0::real ELSE ts_rank_cd(v_weights, n.search_vector, v_ts, 32) END DESC
    LIMIT v_cap
  );
END;
$$;

/*
 * Também interno. Quem busca chama `search_unified`; deixar o montador de
 * candidatos exposto na API REST só ampliaria a superfície sem dar nada em
 * troca (ver o aviso 0028 do linter do Supabase).
 */
REVOKE ALL ON FUNCTION public.search_documents(text, text, boolean) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Busca unificada: pontuação, facetas, ordenação e paginação
-- -----------------------------------------------------------------------------
-- A v1 tinha assinatura de um argumento só; some para não ficar ambígua.
DROP FUNCTION IF EXISTS public.search_unified(text);

/*
 * Devolve o payload inteiro da tela em UMA ida ao banco:
 * itens da página + total + contagem por tipo + categorias disponíveis.
 *
 * Facetas seguem a semântica usual de busca facetada: a contagem por tipo
 * considera o filtro de categoria (mas não o de tipo) e vice-versa — assim
 * nenhuma aba/categoria some enquanto ainda tem resultado atrás dela.
 *
 * A pontuação combina quatro sinais, todos normalizados em 0..1:
 *   0.62  relevância textual ponderada (título > metadado > corpo)
 *   0.22  afinidade de título (igual / começa com / contém o termo)
 *   0.16  similaridade por trigrama (tolerância a erro de digitação)
 *   +     empurrão pequeno por tipo e por recência, para desempatar
 */
CREATE OR REPLACE FUNCTION public.search_unified(
  query_text      text DEFAULT '',
  filter_type     text DEFAULT 'all',
  filter_category text DEFAULT NULL,
  sort_by         text DEFAULT 'relevance',
  page_size       int  DEFAULT 24,
  page_offset     int  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
-- DEFINER para alcançar `search_documents` e `user_entitled_course_ids`, que
-- não são mais executáveis pelos papéis da API. O recorte de visibilidade
-- continua inteiro dentro de `search_documents`.
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_raw    text    := nullif(btrim(coalesce(query_text, '')), '');
  v_norm   text;
  v_ts     tsquery;
  v_type   text    := lower(coalesce(nullif(btrim(filter_type), ''), 'all'));
  v_cat    text    := nullif(btrim(coalesce(filter_category, '')), '');
  v_sort   text    := lower(coalesce(nullif(btrim(sort_by), ''), 'relevance'));
  v_limit  int     := least(greatest(coalesce(page_size, 24), 1), 60);
  v_offset int     := least(greatest(coalesce(page_offset, 0), 0), 5000);
  v_result jsonb;
BEGIN
  v_norm := coalesce(public.f_unaccent(lower(coalesce(v_raw, ''))), '');
  v_ts   := public.search_build_tsquery(v_raw);

  IF v_type NOT IN ('all', 'course', 'lesson', 'agent', 'article', 'note') THEN v_type := 'all'; END IF;
  IF v_sort NOT IN ('relevance', 'recent', 'az') THEN v_sort := 'relevance'; END IF;
  IF v_cat IN ('Todas', 'todas') THEN v_cat := NULL; END IF;

  WITH strict_docs AS MATERIALIZED (
    SELECT * FROM public.search_documents(v_raw, v_norm, false)
  ),
  /*
   * A passada por trigrama só existe quando a estrita não achou nada. O
   * `NOT EXISTS` sobre `strict_docs` não referencia coluna alguma da varredura,
   * então o planejador o resolve como filtro único e pula a subárvore inteira
   * no caminho feliz.
   */
  fuzzy_docs AS MATERIALIZED (
    SELECT * FROM public.search_documents(NULL, v_norm, true)
    WHERE v_raw IS NOT NULL AND NOT EXISTS (SELECT 1 FROM strict_docs)
  ),
  base AS (
    SELECT d.* FROM strict_docs d
    UNION ALL
    SELECT d.* FROM fuzzy_docs d
  ),
  ranked AS (
    SELECT
      b.*,
      (
        0.62 * b.fts
        + 0.22 * CASE
            WHEN v_norm = '' THEN 0
            WHEN public.f_unaccent(lower(b.doc_title)) = v_norm THEN 1.0
            WHEN starts_with(public.f_unaccent(lower(b.doc_title)), v_norm) THEN 0.75
            WHEN position(v_norm IN public.f_unaccent(lower(b.doc_title))) > 0 THEN 0.5
            ELSE 0
          END
        + 0.16 * b.trgm
        + CASE b.doc_type
            WHEN 'note'   THEN 0.06
            WHEN 'course' THEN 0.04
            WHEN 'lesson' THEN 0.02
            WHEN 'agent'  THEN 0.02
            ELSE 0
          END
        + 0.03 / (1.0 + (extract(epoch FROM (now() - coalesce(b.sort_date, now()))) / 86400.0) / 180.0)
      )::real AS score
    FROM base b
  ),
  type_counts AS (
    SELECT r.doc_type, count(*)::bigint AS n
    FROM ranked r
    WHERE v_cat IS NULL OR r.category = v_cat
    GROUP BY r.doc_type
  ),
  category_counts AS (
    SELECT r.category, count(*)::bigint AS n
    FROM ranked r
    WHERE (v_type = 'all' OR r.doc_type = v_type)
      AND r.category IS NOT NULL
    GROUP BY r.category
  ),
  filtered AS (
    SELECT r.* FROM ranked r
    WHERE (v_type = 'all' OR r.doc_type = v_type)
      AND (v_cat IS NULL OR r.category = v_cat)
  ),
  ordered AS (
    SELECT f.*, row_number() OVER (
      ORDER BY
        CASE WHEN v_sort = 'az' THEN public.f_unaccent(lower(f.doc_title)) END ASC,
        CASE WHEN v_sort = 'recent' OR (v_sort = 'relevance' AND v_ts IS NULL) THEN f.sort_date END DESC NULLS LAST,
        CASE WHEN v_sort = 'relevance' AND v_ts IS NOT NULL THEN f.score END DESC NULLS LAST,
        f.sort_date DESC NULLS LAST,
        f.doc_title ASC
    ) AS pos
    FROM filtered f
  ),
  page AS (
    SELECT o.* FROM ordered o
    WHERE o.pos > v_offset AND o.pos <= v_offset + v_limit
  ),
  total AS (SELECT count(*)::bigint AS n FROM filtered)
  SELECT jsonb_build_object(
    'query', coalesce(v_raw, ''),
    'items', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',          p.doc_id,
          'type',        p.doc_type,
          'title',       p.doc_title,
          'description', coalesce(p.description, ''),
          'category',    p.category,
          'url',         p.url,
          'score',       round(p.score::numeric, 4),
          'hasAccess',   p.has_access,
          'metadata',    coalesce(p.metadata, '{}'::jsonb),
          -- `<b>` é o marcador padrão do ts_headline; as tags do corpo são
          -- removidas antes, então o cliente pode fatiar por ele com segurança
          -- (nada de innerHTML do outro lado).
          'snippet', CASE
            WHEN v_ts IS NOT NULL AND p.body IS NOT NULL AND btrim(p.body) <> ''
            THEN ts_headline(
                   'public.pt_unaccent',
                   btrim(regexp_replace(regexp_replace(p.body, '<[^>]*>', ' ', 'g'), '\s+', ' ', 'g')),
                   v_ts,
                   'MaxWords=34, MinWords=16, ShortWord=3, MaxFragments=1'
                 )
            ELSE NULL
          END
        ) ORDER BY p.pos
      ) FROM page p
    ), '[]'::jsonb),
    'totalCount', (SELECT n FROM total),
    'countsByType', (
      SELECT jsonb_build_object(
        'all',     coalesce(sum(n), 0),
        'course',  coalesce(sum(n) FILTER (WHERE doc_type = 'course'), 0),
        'lesson',  coalesce(sum(n) FILTER (WHERE doc_type = 'lesson'), 0),
        'agent',   coalesce(sum(n) FILTER (WHERE doc_type = 'agent'), 0),
        'article', coalesce(sum(n) FILTER (WHERE doc_type = 'article'), 0),
        'note',    coalesce(sum(n) FILTER (WHERE doc_type = 'note'), 0)
      ) FROM type_counts
    ),
    'categories', coalesce((
      SELECT jsonb_agg(jsonb_build_object('value', category, 'count', n) ORDER BY n DESC, category ASC)
      FROM category_counts
    ), '[]'::jsonb),
    'didYouMean', (SELECT EXISTS (SELECT 1 FROM fuzzy_docs)),
    /*
     * A palavra que a pessoa provavelmente quis escrever. Vem do título dos
     * resultados aproximados, com o acento original preservado — "Liderança",
     * não "lideranca" —, porque é ela que vai aparecer na tela como sugestão
     * clicável. Nulo quando a busca casou de forma exata.
     */
    'suggestedTerm', (
      SELECT tok
      FROM fuzzy_docs f,
           LATERAL regexp_split_to_table(f.doc_title, '[^[:alnum:]]+') AS tok
      WHERE length(tok) >= 3
      ORDER BY extensions.word_similarity(v_norm, public.f_unaccent(lower(tok))) DESC,
               length(tok) ASC
      LIMIT 1
    ),
    'page', jsonb_build_object(
      'size',    v_limit,
      'offset',  v_offset,
      'hasMore', (SELECT n FROM total) > v_offset + v_limit
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_unified(text, text, text, text, int, int) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. Sugestões (autocomplete)
-- -----------------------------------------------------------------------------
/*
 * Alimenta a lista que aparece embaixo do campo enquanto a pessoa digita.
 * Só títulos — a ideia é completar a intenção, não já entregar o resultado.
 */
CREATE OR REPLACE FUNCTION public.search_suggest(
  query_text  text,
  max_results int DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
-- DEFINER para alcançar `search_documents` e `user_entitled_course_ids`, que
-- não são mais executáveis pelos papéis da API. O recorte de visibilidade
-- continua inteiro dentro de `search_documents`.
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_raw   text := nullif(btrim(coalesce(query_text, '')), '');
  v_norm  text;
  v_limit int  := least(greatest(coalesce(max_results, 6), 1), 12);
  v_out   jsonb;
BEGIN
  IF v_raw IS NULL OR length(v_raw) < 2 THEN RETURN '[]'::jsonb; END IF;
  v_norm := coalesce(public.f_unaccent(lower(v_raw)), '');

  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'title',    sug.doc_title,
             'type',     sug.doc_type,
             'url',      sug.url,
             'category', sug.category
           ) ORDER BY sug.affinity DESC, sug.doc_title ASC
         ), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT uniq.*
    FROM (
      -- Um título por sugestão: o mesmo nome vindo de duas fontes vira ruído.
      SELECT DISTINCT ON (public.f_unaccent(lower(d.doc_title)))
        d.doc_title,
        d.doc_type,
        d.url,
        d.category,
        (
          d.fts
          + CASE
              WHEN starts_with(public.f_unaccent(lower(d.doc_title)), v_norm) THEN 1.0
              WHEN position(v_norm IN public.f_unaccent(lower(d.doc_title))) > 0 THEN 0.5
              ELSE 0
            END
          + d.trgm
        ) AS affinity
      FROM public.search_documents(v_raw, v_norm, false) d
      ORDER BY public.f_unaccent(lower(d.doc_title)), affinity DESC
    ) uniq
    ORDER BY uniq.affinity DESC, uniq.doc_title ASC
    LIMIT v_limit
  ) sug;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_suggest(text, int) TO anon, authenticated;
