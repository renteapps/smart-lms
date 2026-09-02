-- Respostas abertas do onboarding ficam fora do JSON da trilha para serem
-- recuperadas de forma privada pelos agentes e pelo Assistente IA.
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

-- A chave primária atende o upsert; este índice cobre a leitura do perfil em
-- ordem de atualização sem varrer todas as respostas daquele aluno.
CREATE INDEX IF NOT EXISTS student_onboarding_answers_user_updated_idx
  ON public.student_onboarding_answers (user_id, updated_at DESC);

ALTER TABLE public.student_onboarding_answers ENABLE ROW LEVEL SECURITY;

-- Projetos novos podem não expor tabelas de `public` via Data API por padrão.
-- Os grants explícitos mantêm as Server Actions autenticadas funcionais, e as
-- policies abaixo impedem qualquer acesso entre alunos.
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
