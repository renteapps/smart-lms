import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
let redisInstance: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redisUrl) return null;
  if (!redisInstance) {
    redisInstance = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }
  return redisInstance;
}

export const redis = redisUrl ? new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 }) : (null as unknown as Redis);

/**
 * Helper genérico para buscar dados em cache antes de consultar o banco (Supabase).
 * 
 * @param key A chave única no Redis (ex: "course_catalog:all", "user_stats:123")
 * @param fetcher Função assíncrona que busca os dados no Supabase caso o cache falhe
 * @param ttl Segundos de validade do cache (Time To Live). Padrão: 3600s (1 hora)
 * @returns Os dados cacheados ou recém-buscados.
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  try {
    const client = getRedisClient();
    if (!client) {
      return fetcher();
    }

    // 1. Tenta buscar do Redis primeiro
    const cachedData = await client.get(key);

    if (cachedData) {
      return JSON.parse(cachedData) as T;
    }

    // 2. Se não tem no cache, executa a query no Supabase
    const freshData = await fetcher();

    // 3. Salva no Redis para as próximas requisições
    if (freshData !== undefined && freshData !== null) {
      await client.set(key, JSON.stringify(freshData), 'EX', ttl);
    }

    return freshData;
  } catch (error) {
    return fetcher();
  }
}
