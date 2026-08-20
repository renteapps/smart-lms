import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

/**
 * Atualiza sessão apenas onde a identidade muda a resposta ou protege a rota.
 * APIs validam autorização no próprio handler; blog e assets ficam totalmente
 * fora do caminho de rede do Supabase.
 */
export const config = {
  matcher: [
    "/acessar/:path*",
    "/criar-conta/:path*",
    "/resetar-senha/:path*",
    "/confirmar/:path*",
    "/admin/:path*",
    "/agentes/:path*",
    "/analises/:path*",
    "/busca/:path*",
    "/courses/:path*",
    "/cursos/:path*",
    "/empresa/:path*",
    "/minha-trilha/:path*",
    "/notas/:path*",
    "/onboarding/:path*",
    "/perfil/:path*",
  ],
};
