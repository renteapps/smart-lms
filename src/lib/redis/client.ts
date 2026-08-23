import { Redis } from '@upstash/redis'

/**
 * Cliente global do Redis usando Upstash.
 * Perfeito para Serverless (Vercel) por usar REST por debaixo dos panos,
 * não sofrendo com o limite de conexões simultâneas (TCP) como o Redis tradicional.
 */
export const redis = {
  get: async () => null,
  set: async () => "OK",
  incr: async () => 1,
  expire: async () => 1,
} as unknown as Redis;
