-- Add transcription and short_description to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS transcription TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS short_description VARCHAR(200);

-- Drop unused meta fields
ALTER TABLE public.lessons DROP COLUMN IF NOT EXISTS meta_title;
ALTER TABLE public.lessons DROP COLUMN IF NOT EXISTS meta_description;

-- Add slug to modules
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug for modules
CREATE UNIQUE INDEX IF NOT EXISTS modules_slug_key ON public.modules (slug) WHERE slug IS NOT NULL;
