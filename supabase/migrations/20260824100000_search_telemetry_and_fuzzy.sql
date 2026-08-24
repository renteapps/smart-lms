-- =============================================================================
-- Busca: telemetria e casamento aproximado por token
-- =============================================================================
-- Duas coisas que faltavam no motor v2 (20260823140000):
--
--  1. Ninguém registrava o que é buscado. A taxa de zero-resultado por termo é
--     o sinal mais valioso que uma busca de LMS produz — é a lista, ordenada
--     por demanda real, do que o catálogo não tem.
--  2. O fallback aproximado comparava a frase inteira contra o título via
--     `word_similarity`, então uma palavra com erro de digitação funcionava e
--     duas não: `comunicaçao assertva` devolvia zero. O casamento token a
--     token vive em `search_fuzzy_score`, criada na migração anterior porque
--     `search_documents` depende dela.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Telemetria
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query            text NOT NULL,
  -- Sem acento e em minúsculas: é por aqui que se agrupa "Liderança",
  -- "lideranca" e "LIDERANÇA" como o mesmo termo.
  query_normalized text NOT NULL,
  result_count     integer NOT NULL DEFAULT 0,
  filter_type      text,
  filter_category  text,
  did_you_mean     boolean NOT NULL DEFAULT false,
  -- Preenchidos quando a pessoa abre um resultado: é o que transforma a
  -- tabela de "o que buscaram" em "o que resolveu".
  clicked_id       text,
  clicked_type     text,
  clicked_position integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_events_normalized_idx
  ON public.search_events (query_normalized, created_at DESC);
CREATE INDEX IF NOT EXISTS search_events_zero_idx
  ON public.search_events (created_at DESC) WHERE result_count = 0;
CREATE INDEX IF NOT EXISTS search_events_user_recent_idx
  ON public.search_events (user_id, created_at DESC);

ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;

/*
 * Sem política de escrita de propósito: gravação passa só pelas funções
 * abaixo, que são SECURITY DEFINER e carimbam `auth.uid()` — ninguém registra
 * busca em nome de outra pessoa. Leitura é de admin, porque o conjunto todo
 * revela o que cada aluno procurou.
 */
DROP POLICY IF EXISTS "Admins leem eventos de busca" ON public.search_events;
CREATE POLICY "Admins leem eventos de busca"
  ON public.search_events FOR SELECT
  USING (public.is_admin());

/*
 * Registra uma busca e devolve o id do evento, para o clique poder voltar e
 * completá-lo.
 *
 * O detalhe que decide se esta tabela é útil ou lixo: digitar "l", "li",
 * "lid"… dispararia uma linha por tecla e afogaria a estatística em prefixos.
 * Por isso, se a busca anterior da mesma pessoa (nos últimos 60s, ainda sem
 * clique) é um prefixo desta, a linha é **atualizada** no lugar. A sequência
 * inteira de digitação vira o termo que ela de fato quis.
 */
