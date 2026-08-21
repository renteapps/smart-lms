import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { createClient } from '@/lib/supabase/server';

// Esta rota deve ser chamada a cada 1 minuto por um serviço de Cron
// Ex: Vercel Cron Jobs (vercel.json) ou Upstash QStash
export async function GET(request: Request) {
  try {
    // 1. Pega o tamanho atual da fila no Redis
    const queueLength = await redis.llen('progress_sync_queue');
    
    if (queueLength === 0) {
      return NextResponse.json({ success: true, message: 'Fila vazia. Nada a sincronizar.' });
    }

    // 2. Retira até 1000 itens da fila de uma vez (Processamento em Lote)
    // LPOP com count é atômico
    const batchStrs = await redis.lpop('progress_sync_queue', Math.min(queueLength, 1000));
    
    if (!batchStrs || batchStrs.length === 0) {
      return NextResponse.json({ success: true, message: 'Nada retirado da fila.' });
    }

    // O retorno pode ser um array (se > 1) ou uma string (se count=1 em versões antigas do ioredis), 
    // mas o lpop com count > 1 geralmente retorna array
    const items = Array.isArray(batchStrs) ? batchStrs : [batchStrs];
    const payload = items.map(str => JSON.parse(str));

    // 3. Envia o lote inteiro de uma vez para o Supabase (via RPC que criamos)
    const supabase = await createClient();
    
    const { data: msgId, error } = await supabase.rpc('enqueue_progress_batch', {
      batch_payload: payload
    });

    if (error) {
      console.error('Erro ao enviar lote para pgmq no Supabase:', error);
      // Fallback: se falhou, devolve os itens pra fila do Redis pra não perder dados!
      if (items.length > 0) {
        await redis.lpush('progress_sync_queue', ...items);
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      processed: items.length, 
      pgmq_message_id: msgId 
    });

  } catch (error) {
    console.error('Falha no Sync Cron:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
