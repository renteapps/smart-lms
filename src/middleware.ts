import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { updateSession } from "@/lib/supabase/middleware";

// Inicializa o Limitador usando o Upstash Redis
// Permite 100 requisições a cada 10 segundos por IP (ótimo padrão para bloquear robôs sem afetar alunos)
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(), // Lê automaticamente as variáveis UPSTASH_REDIS_REST_* que configuramos
  limiter: Ratelimit.slidingWindow(100, "10 s"),
  analytics: true, // Habilita dashboard no painel do Upstash
});

export async function middleware(request: NextRequest) {
  // 1. Identifica o IP do usuário (seja local ou rodando na Vercel/Cloudflare)
  const ip = request.ip ?? request.headers.get("x-forwarded-for") ?? "127.0.0.1";

  // 2. Passa o IP pelo Rate Limiter
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  // 3. Se o IP excedeu 100 requisições em 10 segundos, bloqueia instantaneamente na Borda (Edge)
  if (!success) {
    // Retorna erro 429 (Too Many Requests) antes mesmo de tocar no seu banco de dados
    return new NextResponse("Muitas requisições. Por favor, tente novamente mais tarde.", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      },
    });
  }

  // 4. Se passou pela segurança (não é ataque), chama a verificação normal de Sessão (Supabase)
  return updateSession(request);
}

// 5. Configura o Middleware para rodar em todas as rotas (API e Páginas), exceto arquivos estáticos
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
