import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { updateSession } from "@/lib/supabase/middleware";
import { getClientIp } from "@/lib/clientIp";

// Inicializa o Limitador usando o Upstash Redis
// Permite 100 requisições a cada 10 segundos por IP (bloqueia robôs sem afetar alunos)
//
// `analytics: false` porque o analytics do @upstash/ratelimit grava comandos extras
// (zadd) no Redis a cada requisição só para popular o dashboard — não precisamos
// disso e ele dobra o consumo de comandos.
// `ephemeralCache` guarda localmente, na instância quente da function, os IPs que
// já estouraram o limite, evitando bater no Redis de novo por eles até o cache local expirar.
//
// Sem as variáveis do Upstash (dev local) os limitadores ficam desligados.
const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const ratelimit = hasUpstash
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, "10 s"),
      analytics: false,
      ephemeralCache: new Map(),
      prefix: "rl:global",
    })
  : null;

/**
 * Rotas caras ou sensíveis a abuso: login/cadastro/recuperação (POST de server
 * action, força bruta e e-mail bombing) e as rotas de IA (custo por chamada).
 * Aqui o limite vale mesmo com cookie de sessão — o atalho do cookie só checa o
 * NOME do cookie, então `Cookie: sb-x-auth-token=1` bastava para escapar.
 */
const sensitiveRatelimit = hasUpstash
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(60, "60 s"),
      analytics: false,
      ephemeralCache: new Map(),
      prefix: "rl:sensitive",
    })
  : null;

const SENSITIVE_POST_PREFIXES = ["/acessar", "/criar-conta", "/resetar-senha", "/confirmar", "/api/ai/"];

function isSensitiveRequest(request: NextRequest) {
  if (request.method !== "POST") return false;
  const { pathname } = request.nextUrl;
  return SENSITIVE_POST_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function tooManyRequests(limit: number, remaining: number, reset: number) {
  return new NextResponse("Muitas requisições. Por favor, tente novamente mais tarde.", {
    status: 429,
    headers: {
      "Retry-After": Math.max(1, Math.ceil((reset - Date.now()) / 1000)).toString(),
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    },
  });
}

/**
 * Nome dos cookies de sessão que o `@supabase/ssr` grava (`sb-<project-ref>-auth-token`,
 * às vezes fatiado em `.0`/`.1` quando o token é grande). Só precisamos saber se
 * *existe* um cookie de sessão — a validação de verdade (`getUser()`) já acontece
 * logo abaixo em `updateSession`.
 */
function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some(
    (cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"),
  );
}

export async function proxy(request: NextRequest) {
  // Quem já tem sessão do Supabase não passa pelo rate limiter do Redis: essa
  // pessoa já é identificável e auditável pelo próprio Supabase (getUser logo
  // abaixo), então o risco de bot/DoS que o Upstash protege aqui é só do
  // tráfego sem sessão (marketing, /acessar, /criar-conta, etc). Isso também
  // tira do Redis os pings de progresso de vídeo — Server Functions do Next.js
  // viram POST nesta mesma rota, então cada `saveWatchPosition` a cada 10s de
  // aula assistida também batia aqui antes desse corte.
  const ip = getClientIp(request.headers);
  const limiter = isSensitiveRequest(request)
    ? sensitiveRatelimit
    : hasSupabaseSessionCookie(request)
      ? null
      : ratelimit;

  if (limiter) {
    try {
      const { success, limit, reset, remaining } = await limiter.limit(ip);
      if (!success) return tooManyRequests(limit, remaining, reset);
    } catch (error) {
      console.warn("[RateLimit Fallback] Falha ao consultar Upstash. Permitindo tráfego.", error);
    }
  }

  // 4. Faz a validação de sessão do Supabase
  return updateSession(request);
}

/**
 * Matcher configurado para rodar em todas as rotas de API e páginas,
 * excluindo arquivos estáticos, imagens e — principalmente — os prefetches
 * automáticos do Next.js (hover/viewport em <Link>) e as chamadas RSC de
 * navegação. Cada <Link> visível na tela dispara um prefetch, e sem esse
 * filtro cada um deles também batia no Redis do rate limiter: em uma sessão
 * normal de navegação isso multiplicava as requisições reais por várias vezes.
 * (O updateSession internamente já sabe filtrar rotas públicas e privadas).
 */
export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
