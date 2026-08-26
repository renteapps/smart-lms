-- Progresso salvo automaticamente (retomar quiz interrompido) + preferência
-- de embaralhar a ordem das perguntas a cada tentativa.

CREATE TABLE public.quiz_drafts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    answers jsonb NOT NULL DEFAULT '{}'::jsonb,
    current_question_index integer NOT NULL DEFAULT 0,
    -- Seed do embaralhamento determinístico (ver src/lib/quiz/shuffle.ts) —
    -- garante que a ordem das perguntas/alternativas não mude se a página
    -- recarregar no meio de uma tentativa (senão "retomar da pergunta 3"
    -- apontaria pra uma pergunta diferente a cada reload).
    shuffle_seed integer NOT NULL DEFAULT 0,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (quiz_id, lesson_id, user_id)
);

ALTER TABLE public.quiz_drafts ENABLE ROW LEVEL SECURITY;

-- Rascunho é dado efêmero e 100% do próprio aluno — sem necessidade de
-- visibilidade de admin (diferente de quiz_results, que é o resultado final).
CREATE POLICY "Users manage their own quiz drafts" ON public.quiz_drafts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.quizzes
  ADD COLUMN shuffle_questions boolean NOT NULL DEFAULT true;
