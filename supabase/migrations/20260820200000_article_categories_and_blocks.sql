-- Create article_categories table (mirrors course_categories)
CREATE TABLE IF NOT EXISTS public.article_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users for article_categories"
  ON public.article_categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow admin full access to article_categories"
  ON public.article_categories FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Migrate existing article categories (no-op today, kept for consistency)
INSERT INTO public.article_categories (name, slug)
SELECT DISTINCT category, category
FROM public.articles
WHERE category IS NOT NULL AND category != ''
ON CONFLICT DO NOTHING;

-- Add blocks column to articles (same pattern as lessons.blocks) so we can
-- reuse the lesson BlockNote editor/viewer for article content.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS blocks JSONB NOT NULL DEFAULT '[]'::jsonb;
