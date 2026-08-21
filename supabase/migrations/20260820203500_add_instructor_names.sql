-- Adiciona um campo de instrutores como array de texto para simplificar a exibicao nos certificados
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_names TEXT[] DEFAULT '{}';
