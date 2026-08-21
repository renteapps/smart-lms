import { redis } from './redis/client';

export { redis };

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
    // 1. Tenta buscar do Redis primeiro
    const cachedData = await redis.get<T>(key);

    if (cachedData) {
      return cachedData;
    }

    // 2. Se não tem no cache, executa a query no Supabase
    const freshData = await fetcher();

    // 3. Salva no Redis para as próximas requisições
    if (freshData !== undefined && freshData !== null) {
      await redis.set(key, freshData, { ex: ttl });
    }

    return freshData;
  } catch (error) {
    return fetcher();
  }
}

