-- Permite "refazer o quiz" sobrescrever o resultado anterior em vez de acumular
-- linhas, seguindo o mesmo padrão já usado em lesson_progress (upsert por
-- user_id,lesson_id). Antes de aplicar a constraint, deduplica linhas
-- pré-existentes (inserts sem restrição eram possíveis até aqui).

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY quiz_id, lesson_id, user_id
    ORDER BY created_at DESC, id DESC
  ) AS rn
  FROM public.quiz_results
  WHERE quiz_id IS NOT NULL AND lesson_id IS NOT NULL AND user_id IS NOT NULL
)
DELETE FROM public.quiz_results WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.quiz_results
  ADD CONSTRAINT quiz_results_quiz_lesson_user_key UNIQUE (quiz_id, lesson_id, user_id);

CREATE POLICY "Users can update their own quiz results" ON public.quiz_results
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
