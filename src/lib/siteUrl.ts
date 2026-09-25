/** Domínio público da plataforma em produção. */
export const CANONICAL_SITE_URL = "https://www.plataformag6.com";

function trimSlash(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/**
 * URL pública da plataforma para metadata, sitemap, robots e links que saem
 * por e-mail.
 *
 * `NEXT_PUBLIC_APP_URL` vence quando configurada. Sem ela, produção usa o
 * domínio canônico — `VERCEL_URL` é a URL do deploy (`*.vercel.app`), que não
 * deve aparecer em sitemap nem em e-mail de aluno. Preview/dev ficam na
 * própria URL do deploy.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configured) return trimSlash(configured);
  if (process.env.VERCEL_ENV === "production") return CANONICAL_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return CANONICAL_SITE_URL;
}
