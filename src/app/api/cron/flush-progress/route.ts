import { NextResponse } from 'next/server'
import { getAndClearDirtyProgress } from '@/lib/redis/progress-buffer'
import { createClient } from '@supabase/supabase-js'

import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'

// Para Vercel Cron, garantimos que a rota não faça cache e use tempo máximo se necessário
export const dynamic = 'force-dynamic'
export const maxDuration = 60 

/**
 * Esta rota deve ser chamada a cada X minutos (ex: 5 em 5 min) por um Cron Job (Upstash QStash).
 * Ela não tem interface. O único trabalho dela é:
 * 1. Puxar todos os "pings" de vídeo que estão no Redis.
 * 2. Limpar o Redis.
 * 3. Enviar esse pacote gigantesco em um único JSON Array para o PostgreSQL (PGMQ).
 */
export const POST = verifySignatureAppRouter(async function POST(request: Request) {
  try {

    // 1. Pega os dados do Redis
    const payloads = await getAndClearDirtyProgress()

    if (!payloads || payloads.length === 0) {
      return NextResponse.json({ message: 'Nenhum progresso pendente' })
    }

    // 2. Cria cliente de serviço (Admin) para enviar pra fila
    // Usamos o Service Role pois rotas de Cron rodam em background (não tem sessão de usuário)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 3. Enfileira o lote de dados na função Postgres que criamos (enqueue_progress_batch)
    const { error } = await supabaseAdmin.rpc('enqueue_progress_batch', {
      batch_payload: payloads
    })

    if (error) {
      console.error('Erro ao enviar lote para o PGMQ:', error)
      return NextResponse.json({ error: 'Falha no banco' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      processed_count: payloads.length 
    })

  } catch (error) {
    console.error('Erro na cron de consolidação:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
