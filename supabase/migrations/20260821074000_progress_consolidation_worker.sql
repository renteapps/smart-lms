-- ============================================================================
-- WORKER DE CONSOLIDAÇÃO DE PROGRESSO COM PGMQ E PG_CRON
-- ============================================================================

-- 1. Cria a fila específica para os lotes de sincronização de progresso
select pgmq.create('progress_sync_jobs');

-- 2. Cria a função (RPC) que o Next.js vai chamar para enfileirar o lote
-- O Next.js vai pegar os dados do Redis, montar um JSON array e chamar essa função.
create or replace function public.enqueue_progress_batch(batch_payload jsonb)
returns bigint
language plpgsql
security definer -- Roda com privilégios de admin para inserir na fila do pgmq
set search_path = ''
as $$
declare
  v_msg_id bigint;
begin
  -- Insere a mensagem na fila 'progress_sync_jobs' usando a API do pgmq
  -- pgmq.send(queue_name, message_jsonb)
  select * into v_msg_id from pgmq.send('progress_sync_jobs', batch_payload);
  return v_msg_id;
end;
$$;

-- 3. Cria a função que atua como WORKER (Consumidor da Fila)
-- Esta função processa as mensagens da fila e faz o UPSERT no banco.
create or replace function public.process_progress_sync_jobs()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_msg record;
  v_progress record;
begin
  -- Lê até 5 mensagens da fila. 
  -- O tempo de visibilidade é 60 segundos (se falhar, volta pra fila após 60s).
  for v_msg in select * from pgmq.read('progress_sync_jobs', 5, 60) loop
    
    -- O payload esperado é um array de objetos JSON:
    -- [{ "enrollmentId": "...", "lessonId": "...", "seconds": 120, "completed": true }, ...]
    
    -- Faz o UPSERT em lote extraindo os dados do JSON
    insert into public.lesson_progress (user_id, lesson_id, last_watched_second, is_completed, completed_at)
    select
      (elem->>'userId')::uuid,
      (elem->>'lessonId')::uuid,
      (elem->>'seconds')::integer,
      (elem->>'completed')::boolean,
      case when (elem->>'completed')::boolean then timezone('utc'::text, now()) else null end
    from jsonb_array_elements(v_msg.message) as elem
    on conflict (user_id, lesson_id) 
    do update set
      last_watched_second = GREATEST(public.lesson_progress.last_watched_second, EXCLUDED.last_watched_second),
      is_completed = public.lesson_progress.is_completed OR EXCLUDED.is_completed,
      completed_at = COALESCE(public.lesson_progress.completed_at, EXCLUDED.completed_at);

    -- Após processar com sucesso, apaga a mensagem da fila (ACK)
    perform pgmq.delete('progress_sync_jobs', v_msg.msg_id);
    
  end loop;
end;
$$;

-- OPCIONALMENTE: Agendar o worker nativamente usando pg_cron (se ativado no Supabase)
-- Se o pg_cron estiver ativo no projeto, isso faz o banco rodar o worker sozinho a cada minuto!
-- select cron.schedule('process-progress-queue', '* * * * *', 'select public.process_progress_sync_jobs()');
