-- Cursos galeria (cursos destaque)
--
-- Um curso galeria é uma coleção de aulas avulsas — masterclasses e aulas
-- importantes que não pertencem a uma sequência. Ele não tem módulos: a capa é
-- uma galeria de thumbs verticais, e não a lista de módulos dos cursos comuns.
--
-- O tipo é escolhido na criação e congelado a partir daí. Converter um curso
-- depois de publicado significaria inventar módulos para aulas soltas (ou o
-- contrário, achatar módulos em uma galeria) com o progresso dos alunos já
-- gravado em cima da estrutura antiga — o banco recusa a troca em vez de
-- depender de cada tela lembrar da regra.

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS layout TEXT NOT NULL DEFAULT 'modules';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS home_carousel BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_layout_check') THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_layout_check CHECK (layout IN ('modules', 'gallery'));
  END IF;

  -- Carrossel na home é uma opção do curso galeria; em curso com módulos ela
  -- não existe nem na interface.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_home_carousel_gallery_only') THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_home_carousel_gallery_only
      CHECK (home_carousel = false OR layout = 'gallery');
  END IF;
END $$;

-- Thumb vertical (2:3) da aula: é ela que aparece na galeria do curso e no
-- carrossel da home. Sem ela a aula cai na capa do curso.
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- O carrossel lê as 8 aulas mais recentes de cada curso marcado.
CREATE INDEX IF NOT EXISTS idx_lessons_module_created_at
  ON public.lessons (module_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_home_carousel
  ON public.courses (home_carousel)
  WHERE home_carousel;

-- ---------------------------------------------------------------------------
-- O tipo do curso não muda depois de criado
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.freeze_course_layout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.layout IS DISTINCT FROM OLD.layout THEN
    RAISE EXCEPTION 'O tipo do curso não pode ser alterado depois da criação (% para %).',
      OLD.layout, NEW.layout;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_freeze_layout ON public.courses;
CREATE TRIGGER courses_freeze_layout
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.freeze_course_layout();

-- ---------------------------------------------------------------------------
-- Curso galeria nasce com o módulo único que guarda as aulas
-- ---------------------------------------------------------------------------
-- As aulas continuam penduradas em um módulo (`lessons.module_id`), como no
-- resto da plataforma — progresso, trilha e catálogo seguem funcionando sem
-- exceção. A diferença é que esse módulo é de infraestrutura: ele é criado
-- junto com o curso, é sempre um só, e nenhuma tela o mostra.
CREATE OR REPLACE FUNCTION public.seed_gallery_course_module()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.layout = 'gallery' THEN
    INSERT INTO public.modules (course_id, title, description, order_index)
    VALUES (NEW.id, 'Aulas', 'Coleção de aulas do curso galeria.', 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_seed_gallery_module ON public.courses;
CREATE TRIGGER courses_seed_gallery_module
  AFTER INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_gallery_course_module();

-- ---------------------------------------------------------------------------
-- Curso galeria não ganha um segundo módulo
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_single_gallery_module()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_layout TEXT;
BEGIN
  SELECT layout INTO v_layout FROM public.courses WHERE id = NEW.course_id;

  IF v_layout = 'gallery' AND EXISTS (
    SELECT 1 FROM public.modules WHERE course_id = NEW.course_id
  ) THEN
    RAISE EXCEPTION 'Curso galeria não tem módulos: as aulas ficam todas na mesma coleção.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modules_single_for_gallery ON public.modules;
CREATE TRIGGER modules_single_for_gallery
  BEFORE INSERT ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_gallery_module();
