-- Create article_authors table
CREATE TABLE IF NOT EXISTS public.article_authors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.article_authors ENABLE ROW LEVEL SECURITY;

-- Allow read access to anyone (public visitors & authenticated users)
DROP POLICY IF EXISTS "Allow read access to all for article_authors" ON public.article_authors;
CREATE POLICY "Allow read access to all for article_authors"
  ON public.article_authors FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow admins full access
DROP POLICY IF EXISTS "Allow admin full access to article_authors" ON public.article_authors;
CREATE POLICY "Allow admin full access to article_authors"
  ON public.article_authors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Index on slug
CREATE INDEX IF NOT EXISTS idx_article_authors_slug ON public.article_authors(slug);

-- Add author_id to articles
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.article_authors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_articles_author_id ON public.articles(author_id);

-- Migrate existing authors from articles table
INSERT INTO public.article_authors (name, slug, title)
SELECT DISTINCT
  author,
  lower(regexp_replace(author, '[^a-zA-Z0-9]+', '-', 'g')),
  'Autor do Blog'
FROM public.articles
WHERE author IS NOT NULL AND author != ''
ON CONFLICT (slug) DO NOTHING;

-- Default "Equipe" author if none exists
INSERT INTO public.article_authors (name, slug, title)
VALUES ('Equipe', 'equipe', 'Equipe Editorial')
ON CONFLICT (slug) DO NOTHING;

-- Link existing articles to article_authors
UPDATE public.articles a
SET author_id = au.id
FROM public.article_authors au
WHERE a.author_id IS NULL AND a.author = au.name;
