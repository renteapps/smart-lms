import { Redis } from '@upstash/redis'

/**
 * Cliente global do Redis usando Upstash.
 * Perfeito para Serverless (Vercel) por usar REST por debaixo dos panos,
 * não sofrendo com o limite de conexões simultâneas (TCP) como o Redis tradicional.
 *
 * Sem as variáveis do Upstash (dev local, preview sem Redis) cai num stub que
 * nunca conta nada — o rate limit vira no-op em vez de derrubar a requisição.
 */
export const isRedisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

export const redis: Redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : ({
      get: async () => null,
      set: async () => "OK",
      incr: async () => 1,
      expire: async () => 1,
    } as unknown as Redis);
