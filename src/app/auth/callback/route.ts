import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/minha-trilha";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const host = forwardedHost ? `https://${forwardedHost}` : origin;
      return NextResponse.redirect(
        `${host}/confirmar?status=sucesso&next=${encodeURIComponent(next)}`
      );
    }
  }

  // Redireciona para página de erro de autenticação ou login com erro
  return NextResponse.redirect(`${origin}/acessar?error=auth_callback_failed`);
}
