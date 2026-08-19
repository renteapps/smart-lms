-- Versionamento e publicação atômica do questionário da trilha.
--
-- A tela de admin salvava direto do browser com um INSERT solto: o índice
-- único parcial que só permite um `published` por vez fazia o segundo
-- salvamento falhar sempre. Aqui entram os metadados de auditoria e uma
-- função SECURITY DEFINER que arquiva o publicado e insere a nova versão
-- numa única transação — se o insert falhar, o publicado antigo continua
-- no ar em vez de deixar `/onboarding` sem nenhum questionário.

ALTER TABLE public.trail_questionnaires
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- `status` era TEXT livre; a action já gravava 'archived', valor que nem
-- existia no tipo TypeScript. Trava o domínio real de estados.
ALTER TABLE public.trail_questionnaires
  DROP CONSTRAINT IF EXISTS trail_questionnaires_status_check;
ALTER TABLE public.trail_questionnaires
  ADD CONSTRAINT trail_questionnaires_status_check
  CHECK (status IN ('draft', 'published', 'archived'));

-- Espelha o índice de "um publicado por vez": no máximo um rascunho por vez.
CREATE UNIQUE INDEX IF NOT EXISTS trail_questionnaires_single_draft
  ON public.trail_questionnaires ((status)) WHERE status = 'draft';

CREATE OR REPLACE FUNCTION public.publish_trail_questionnaire(
  p_questions JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_next_version INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  -- O rascunho vira a versão publicada; não sobra como registro solto.
  DELETE FROM public.trail_questionnaires WHERE status = 'draft';

  UPDATE public.trail_questionnaires
  SET status = 'archived'
  WHERE status = 'published';

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM public.trail_questionnaires;

  INSERT INTO public.trail_questionnaires (version, status, questions, notes, published_at, created_by)
  VALUES (v_next_version, 'published', p_questions, p_notes, timezone('utc'::text, now()), auth.uid());

  RETURN v_next_version;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_trail_questionnaire(JSONB, TEXT) TO authenticated;
