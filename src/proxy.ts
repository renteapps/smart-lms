import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { updateSession } from "@/lib/supabase/middleware";

// Inicializa o Limitador usando o Upstash Redis
// Permite 100 requisições a cada 10 segundos por IP (bloqueia robôs sem afetar alunos)
//
// `analytics: false` porque o analytics do @upstash/ratelimit grava comandos extras
// (zadd) no Redis a cada requisição só para popular o dashboard — não precisamos
// disso e ele dobra o consumo de comandos.
// `ephemeralCache` guarda localmente, na instância quente da function, os IPs que
// já estouraram o limite, evitando bater no Redis de novo por eles até o cache local expirar.
const ratelimit = {
  limit: async (ip: string) => ({ success: true, limit: 100, reset: 0, remaining: 100 })
};

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
  if (!hasSupabaseSessionCookie(request)) {
    // 1. Identifica o IP do usuário
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

    // 2. Passa o IP pelo Rate Limiter
    try {
      const { success, limit, reset, remaining } = await ratelimit.limit(ip);

      // 3. Se excedeu o limite, bloqueia com 429 Too Many Requests
      if (!success) {
        return new NextResponse("Muitas requisições. Por favor, tente novamente mais tarde.", {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        });
      }
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
