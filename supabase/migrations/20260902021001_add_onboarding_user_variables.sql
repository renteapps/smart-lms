-- Variáveis estáveis do onboarding e valores materializados por aluno.
-- A migração anterior criou student_onboarding_answers somente para texto
-- livre; aqui ela passa a ser a fonte única das variáveis do usuário.

-- Mantém esta migração aplicável também em bancos que ainda não receberam a
-- migração inicial de respostas abertas (por exemplo, aplicação manual pelo
-- SQL Editor). Em instalações sequenciais, os comandos são idempotentes.
CREATE TABLE IF NOT EXISTS public.student_onboarding_answers (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT NOT NULL,
  questionnaire_version INTEGER NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, question_id),
  CONSTRAINT student_onboarding_answers_question_id_not_blank CHECK (btrim(question_id) <> ''),
  CONSTRAINT student_onboarding_answers_question_text_not_blank CHECK (btrim(question_text) <> ''),
  CONSTRAINT student_onboarding_answers_answer_not_blank CHECK (btrim(answer) <> ''),
  CONSTRAINT student_onboarding_answers_answer_length CHECK (char_length(answer) <= 2000)
);

CREATE INDEX IF NOT EXISTS student_onboarding_answers_user_updated_idx
  ON public.student_onboarding_answers (user_id, updated_at DESC);

ALTER TABLE public.student_onboarding_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_onboarding_answers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_onboarding_answers TO authenticated;

DROP POLICY IF EXISTS "Aluno lê respostas abertas próprias" ON public.student_onboarding_answers;
CREATE POLICY "Aluno lê respostas abertas próprias" ON public.student_onboarding_answers
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id OR (select public.is_admin()));

DROP POLICY IF EXISTS "Aluno cria respostas abertas próprias" ON public.student_onboarding_answers;
CREATE POLICY "Aluno cria respostas abertas próprias" ON public.student_onboarding_answers
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Aluno atualiza respostas abertas próprias" ON public.student_onboarding_answers;
CREATE POLICY "Aluno atualiza respostas abertas próprias" ON public.student_onboarding_answers
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id OR (select public.is_admin()))
  WITH CHECK ((select auth.uid()) = user_id OR (select public.is_admin()));

DROP POLICY IF EXISTS "Aluno remove respostas abertas próprias" ON public.student_onboarding_answers;
CREATE POLICY "Aluno remove respostas abertas próprias" ON public.student_onboarding_answers
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id OR (select public.is_admin()));

ALTER TABLE public.student_onboarding_answers
  ADD COLUMN IF NOT EXISTS variable_key TEXT,
  ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS answer_values JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.student_onboarding_answers
