import { Redis } from '@upstash/redis'

/**
 * Cliente global do Redis usando Upstash.
 * Perfeito para Serverless (Vercel) por usar REST por debaixo dos panos,
 * não sofrendo com o limite de conexões simultâneas (TCP) como o Redis tradicional.
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})
