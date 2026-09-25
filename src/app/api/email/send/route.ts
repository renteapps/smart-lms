import { NextRequest, NextResponse } from "next/server";
import { getResendServerConfig, sendConfiguredEmail } from "@/lib/resendServer";
import { requireAdmin } from "@/lib/supabase/auth";
import { EmailSendPayload } from "@/types/resend";

/*
 * Esta rota dispara e-mail arbitrário (`to`, `subject`, `html`) pelo domínio
 * Resend da plataforma. Sem autenticação ela era um relay aberto: qualquer
 * pessoa na internet mandava e-mail com o nosso remetente, o que queima a
 * reputação do domínio e serve phishing em cima da marca.
 *
 * `/api/` é prefixo público no middleware (ver `lib/supabase/middleware.ts`),
 * então a rota tem de se defender sozinha. O único consumidor é a tela de
 * notificações do admin, que já exige sessão de administrador.
 */
export async function POST(req: NextRequest) {
  let adminClient;
  try {
    ({ adminClient } = await requireAdmin());
  } catch {
    return NextResponse.json(
      { success: false, error: "Acesso restrito a administradores." },
      { status: 403 }
    );
  }

  try {
    const payload: EmailSendPayload = await req.json();

    if (!payload.to) {
      return NextResponse.json(
        { success: false, error: "Destinatário ('to') é obrigatório." },
        { status: 400 }
      );
    }

    const config = await getResendServerConfig(adminClient);
    if (!config.enabled) {
      return NextResponse.json(
        {
          success: false,
          error: "O serviço de envio de e-mails via Resend está inativo nas configurações.",
        },
        { status: 400 }
      );
    }

    // Os liga/desliga por tipo de e-mail são checados dentro de sendConfiguredEmail.
    const result = await sendConfiguredEmail(adminClient, payload);

    if (result.success) {
      return NextResponse.json({
        success: true,
        id: result.id,
        simulated: result.simulated,
        message: result.message || "E-mail processado com sucesso.",
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || "Erro ao disparar e-mail." },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Erro interno ao processar disparo de e-mail.";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
