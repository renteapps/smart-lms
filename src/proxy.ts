import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { updateSession } from "@/lib/supabase/middleware";

// Inicializa o Limitador usando o Upstash Redis
// Permite 100 requisições a cada 10 segundos por IP (bloqueia robôs sem afetar alunos)
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "10 s"),
  analytics: true,
});

export async function proxy(request: NextRequest) {
  // 1. Identifica o IP do usuário
  const ip = request.ip ?? request.headers.get("x-forwarded-for") ?? "127.0.0.1";

  // 2. Passa o IP pelo Rate Limiter
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

  // 4. Se o tráfego for legítimo, faz a validação de sessão do Supabase
  return updateSession(request);
}

/**
 * Matcher configurado para rodar em todas as rotas de API e páginas, 
 * excluindo apenas arquivos estáticos e imagens. 
 * (O updateSession internamente já sabe filtrar rotas públicas e privadas).
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
