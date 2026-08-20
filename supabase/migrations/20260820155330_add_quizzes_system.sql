-- Migração: Sistema de Quiz
-- Criação das tabelas para armazenar quizzes e seus resultados, e vinculo com aulas.

CREATE TABLE public.quizzes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    questions jsonb NOT NULL DEFAULT '[]'::jsonb,
    passing_score integer DEFAULT 70,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quizzes are viewable by everyone" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Admins can insert quizzes" ON public.quizzes FOR INSERT WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);
CREATE POLICY "Admins can update quizzes" ON public.quizzes FOR UPDATE USING ((auth.jwt() ->> 'role'::text) = 'admin'::text);
CREATE POLICY "Admins can delete quizzes" ON public.quizzes FOR DELETE USING ((auth.jwt() ->> 'role'::text) = 'admin'::text);

CREATE TABLE public.quiz_results (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
    score integer NOT NULL,
    answers jsonb NOT NULL DEFAULT '{}'::jsonb,
    passed boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quiz results" ON public.quiz_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quiz results" ON public.quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all quiz results" ON public.quiz_results FOR SELECT USING ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Alterando a tabela lessons para referenciar o quiz
ALTER TABLE public.lessons ADD COLUMN quiz_id uuid REFERENCES public.quizzes(id) ON DELETE SET NULL;
