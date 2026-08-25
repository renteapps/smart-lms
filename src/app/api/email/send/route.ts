import { NextRequest, NextResponse } from "next/server";
import { sendEmail, getResendConfig } from "@/lib/resendService";
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
  try {
    await requireAdmin();
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

    const config = getResendConfig();
    if (!config.enabled) {
      return NextResponse.json(
        {
          success: false,
          error: "O serviço de envio de e-mails via Resend está inativo nas configurações.",
        },
        { status: 400 }
      );
    }

    // Check if category is enabled in config
    if (payload.template) {
      const { platform, notifications } = config.categories;

      if (payload.template === "welcome" && !platform.welcome) {
        return NextResponse.json({
          success: false,
          message: "Disparos de e-mail de Boas-vindas estão desativados nas configurações.",
        });
      }
      if (payload.template === "password_reset" && !platform.passwordReset) {
        return NextResponse.json({
          success: false,
          message: "Disparos de Recuperação de Senha estão desativados nas configurações.",
        });
      }
      if (payload.template === "course_enrollment" && !platform.courseEnrollment) {
        return NextResponse.json({
          success: false,
          message: "Disparos de Matrícula em Cursos estão desativados nas configurações.",
        });
      }
      if (payload.template === "certificate" && !platform.certificateIssued) {
        return NextResponse.json({
          success: false,
          message: "Disparos de Certificado estão desativados nas configurações.",
        });
      }
      if (payload.template === "inactivity" && !notifications.inactivityReengagement) {
        return NextResponse.json({
          success: false,
          message: "Disparos de Reengajamento estão desativados nas configurações.",
        });
      }
      if (payload.template === "notification" && !notifications.broadcasts) {
        return NextResponse.json({
          success: false,
          message: "Disparos de Notificação estão desativados nas configurações.",
        });
      }
    }

    const result = await sendEmail(payload);

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
