-- Create tables
CREATE TABLE IF NOT EXISTS public.course_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.course_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tags ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users (so they can see options in forms/filters)
CREATE POLICY "Allow read access to all authenticated users for course_categories" 
  ON public.course_categories FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Allow read access to all authenticated users for course_tags" 
  ON public.course_tags FOR SELECT 
  TO authenticated USING (true);

-- Allow admin full access
CREATE POLICY "Allow admin full access to course_categories" 
  ON public.course_categories FOR ALL 
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow admin full access to course_tags" 
  ON public.course_tags FOR ALL 
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Migrate existing categories
INSERT INTO public.course_categories (name, slug)
SELECT DISTINCT category, category
FROM public.courses
WHERE category IS NOT NULL AND category != ''
ON CONFLICT DO NOTHING;

-- Migrate existing tags
INSERT INTO public.course_tags (name, slug)
SELECT DISTINCT unnest(tags), unnest(tags)
FROM public.courses
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
ON CONFLICT DO NOTHING;
