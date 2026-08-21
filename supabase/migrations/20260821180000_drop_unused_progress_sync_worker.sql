-- ============================================================================
-- REMOÇÃO DO WORKER DE PROGRESSO VIA PGMQ (SEM CHAMADOR)
-- ============================================================================
--
-- O worker de progresso via PGMQ (enqueue_progress_batch / process_progress_sync_jobs),
-- criado em 20260821074000_progress_consolidation_worker.sql, ficou sem chamador:
-- o progresso de vídeo agora grava direto em lesson_progress via server action
-- (saveWatchPosition, com throttle no cliente), sem passar por Redis nem por fila.
--
-- Confirmado antes deste drop: fila 'progress_sync_jobs' vazia, nenhum trigger
-- ou outra função dependendo dessas duas, e pg_cron nem está instalado no projeto
-- (o agendamento no fim da migration original ficou comentado e nunca rodou).

drop function if exists public.process_progress_sync_jobs();
drop function if exists public.enqueue_progress_batch(jsonb);

select pgmq.drop_queue('progress_sync_jobs');
