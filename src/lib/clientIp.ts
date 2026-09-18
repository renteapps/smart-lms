type HeaderReader = { get(name: string): string | null };

/**
 * IP do cliente para chaves de rate limit.
 *
 * `x-forwarded-for` é uma lista ("cliente, proxy1, proxy2"); usar o header
 * inteiro como chave deixava qualquer um ganhar um balde novo só acrescentando
 * valores. Na Vercel o primeiro item é o IP real (a plataforma sobrescreve o
 * header), e `x-real-ip` é o fallback.
 */
export function getClientIp(headers: HeaderReader): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown-ip";
}
