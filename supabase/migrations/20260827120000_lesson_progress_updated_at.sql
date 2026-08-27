-- "Continuar assistindo": ordenar pela aula assistida por último.
-- lesson_progress não tinha timestamp de atualização, então a home renderizava
-- as aulas em ordem de heap (~ordem de criação), empurrando as recentes p/ a direita.

alter table public.lesson_progress
  add column if not exists updated_at timestamptz not null
  default timezone('utc'::text, now());

-- public.touch_updated_at() já existe (20260815130000_platform_full_schema.sql) e é o
-- mesmo padrão usado em page_builder_drafts (20260825175104). Um BEFORE UPDATE cobre
-- tanto UPDATE direto quanto o caminho UPDATE de INSERT ... ON CONFLICT — que é como
-- saveWatchPosition (src/app/actions/progress.ts), o beacon
-- (src/app/api/lesson-progress/route.ts) e o worker pgmq
-- (20260821074000_progress_consolidation_worker.sql) gravam progresso.
drop trigger if exists set_updated_at on public.lesson_progress;
create trigger set_updated_at
  before update on public.lesson_progress
  for each row execute function public.touch_updated_at();

-- Índice parcial casado com a query de getContinueLessons.
create index if not exists lesson_progress_continue_idx
  on public.lesson_progress (user_id, updated_at desc)
  where is_completed = false;
