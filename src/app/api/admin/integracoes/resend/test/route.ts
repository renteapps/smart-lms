import { NextRequest, NextResponse } from "next/server";
import { validateResendApiKey, getResendDomains } from "@/lib/resendService";
import { getResendServerConfig, sendConfiguredEmail } from "@/lib/resendServer";
import { requireAdmin } from "@/lib/supabase/auth";
import { EmailTemplateType } from "@/types/resend";

export async function POST(req: NextRequest) {
  try {
    const { adminClient } = await requireAdmin();
    const body = await req.json();
    const { action, apiKey, to, template, data } = body;

    // Ação: Validar chave de API
    if (action === "validate_key") {
      if (!apiKey) {
        return NextResponse.json(
          { success: false, message: "Informe a chave de API para validação." },
          { status: 400 }
        );
      }

      const validation = await validateResendApiKey(apiKey);
      return NextResponse.json({
        success: validation.valid,
        message: validation.message,
      });
    }

    if (action === "get_domains") {
      const savedConfig = apiKey ? null : await getResendServerConfig(adminClient);
      const domainsKey = apiKey || savedConfig?.apiKey;
      if (!domainsKey) {
        return NextResponse.json(
          { success: false, message: "Informe a chave de API para buscar domínios." },
          { status: 400 }
        );
      }

      const res = await getResendDomains(domainsKey);
      return NextResponse.json({
        success: res.success,
        domains: res.domains,
        message: res.message,
      });
    }

    // Ação: Enviar e-mail de teste
    const recipient = to?.trim() || "teste@smartlms.com";
    const templateType: EmailTemplateType = template || "test";

    const result = await sendConfiguredEmail(
      adminClient,
      {
        to: recipient,
        subject: body.subject || `E-mail de Teste Resend - Smart LMS`,
        template: templateType === "test" ? "welcome" : templateType,
        data: {
          name: data?.name || "Administrador",
          courseTitle: data?.courseTitle || "Trilha Completa de Formação",
          notificationTitle: data?.notificationTitle || "Disparo de Teste do Resend",
          notificationMessage:
            data?.notificationMessage ||
            "Esta é uma mensagem de teste enviada através da integração do Resend no Smart LMS para validar a entrega de e-mails da plataforma.",
          ...data,
        },
      },
      apiKey ? { apiKey } : undefined,
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.simulated
          ? `Disparo simulado com sucesso para ${recipient}! (Modo Sandbox)`
          : `E-mail de teste enviado com sucesso para ${recipient} via Resend!`,
        id: result.id,
        simulated: result.simulated,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Falha no envio do e-mail de teste.",
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Erro ao processar teste de e-mail.";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: errorMsg.includes("administradores") || errorMsg.includes("Sessão") ? 403 : 500 }
    );
  }
}