CREATE OR REPLACE FUNCTION public.log_search_event(
  p_query           text,
  p_result_count    integer,
  p_filter_type     text DEFAULT 'all',
  p_filter_category text DEFAULT NULL,
  p_did_you_mean    boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_query text := left(btrim(coalesce(p_query, '')), 160);
  v_norm  text;
  v_id    uuid;
BEGIN
  IF v_uid IS NULL OR v_query = '' THEN RETURN NULL; END IF;

  v_norm := public.f_unaccent(lower(v_query));

  UPDATE public.search_events e
     SET query            = v_query,
         query_normalized = v_norm,
         result_count     = greatest(coalesce(p_result_count, 0), 0),
         filter_type      = coalesce(p_filter_type, 'all'),
         filter_category  = p_filter_category,
         did_you_mean     = coalesce(p_did_you_mean, false),
         created_at       = now()
   WHERE e.id = (
     SELECT x.id
     FROM public.search_events x
     WHERE x.user_id = v_uid
       AND x.clicked_id IS NULL
       AND x.created_at > now() - interval '60 seconds'
       AND starts_with(v_norm, x.query_normalized)
     ORDER BY x.created_at DESC
     LIMIT 1
   )
  RETURNING e.id INTO v_id;

  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.search_events (
    user_id, query, query_normalized, result_count,
    filter_type, filter_category, did_you_mean
  )
  VALUES (
    v_uid, v_query, v_norm, greatest(coalesce(p_result_count, 0), 0),
    coalesce(p_filter_type, 'all'), p_filter_category, coalesce(p_did_you_mean, false)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

/** Fecha o evento com o resultado que a pessoa abriu. */
CREATE OR REPLACE FUNCTION public.log_search_click(
  p_event_id uuid,
  p_doc_id   text,
  p_doc_type text,
  p_position integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_event_id IS NULL THEN RETURN; END IF;

  UPDATE public.search_events
     SET clicked_id       = left(coalesce(p_doc_id, ''), 100),
         clicked_type     = left(coalesce(p_doc_type, ''), 20),
         clicked_position = greatest(coalesce(p_position, 0), 0)
   WHERE id = p_event_id
     -- Só o dono do evento carimba o próprio clique.
     AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.log_search_event(text, integer, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_search_click(uuid, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_search_event(text, integer, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_search_click(uuid, text, text, integer) TO authenticated;

/*
 * A lista do que o catálogo não tem, ordenada por demanda. `security_invoker`
 * faz a RLS da tabela valer aqui também — ou seja, só admin lê.
 */
CREATE OR REPLACE VIEW public.v_search_gaps WITH (security_invoker = true) AS
SELECT
  e.query_normalized                                    AS termo,
  max(e.query)                                          AS exemplo,
  count(*)::integer                                     AS buscas,
  count(DISTINCT e.user_id)::integer                    AS pessoas,
  max(e.created_at)                                     AS ultima_busca
FROM public.search_events e
WHERE e.result_count = 0
GROUP BY e.query_normalized;

REVOKE ALL ON public.v_search_gaps FROM anon, authenticated;
GRANT SELECT ON public.v_search_gaps TO authenticated;

/*
 * Contraparte da anterior: termos que trazem resultado mas que ninguém abre.
 * Sinaliza ranking ruim ou título que não corresponde ao que a pessoa
 * esperava — problema diferente de "não existe conteúdo".
 */
CREATE OR REPLACE VIEW public.v_search_misses WITH (security_invoker = true) AS
SELECT
  e.query_normalized                                                    AS termo,
  max(e.query)                                                          AS exemplo,
  count(*)::integer                                                     AS buscas,
  count(e.clicked_id)::integer                                          AS cliques,
  round(count(e.clicked_id)::numeric / nullif(count(*), 0), 3)          AS taxa_de_clique,
  max(e.created_at)                                                     AS ultima_busca
FROM public.search_events e
WHERE e.result_count > 0
GROUP BY e.query_normalized
HAVING count(*) >= 3;

REVOKE ALL ON public.v_search_misses FROM anon, authenticated;
GRANT SELECT ON public.v_search_misses TO authenticated;

-- -----------------------------------------------------------------------------
-- Sinônimos do domínio
-- -----------------------------------------------------------------------------
/*
 * "CNV" não acha "Comunicação Não-Violenta"; "GTD" e "produtividade pessoal"
 * não se conectam. Nenhum stemmer resolve isso — é vocabulário, não morfologia.
 *
 * O dicionário de tesauro do Postgres seria o caminho canônico, mas ele lê um
 * arquivo em `$SHAREDIR/tsearch_data`, e no Supabase gerenciado não há acesso
 * ao sistema de arquivos do servidor. Então o vocabulário mora em tabela, e a
 * expansão acontece na montagem da consulta.
 */
CREATE TABLE IF NOT EXISTS public.search_synonyms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Sempre normalizado (sem acento, minúsculo): é assim que os termos
  -- digitados chegam em `search_build_tsquery`.
  term       text NOT NULL,
  expansion  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS search_synonyms_term_key ON public.search_synonyms (term);

ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sinônimos são legíveis" ON public.search_synonyms;
CREATE POLICY "Sinônimos são legíveis"
  ON public.search_synonyms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins gerenciam sinônimos" ON public.search_synonyms;
CREATE POLICY "Admins gerenciam sinônimos"
  ON public.search_synonyms FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.search_synonyms TO anon, authenticated;

-- Conjunto inicial: siglas que o catálogo atual já usa. É ponto de partida
-- editável, não uma lista fechada.
INSERT INTO public.search_synonyms (term, expansion) VALUES
  ('cnv', 'comunicação não violenta'),
  ('gtd', 'getting things done produtividade pessoal'),
  ('okr', 'objetivos e resultados chave metas'),
  ('pnl', 'programação neurolinguística'),
  ('rh',  'recursos humanos pessoas')
ON CONFLICT (term) DO NOTHING;

/*
 * Reescreve a montagem da consulta para expandir **por token**, não por frase.
 *
 * A diferença importa: unir a expansão inteira com OU na consulta toda faria
 * "cnv feedback" casar com qualquer coisa sobre comunicação, ignorando
 * "feedback". Aqui cada termo digitado vira o seu próprio grupo
 * `(termo:* | expansão)`, e os grupos continuam unidos por E — a mesma
 * semântica de antes, agora com vocabulário.
 *
 * Deixa de ser IMMUTABLE porque passa a ler uma tabela; segue fora de coluna
 * gerada, então STABLE basta.
 */
CREATE OR REPLACE FUNCTION public.search_build_tsquery(query_text text)
RETURNS tsquery
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  cleaned text;
  web     tsquery;
  prefix  tsquery;
  tokens  text[];
  tok     text;
  grupo   tsquery;
  expansao text;
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
      SELECT t
      FROM regexp_split_to_table(public.f_unaccent(lower(cleaned)), '[^[:alnum:]]+') AS t
      WHERE length(t) > 0
      LIMIT 8
    );

    FOREACH tok IN ARRAY coalesce(tokens, '{}'::text[]) LOOP
      BEGIN
        grupo := to_tsquery('public.pt_unaccent', tok || ':*');
      EXCEPTION WHEN OTHERS THEN
        grupo := NULL;
      END;

      SELECT sy.expansion INTO expansao
      FROM public.search_synonyms sy
      WHERE sy.term = tok
      LIMIT 1;

      IF expansao IS NOT NULL THEN
        BEGIN
          grupo := coalesce(grupo, ''::tsquery) || websearch_to_tsquery('public.pt_unaccent', expansao);
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;

      IF grupo IS NOT NULL AND grupo <> ''::tsquery THEN
        prefix := CASE WHEN prefix IS NULL THEN grupo ELSE prefix && grupo END;
      END IF;
    END LOOP;
  END IF;

  IF web IS NULL THEN RETURN prefix; END IF;
  IF prefix IS NULL THEN RETURN web; END IF;
  RETURN web || prefix;
END;
$$;

-- -----------------------------------------------------------------------------
-- Buscas recentes da própria pessoa
-- -----------------------------------------------------------------------------
/*
 * Com os eventos gravados, "buscas recentes" deixa de morrer no
 * `localStorage` de um navegador só e passa a seguir a pessoa entre
 * dispositivos.
 *
 * Só entram buscas que **acharam algo**: repetir um termo que já deu vazio não
 * ajuda ninguém. E só as da própria pessoa — `auth.uid()` fixo, sem parâmetro
 * de usuário que possa ser trocado por quem chama.
 */
CREATE OR REPLACE FUNCTION public.recent_searches(max_results integer DEFAULT 6)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(t.termo ORDER BY t.ultima DESC), '[]'::jsonb)
  FROM (
    SELECT max(e.query) AS termo, max(e.created_at) AS ultima
    FROM public.search_events e
    WHERE e.user_id = (SELECT auth.uid())
      AND e.result_count > 0
    GROUP BY e.query_normalized
    ORDER BY max(e.created_at) DESC
    LIMIT least(greatest(coalesce(max_results, 6), 1), 12)
  ) t;
$$;

REVOKE ALL ON FUNCTION public.recent_searches(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recent_searches(integer) TO authenticated;
