import { redis } from './client'

const DIRTY_SET_KEY = 'progress:dirty_keys'

export type ProgressPayload = {
  userId: string
  lessonId: string
  enrollmentId: string
  seconds: number
  completed: boolean
}

/**
 * Salva o "ping" de progresso de um aluno no Redis.
 * Esta função deve ser chamada a cada X segundos pelo frontend do curso.
 */
export async function bufferProgressPing(payload: ProgressPayload) {
  const { userId, lessonId, enrollmentId, seconds, completed } = payload
  
  // Identificador único para a sessão do aluno nesta aula
  const key = `progress:data:${enrollmentId}:${lessonId}`
  
  // Usamos pipeline para rodar múltiplos comandos em 1 única requisição HTTP (performance)
  const p = redis.pipeline()
  
  // Atualiza ou insere os dados da aula
  p.hset(key, {
    userId,
    enrollmentId,
    lessonId,
    seconds,
    completed: completed ? 'true' : 'false',
    updatedAt: Date.now()
  })
  
  // Marca essa chave como "suja" (dirty) para o worker saber que precisa salvar no Postgres
  p.sadd(DIRTY_SET_KEY, key)
  
  await p.exec()
}

/**
 * Esta função será rodada por um Worker (Cron Job ou Fila PGMQ) a cada X minutos.
 * Ela busca tudo que está na fila "dirty", prepara os dados para o Postgres
 * e limpa a fila do Redis.
 */
export async function getAndClearDirtyProgress() {
  // 1. Pega todas as chaves pendentes
  const dirtyKeys = await redis.smembers(DIRTY_SET_KEY)
  
  if (!dirtyKeys || dirtyKeys.length === 0) {
    return []
  }

  // 2. Busca os dados de todas essas chaves de uma vez
  const pipeline = redis.pipeline()
  for (const key of dirtyKeys) {
    pipeline.hgetall(key)
  }
  
  const results = await pipeline.exec()
  
  // 3. Limpa as chaves da fila "dirty" (se elas voltarem a ser atualizadas depois daqui,
  // elas entrarão na fila novamente no próximo ping)
  if (dirtyKeys.length > 0) {
    await redis.srem(DIRTY_SET_KEY, ...dirtyKeys)
  }

  return results.map((res: any) => ({
    userId: res.userId,
    enrollmentId: res.enrollmentId,
    lessonId: res.lessonId,
    seconds: parseInt(res.seconds || '0', 10),
    completed: res.completed === 'true',
  }))
}
