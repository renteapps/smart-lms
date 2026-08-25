-- Carimbo do catálogo em uma linha só.
--
-- `trail_catalog_stamp()` nasceu (migração 20260820230000) como nove
-- subconsultas: quatro `COUNT(*)` em `courses`, `modules`, `lessons` e
-- `articles`, mais quatro `MAX(updated_at)` sem índice que os sustente. Ele roda
-- a cada visita de cada aluno — a home e a `/minha-trilha` chamam `refreshTrail`
-- no carregamento —, e `COUNT(*)` no Postgres varre a tabela. Ou seja: a
-- consulta mais frequente da plataforma era também a que mais piorava conforme o
-- catálogo crescesse, justamente a que existe para ser barata.
--
-- Quem carimba agora é uma tabela de uma linha, incrementada por gatilho quando
-- alguém mexe no catálogo. O carimbo vira uma leitura por chave primária.

-- ---------------------------------------------------------------------------
-- 1. A linha do carimbo
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.catalog_version (
  -- Coluna-trava: default `true` mais `CHECK (id)` deixam a tabela ter no
  -- máximo uma linha, sem depender de ninguém lembrar disso depois.
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.catalog_version (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

-- Ninguém lê esta tabela direto: quem lê é `trail_catalog_stamp()`, que é
-- SECURITY DEFINER. RLS ligada e sem policy nenhuma fecha o acesso pela API.
ALTER TABLE public.catalog_version ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Trocar o formato do carimbo sem provocar a manada
-- ---------------------------------------------------------------------------
--
-- O carimbo guardado em cada trilha (`trail_data -> catalogStamp`) está no
-- formato antigo, então nenhum deles bate com o novo. Sem este passo, o primeiro
-- acesso de **todo** aluno depois deste deploy cairia no recálculo completo do
-- catálogo ao mesmo tempo — exatamente o pico que esta migração existe para
-- evitar.
--
-- Quem já estava em dia com o catálogo antigo recebe o carimbo novo aqui e não
-- recalcula nada. Quem estava desatualizado mantém o carimbo velho e continua
-- com o recálculo legítimo pendente para a próxima visita. O prefixo de formato
-- do plano (`v7:`) é preservado como estava: quem manda nele é o TypeScript
-- (`PLAN_FORMAT`), não esta migração.
DO $$
DECLARE
  previous_stamp TEXT := public.trail_catalog_stamp();
  new_stamp TEXT := (SELECT version::text FROM public.catalog_version WHERE id);
BEGIN
  UPDATE public.student_trails
  SET trail_data = jsonb_set(
        trail_data,
        '{catalogStamp}',
        to_jsonb(split_part(trail_data ->> 'catalogStamp', ':', 1) || ':' || new_stamp),
        true
      )
  WHERE trail_data ->> 'catalogStamp' IS NOT NULL
    AND substr(
          trail_data ->> 'catalogStamp',
          length(split_part(trail_data ->> 'catalogStamp', ':', 1)) + 2
        ) = previous_stamp;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Quem incrementa
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bump_catalog_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.catalog_version
  SET version = version + 1,
      updated_at = timezone('utc'::text, now())
  WHERE id;
  RETURN NULL;
END;
$$;

-- Ninguém chama esta função: ela é de gatilho. Toda função nasce com EXECUTE
-- para PUBLIC, e no Supabase isso a publicaria como
-- `/rest/v1/rpc/bump_catalog_version` para `anon` e `authenticated` — sendo
-- SECURITY DEFINER, um visitante deslogado poderia incrementar o carimbo em
-- loop e forçar o recálculo da trilha de todo mundo, que é exatamente a manada
-- que esta migração existe para evitar. O gatilho segue funcionando: o Postgres
-- cobra EXECUTE de quem cria o gatilho, não de quem dispara o DML.
REVOKE EXECUTE ON FUNCTION public.bump_catalog_version() FROM PUBLIC, anon, authenticated;

-- Gatilho por **statement**, não por linha: reordenar quarenta aulas de um curso
-- é uma mudança de catálogo, não quarenta. As escritas nestas tabelas vêm todas
-- das actions de admin (`src/app/actions/admin/catalog.ts` e `content.ts`), então
-- o carimbo só se mexe quando alguém edita conteúdo de verdade.
DROP TRIGGER IF EXISTS courses_bump_catalog_version ON public.courses;
CREATE TRIGGER courses_bump_catalog_version
AFTER INSERT OR UPDATE OR DELETE ON public.courses
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalog_version();

DROP TRIGGER IF EXISTS modules_bump_catalog_version ON public.modules;
CREATE TRIGGER modules_bump_catalog_version
AFTER INSERT OR UPDATE OR DELETE ON public.modules
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalog_version();

DROP TRIGGER IF EXISTS lessons_bump_catalog_version ON public.lessons;
CREATE TRIGGER lessons_bump_catalog_version
AFTER INSERT OR UPDATE OR DELETE ON public.lessons
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalog_version();

DROP TRIGGER IF EXISTS articles_bump_catalog_version ON public.articles;
CREATE TRIGGER articles_bump_catalog_version
AFTER INSERT OR UPDATE OR DELETE ON public.articles
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalog_version();

DROP TRIGGER IF EXISTS trail_questionnaires_bump_catalog_version ON public.trail_questionnaires;
CREATE TRIGGER trail_questionnaires_bump_catalog_version
AFTER INSERT OR UPDATE OR DELETE ON public.trail_questionnaires
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalog_version();

-- ---------------------------------------------------------------------------
-- 4. O carimbo, agora barato
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trail_catalog_stamp()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT version::text FROM public.catalog_version WHERE id;
$$;

GRANT EXECUTE ON FUNCTION public.trail_catalog_stamp() TO authenticated;
