-- Permite o admin escolher se o feedback de cada pergunta (certo/errado +
-- explicação) aparece logo ao responder cada pergunta, ou só no final do
-- quiz, junto com a nota.

ALTER TABLE public.quizzes
  ADD COLUMN feedback_mode text NOT NULL DEFAULT 'end'
    CHECK (feedback_mode IN ('immediate', 'end'));
