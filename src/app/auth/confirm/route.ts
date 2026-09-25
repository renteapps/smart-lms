import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/safeRedirect";

/** Links que dão acesso a uma conta já existente — expirados, levam para pedir outro. */
const ACCESS_LINK_TYPES = new Set<string>(["recovery", "magiclink"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirect(searchParams.get("next"), "/minha-trilha");

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = new URL(next, request.nextUrl.origin).pathname;
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  let verified = false;
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    verified = !error;
  } else if (code) {
    /*
     * `resetPasswordForEmail` aponta o `redirectTo` para cá. Com o template
     * padrão do Supabase (`{{ .ConfirmationURL }}`) e PKCE, o link chega como
     * `?code=` em vez de `token_hash` — sem este ramo, todo "esqueci a senha"
     * terminava em "token inválido". Só funciona no mesmo navegador que pediu
     * o reset (o code_verifier fica em cookie); o template com `{{ .TokenHash }}`
     * não tem essa limitação.
     */
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  }

  if (verified) {
    // Se for recuperação de senha, redireciona para a tela de definir nova senha
    if (type === "recovery") {
      redirectTo.pathname = "/resetar-senha";
      redirectTo.searchParams.set("mode", "update");
      return NextResponse.redirect(redirectTo);
    }
    redirectTo.pathname = "/confirmar";
    redirectTo.searchParams.set("status", "sucesso");
    redirectTo.searchParams.set("next", next);
    return NextResponse.redirect(redirectTo);
  }

  // Link de acesso vencido: a pessoa já tem conta, então o caminho é pedir outro
  // link — não a tela de "confirme seu cadastro".
  if (type && ACCESS_LINK_TYPES.has(type)) {
    redirectTo.pathname = "/resetar-senha";
    redirectTo.searchParams.set("expirado", "1");
    return NextResponse.redirect(redirectTo);
  }

  // Se falhar ou expirar, envia para a página de confirmação com aviso de erro
  redirectTo.pathname = "/confirmar";
  redirectTo.searchParams.set("error", "token_invalido_ou_expirado");
  return NextResponse.redirect(redirectTo);
}
