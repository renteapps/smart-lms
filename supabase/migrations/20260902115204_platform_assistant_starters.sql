-- Add conversation starters configuration to platform_assistant_settings
ALTER TABLE "public"."platform_assistant_settings"
  ADD COLUMN "starters_platform" text[] NOT NULL DEFAULT ARRAY['O que eu devo estudar agora?', 'Quais cursos combinam com o meu objetivo?', 'Como funciona a plataforma?']::text[],
  ADD COLUMN "starters_course" text[] NOT NULL DEFAULT ARRAY['Do que trata este curso?', 'Por onde eu começo?', 'O que vou saber fazer no final?']::text[],
  ADD COLUMN "starters_lesson" text[] NOT NULL DEFAULT ARRAY['Resuma esta aula em tópicos', 'Explique isso de outro jeito', 'Dê um exemplo prático']::text[];
