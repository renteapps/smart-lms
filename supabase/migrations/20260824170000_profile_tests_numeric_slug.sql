-- Slug numérico curto para os links compartilháveis /diagnostico/:slug.
--
-- A migração anterior gerou slugs em hexadecimal (md5) e deixou a coluna sem
-- default, o que quebrava qualquer INSERT que não informasse o slug (duplicar
-- teste, por exemplo). Aqui o banco passa a ser a fonte do identificador: 8
-- dígitos, único, curto o bastante para ser ditado por telefone e longo o
-- bastante para não ser enumerável por tentativa e erro.

CREATE OR REPLACE FUNCTION public.generate_profile_test_slug()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  candidate TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    -- 10000000..99999999: nunca começa com zero, então o texto sempre tem 8 dígitos.
    candidate := (10000000 + floor(random() * 90000000)::BIGINT)::TEXT;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profile_tests WHERE slug = candidate);

    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Não foi possível gerar um slug único para o teste de perfil.';
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;

-- Converte os slugs herdados (md5/manuais) para o formato numérico.
UPDATE public.profile_tests
SET slug = public.generate_profile_test_slug()
WHERE slug IS NULL OR slug !~ '^[0-9]{6,12}$';

ALTER TABLE public.profile_tests
ALTER COLUMN slug SET DEFAULT public.generate_profile_test_slug();

ALTER TABLE public.profile_tests
DROP CONSTRAINT IF EXISTS profile_tests_slug_numeric;

ALTER TABLE public.profile_tests
ADD CONSTRAINT profile_tests_slug_numeric CHECK (slug ~ '^[0-9]{6,12}$');

-- Fecha o access_type nos quatro modos suportados pela aplicação.
ALTER TABLE public.profile_tests
DROP CONSTRAINT IF EXISTS profile_tests_access_type_valid;

ALTER TABLE public.profile_tests
ADD CONSTRAINT profile_tests_access_type_valid
CHECK (access_type IN ('public', 'logged_in', 'course_owners', 'plan_owners'));

-- -----------------------------------------------------------------------------
-- Regra de acesso no banco, não só na tela
-- -----------------------------------------------------------------------------
/*
 * A política antiga liberava SELECT em todo teste publicado, então as perguntas
 * de um teste restrito a curso/plano saíam pela API com a chave anon — a
 * restrição valia só para quem entrava pela interface.
 *
 * Reaproveita `user_entitled_course_ids()` e `plan_allows_course()` (do motor de
 * busca) para a regra de curso ser exatamente a mesma das vitrines.
 */
CREATE OR REPLACE FUNCTION public.can_access_profile_test(
  p_access_type TEXT,
  p_required_course_ids UUID[],
  p_required_plan_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid UUID := (SELECT auth.uid());
BEGIN
  -- Admin revisa qualquer teste, inclusive rascunho e restrito.
  IF public.is_admin() THEN RETURN TRUE; END IF;

  IF coalesce(p_access_type, 'logged_in') = 'public' THEN RETURN TRUE; END IF;
  IF uid IS NULL THEN RETURN FALSE; END IF;

  IF p_access_type = 'course_owners' THEN
    -- Lista vazia = restrição não configurada: vale como "apenas logados".
    IF coalesce(array_length(p_required_course_ids, 1), 0) = 0 THEN RETURN TRUE; END IF;
    RETURN public.user_entitled_course_ids() && p_required_course_ids;
  END IF;

  IF p_access_type = 'plan_owners' THEN
    IF coalesce(array_length(p_required_plan_ids, 1), 0) = 0 THEN RETURN TRUE; END IF;
    RETURN EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.plans p ON p.id = s.plan_id
      WHERE s.user_id = uid
        AND s.plan_id = ANY (p_required_plan_ids)
        AND s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
        AND coalesce(p.is_active, TRUE) = TRUE
    );
  END IF;

  -- 'logged_in' e qualquer valor futuro: basta ter conta.
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_profile_test(TEXT, UUID[], UUID[]) TO anon, authenticated;

DROP POLICY IF EXISTS "Testes publicados visíveis" ON public.profile_tests;
CREATE POLICY "Testes publicados visíveis" ON public.profile_tests
  FOR SELECT USING (
    public.is_admin()
    OR (
      status = 'published'
      AND public.can_access_profile_test(access_type, required_course_ids, required_plan_ids)
    )
  );

/*
 * A política acima esconde a linha inteira de quem não tem acesso, e aí a página
 * do link não conseguiria diferenciar "teste não existe" de "teste restrito".
 * Esta função devolve o cabeçalho do teste publicado para qualquer visitante,
 * mas só entrega as perguntas para quem pode responder.
 */
CREATE OR REPLACE FUNCTION public.profile_test_by_slug(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  description TEXT,
  cover_url TEXT,
  status TEXT,
  result_type TEXT,
  access_type TEXT,
  required_course_ids UUID[],
  required_plan_ids UUID[],
  categories JSONB,
  questions JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  has_access BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    t.id,
    t.slug,
    t.title,
    t.description,
    t.cover_url,
    t.status,
    t.result_type,
    t.access_type,
    t.required_course_ids,
    t.required_plan_ids,
    t.categories,
    CASE WHEN a.allowed THEN t.questions ELSE '[]'::jsonb END,
    t.created_at,
    t.updated_at,
    a.allowed
  FROM public.profile_tests t
  CROSS JOIN LATERAL (
    SELECT public.can_access_profile_test(
      t.access_type, t.required_course_ids, t.required_plan_ids
    ) AS allowed
  ) a
  WHERE t.slug = p_slug
    AND (t.status = 'published' OR public.is_admin());
$$;

GRANT EXECUTE ON FUNCTION public.profile_test_by_slug(TEXT) TO anon, authenticated;
