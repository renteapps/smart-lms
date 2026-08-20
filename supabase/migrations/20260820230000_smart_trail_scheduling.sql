-- Trilha inteligente: rotina com tempo por dia, reconciliação com o catálogo e
-- conteúdo já concluído fora da agenda.
--
-- Três mudanças, todas a serviço do motor em `src/lib/matching.ts`:
--
-- 1. `trail_catalog_stamp()` — um carimbo barato do que o motor precisa saber
--    para decidir se vale reconstruir a trilha de alguém. Sem ele, a única
--    forma de descobrir que o admin mapeou um conteúdo novo numa resposta seria
--    remontar o índice inteiro de cursos/aulas/artigos a cada visita do aluno.
--    Com ele, é uma consulta só: se o carimbo não mudou, nada a fazer.
--
-- 2. Índice para "o que essa pessoa já concluiu" — a consulta que impede a
--    trilha de reagendar conteúdo que o aluno já viu na sala de aula.
--
-- 3. Backfill do JSON das trilhas e do questionário para o novo formato de
--    disponibilidade (`mode` + minutos por dia da semana).

-- ---------------------------------------------------------------------------
-- 1. Carimbo do catálogo
-- ---------------------------------------------------------------------------

-- Publicar questionário, criar/editar/apagar aula, curso ou artigo muda o
-- carimbo. Contagens entram junto com os máximos de data porque exclusão não
-- move `updated_at` de ninguém.
CREATE OR REPLACE FUNCTION public.trail_catalog_stamp()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT concat_ws(
    '|',
    (SELECT COALESCE(MAX(version), 0) FROM public.trail_questionnaires WHERE status = 'published'),
    (SELECT COUNT(*) FROM public.courses),
    (SELECT COALESCE(MAX(updated_at), timezone('utc'::text, 'epoch'::timestamptz)) FROM public.courses),
    (SELECT COUNT(*) FROM public.modules),
    (SELECT COALESCE(MAX(created_at), timezone('utc'::text, 'epoch'::timestamptz)) FROM public.modules),
    (SELECT COUNT(*) FROM public.lessons),
    (SELECT COALESCE(MAX(updated_at), timezone('utc'::text, 'epoch'::timestamptz)) FROM public.lessons),
    (SELECT COUNT(*) FROM public.articles),
    (SELECT COALESCE(MAX(updated_at), timezone('utc'::text, 'epoch'::timestamptz)) FROM public.articles)
  );
$$;

GRANT EXECUTE ON FUNCTION public.trail_catalog_stamp() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. "O que essa pessoa já concluiu"
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS lesson_progress_completed_idx
  ON public.lesson_progress (user_id, lesson_id)
  WHERE is_completed;

-- ---------------------------------------------------------------------------
-- 3. Disponibilidade no novo formato
-- ---------------------------------------------------------------------------

-- Trilhas existentes ganham `mode: 'uniform'` explícito. O motor já trata a
-- ausência como uniforme; gravar o valor evita que a tela de ajuste precise
-- adivinhar em qual modo a pessoa está.
UPDATE public.student_trails
SET trail_data = jsonb_set(
      trail_data,
      '{availability,mode}',
      '"uniform"'::jsonb,
      true
    )
WHERE trail_data ? 'availability'
  AND NOT (trail_data -> 'availability' ? 'mode');

-- A pergunta de disponibilidade passa a oferecer "tempo diferente por dia".
-- Rascunho e versões arquivadas entram junto: reabrir uma versão antiga no
-- admin não deve mostrar uma configuração incompleta.
UPDATE public.trail_questionnaires q
SET questions = (
  SELECT jsonb_agg(
           CASE
             WHEN item ->> 'type' = 'availability'
               THEN jsonb_set(
                      item,
                      '{availabilityConfig}',
                      COALESCE(
                        item -> 'availabilityConfig',
                        '{"minutePresets": [15, 30, 45, 60, 90], "minMinutes": 10, "maxMinutes": 240}'::jsonb
                      ) || '{"allowPerDayMinutes": true}'::jsonb,
                      true
                    )
             ELSE item
           END
           ORDER BY position
         )
  FROM jsonb_array_elements(q.questions) WITH ORDINALITY AS entry(item, position)
)
WHERE jsonb_typeof(q.questions) = 'array'
  AND q.questions @> '[{"type": "availability"}]'::jsonb;
