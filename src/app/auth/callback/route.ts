import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/safeRedirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirect(searchParams.get("next"), "/minha-trilha");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sempre a origem da própria requisição: x-forwarded-host é controlável
      // fora da Vercel e virava open redirect logo após o login.
      return NextResponse.redirect(
        `${origin}/confirmar?status=sucesso&next=${encodeURIComponent(next)}`
      );
    }
  }

  // Redireciona para página de erro de autenticação ou login com erro
  return NextResponse.redirect(`${origin}/acessar?error=auth_callback_failed`);
}
