import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/minha-trilha";

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
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
  }

  // Se falhar ou expirar, envia para a página de confirmação com aviso de erro
  redirectTo.pathname = "/confirmar";
  redirectTo.searchParams.set("error", "token_invalido_ou_expirado");
  return NextResponse.redirect(redirectTo);
}
