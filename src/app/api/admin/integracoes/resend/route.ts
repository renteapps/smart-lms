import { NextRequest, NextResponse } from "next/server";
import { getResendConfig, saveResendConfig, getEmailLogs, clearEmailLogs } from "@/lib/resendService";
import { getCustomTemplates, saveCustomTemplate, resetCustomTemplate } from "@/lib/emailTemplates";
import { requireAdmin } from "@/lib/supabase/auth";

/*
 * `/api/` é prefixo público no middleware, então cada rota se defende sozinha.
 * Esta lê e grava a configuração do Resend e o histórico de e-mails enviados —
 * nada disso pode ficar aberto.
 */
async function guardAdmin(): Promise<NextResponse | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return NextResponse.json(
      { success: false, error: "Acesso restrito a administradores." },
      { status: 403 }
    );
  }
}

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const config = getResendConfig();
    const logs = getEmailLogs();
    const templates = getCustomTemplates();

    // Mask the API key if it exists for secure presentation
    const maskedKey = config.apiKey
      ? config.apiKey.length > 8
        ? `${config.apiKey.substring(0, 5)}...${config.apiKey.substring(config.apiKey.length - 4)}`
        : "••••••••"
      : "";

    // `apiKey` sai do objeto: espalhar `config` devolvia a chave em claro ao
    // lado da versão mascarada, o que anulava o mascaramento. A tela só precisa
    // saber se existe uma chave configurada.
    const safeConfig: Record<string, unknown> = { ...config };
    delete safeConfig.apiKey;

    return NextResponse.json({
      success: true,
      config: {
        ...safeConfig,
        hasApiKey: Boolean(config.apiKey),
        maskedApiKey: maskedKey,
      },
      logs,
      templates,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Erro ao carregar configurações do Resend";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();

    if (body.action === "clear_logs") {
      clearEmailLogs();
      return NextResponse.json({ success: true, message: "Logs de e-mail limpos com sucesso." });
    }

    if (body.action === "save_template" && body.template) {
      const saved = saveCustomTemplate(body.template);
      return NextResponse.json({
        success: true,
        message: `Modelo "${saved.name}" salvo com sucesso!`,
        template: saved,
      });
    }

    if (body.action === "reset_template" && body.templateType) {
      const reset = resetCustomTemplate(body.templateType);
      return NextResponse.json({
        success: true,
        message: `Modelo "${reset.name}" restaurado para o padrão original!`,
        template: reset,
      });
    }

    const { config } = body;
    if (!config) {
      return NextResponse.json(
        { success: false, error: "Dados de configuração não informados." },
        { status: 400 }
      );
    }

    const updated = saveResendConfig(config);

    return NextResponse.json({
      success: true,
      message: "Configurações do Resend salvas com sucesso!",
      config: updated,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Erro ao salvar configurações do Resend";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