SET answer_values = jsonb_build_array(answer)
WHERE answer_values = '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_onboarding_answers_question_type_check'
      AND conrelid = 'public.student_onboarding_answers'::regclass
  ) THEN
    ALTER TABLE public.student_onboarding_answers
      ADD CONSTRAINT student_onboarding_answers_question_type_check
      CHECK (question_type IN ('single', 'multiple', 'open'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_onboarding_answers_values_array_check'
      AND conrelid = 'public.student_onboarding_answers'::regclass
  ) THEN
    ALTER TABLE public.student_onboarding_answers
      ADD CONSTRAINT student_onboarding_answers_values_array_check
      CHECK (jsonb_typeof(answer_values) = 'array');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_onboarding_answers_variable_key_check'
      AND conrelid = 'public.student_onboarding_answers'::regclass
  ) THEN
    ALTER TABLE public.student_onboarding_answers
      ADD CONSTRAINT student_onboarding_answers_variable_key_check
      CHECK (variable_key IS NULL OR variable_key ~ '^[a-z][a-z0-9_]{0,63}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS student_onboarding_answers_user_variable_idx
  ON public.student_onboarding_answers (user_id, variable_key)
  WHERE variable_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.onboarding_variable_definitions (
  variable_key TEXT PRIMARY KEY,
  question_id TEXT NOT NULL UNIQUE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  published_version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT onboarding_variable_definitions_key_check
    CHECK (variable_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  CONSTRAINT onboarding_variable_definitions_question_id_check
    CHECK (btrim(question_id) <> ''),
  CONSTRAINT onboarding_variable_definitions_question_text_check
    CHECK (btrim(question_text) <> ''),
  CONSTRAINT onboarding_variable_definitions_question_type_check
    CHECK (question_type IN ('single', 'multiple', 'open'))
);

ALTER TABLE public.onboarding_variable_definitions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.onboarding_variable_definitions FROM anon, authenticated;
GRANT SELECT ON TABLE public.onboarding_variable_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.onboarding_variable_definitions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_onboarding_answers TO service_role;

DROP POLICY IF EXISTS "Admins consultam variáveis do onboarding" ON public.onboarding_variable_definitions;
CREATE POLICY "Admins consultam variáveis do onboarding"
  ON public.onboarding_variable_definitions
  FOR SELECT TO authenticated
  USING ((select public.is_admin()));

-- Publicação, registro imutável das chaves e backfill acontecem na mesma
-- transação. Se qualquer regra falhar, a versão anterior continua publicada.
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

  IF jsonb_typeof(p_questions) <> 'array' THEN
    RAISE EXCEPTION 'A lista de perguntas é inválida.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_questions) AS q
    WHERE q->>'type' = 'open'
      AND jsonb_array_length(COALESCE(q->'options', '[]'::jsonb)) > 0
  ) THEN
    RAISE EXCEPTION 'Perguntas abertas não podem mapear conteúdos.' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_questions) AS q
    WHERE NULLIF(btrim(q->>'variableKey'), '') IS NOT NULL
      AND (
        q->>'type' = 'availability'
        OR btrim(q->>'variableKey') <> lower(btrim(q->>'variableKey'))
        OR btrim(q->>'variableKey') !~ '^[a-z][a-z0-9_]{0,63}$'
        OR lower(btrim(q->>'variableKey')) = ANY (ARRAY[
          'first_name','last_name','full_name','nome','name','email','user_email',
          'nome_plataforma','app_name','data_atual','current_date','ano_atual','current_year',
          'nome_curso','course_title','link_curso','course_url','link_login','login_url',
          'link_recuperacao','reset_url','codigo_certificado','certificate_code',
          'link_certificado','certificate_url','nome_plano','plan_name','valor_plano',
          'plan_price','dias_inativo','days_inactive','titulo_notificacao','notification_title',
          'mensagem_notificacao','notification_message','link_acao','action_url','texto_acao',
          'action_text','utm_source','utm_medium','utm_campaign','utm_content','utm_term',
          'contact','course','coupon','affiliate'
        ])
      )
  ) THEN
    RAISE EXCEPTION 'Há uma variável inválida ou reservada no questionário.' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_questions) AS q
    WHERE NULLIF(btrim(q->>'variableKey'), '') IS NOT NULL
    GROUP BY lower(btrim(q->>'variableKey'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cada variável do onboarding precisa ser única.' USING ERRCODE = '23505';
  END IF;

  -- Uma pergunta que já publicou uma chave não pode removê-la nem trocá-la.
  IF EXISTS (
    SELECT 1
    FROM public.onboarding_variable_definitions d
    JOIN jsonb_array_elements(p_questions) AS q ON q->>'id' = d.question_id
    WHERE NULLIF(lower(btrim(q->>'variableKey')), '') IS DISTINCT FROM d.variable_key
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_questions) AS q
    JOIN public.onboarding_variable_definitions d
      ON d.variable_key = lower(btrim(q->>'variableKey'))
    WHERE d.question_id <> q->>'id'
  ) THEN
    RAISE EXCEPTION 'Uma variável publicada não pode ser renomeada, removida ou reutilizada.' USING ERRCODE = '23505';
  END IF;

  DELETE FROM public.trail_questionnaires WHERE status = 'draft';

  UPDATE public.trail_questionnaires
  SET status = 'archived'
  WHERE status = 'published';

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM public.trail_questionnaires;

  INSERT INTO public.trail_questionnaires
    (version, status, questions, notes, published_at, created_by)
  VALUES
    (v_next_version, 'published', p_questions, p_notes, timezone('utc'::text, now()), auth.uid());

  UPDATE public.onboarding_variable_definitions
  SET active = FALSE
  WHERE active IS DISTINCT FROM FALSE;

  INSERT INTO public.onboarding_variable_definitions
    (variable_key, question_id, question_text, question_type, active, published_version, updated_at)
  SELECT
    lower(btrim(q->>'variableKey')),
    q->>'id',
    btrim(q->>'text'),
    q->>'type',
    TRUE,
    v_next_version,
    timezone('utc'::text, now())
  FROM jsonb_array_elements(p_questions) AS q
  WHERE NULLIF(btrim(q->>'variableKey'), '') IS NOT NULL
  ON CONFLICT (variable_key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    active = TRUE,
    published_version = EXCLUDED.published_version,
    updated_at = EXCLUDED.updated_at;

  -- Quem respondeu antes da criação da chave recebe a variável sem precisar
  -- refazer o onboarding. O array bruto continua preservado para listas.
  INSERT INTO public.student_onboarding_answers
    (user_id, question_id, question_text, variable_key, question_type, answer_values,
     answer, questionnaire_version, answered_at, updated_at)
  SELECT
    st.user_id,
    q->>'id',
    btrim(q->>'text'),
    lower(btrim(q->>'variableKey')),
    q->>'type',
    st.trail_data->'answers'->(q->>'id'),
    left(COALESCE((
      SELECT CASE array_length(values, 1)
        WHEN 1 THEN values[1]
        WHEN 2 THEN values[1] || ' e ' || values[2]
        ELSE array_to_string(values[1:array_length(values, 1) - 1], ', ')
          || ' e ' || values[array_length(values, 1)]
      END
      FROM (
        SELECT array_agg(entry.value ORDER BY entry.ordinality) AS values
        FROM jsonb_array_elements_text(st.trail_data->'answers'->(q->>'id'))
          WITH ORDINALITY AS entry(value, ordinality)
      ) AS values_list
    ), ''), 2000),
    CASE
      WHEN COALESCE(st.trail_data->>'questionnaireVersion', '') ~ '^[0-9]+$'
        THEN (st.trail_data->>'questionnaireVersion')::integer
      ELSE v_next_version
    END,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  FROM public.student_trails st
  CROSS JOIN jsonb_array_elements(p_questions) AS q
  WHERE NULLIF(btrim(q->>'variableKey'), '') IS NOT NULL
    AND jsonb_typeof(st.trail_data->'answers'->(q->>'id')) = 'array'
    AND jsonb_array_length(st.trail_data->'answers'->(q->>'id')) > 0
  ON CONFLICT (user_id, question_id) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    variable_key = EXCLUDED.variable_key,
    question_type = EXCLUDED.question_type,
    answer_values = EXCLUDED.answer_values,
    answer = EXCLUDED.answer,
    questionnaire_version = EXCLUDED.questionnaire_version,
    updated_at = EXCLUDED.updated_at;

  RETURN v_next_version;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_trail_questionnaire(JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_trail_questionnaire(JSONB, TEXT) TO authenticated;
