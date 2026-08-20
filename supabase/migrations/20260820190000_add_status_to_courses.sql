-- Add status column to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Publicado';

-- Populate existing rows based on is_published
UPDATE public.courses
SET status = CASE 
  WHEN is_published = true THEN 'Publicado'
  ELSE 'Rascunho'
END
WHERE status IS NULL OR status = '';

-- Add index on status for fast query filtering
CREATE INDEX IF NOT EXISTS courses_status_idx ON public.courses(status);
