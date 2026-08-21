import { redis } from './redis';

export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowInSeconds: number = 60
): Promise<{ success: boolean; currentCount: number }> {
  try {
    const key = `ratelimit:${identifier}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowInSeconds);
    }

    return {
      success: current <= limit,
      currentCount: current,
    };
  } catch (error) {
    console.warn(`[Redis RateLimit Fallback] Falha ao contar para ${identifier}. Liberando acesso.`, error);
    // Em caso de falha no Redis, deixamos passar para não bloquear a plataforma inteira
    return { success: true, currentCount: 1 };
  }
}
