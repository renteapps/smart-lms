import { NextResponse } from 'next/server'
import { bufferProgressPing } from '@/lib/redis/progress-buffer'
import { getSessionUser } from '@/lib/supabase/auth'

/**
 * Rota chamada pelo frontend a cada X segundos do vídeo.
 * O objetivo dessa rota é não bloquear, não bater no banco e retornar um 200 OK o mais rápido possível.
 */
export async function POST(request: Request) {
  try {
    // 1. Validação simples de sessão (baleada na borda se estivermos usando Edge)
    const { user } = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // 2. Extrai os dados do ping
    const body = await request.json()
    const { lessonId, enrollmentId, seconds, completed } = body

    if (!lessonId || !enrollmentId || typeof seconds !== 'number') {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // 3. Joga no Redis (Fire and Forget seguro, pois o Upstash é via REST e tem await rápido)
    await bufferProgressPing({
      userId: user.id,
      lessonId,
      enrollmentId,
      seconds,
      completed: Boolean(completed)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar ping no Redis:', error)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}
