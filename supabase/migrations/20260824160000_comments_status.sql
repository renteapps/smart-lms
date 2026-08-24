ALTER TABLE public.comments ADD COLUMN status TEXT DEFAULT 'pending' NOT NULL;

DROP POLICY IF EXISTS "Comentários visíveis para matriculados" ON public.comments;
CREATE POLICY "Comentários visíveis para matriculados" ON public.comments
  FOR SELECT USING (
    status = 'published' OR 
    auth.uid() = user_id OR 
    public.is_admin()
  );
