import { NextRequest, NextResponse } from "next/server";
import { getEmailLogs, getEmailTemplates } from "@/lib/data/emails";
import { getDefaultTemplateDefinitions } from "@/lib/emailTemplates";
import { getResendServerConfig } from "@/lib/resendServer";
import { requireAdmin } from "@/lib/supabase/auth";
import type { CustomEmailTemplate, ResendConfig } from "@/types/resend";

/*
 * `/api/` é prefixo público no middleware, então cada rota se defende sozinha.
 * Esta lê e grava a configuração do Resend e o histórico de e-mails enviados —
 * nada disso pode ficar aberto.
 */
export async function GET() {
  try {
    const { adminClient } = await requireAdmin();
    const [config, logs, templateList] = await Promise.all([
      getResendServerConfig(adminClient),
      getEmailLogs(adminClient),
      getEmailTemplates(adminClient),
    ]);
    const templates = Object.fromEntries(templateList.map((template) => [template.type, template]));

    // Mask the API key if it exists for secure presentation
    const maskedKey = config.apiKey
      ? config.apiKey.length > 8
        ? `${config.apiKey.substring(0, 5)}...${config.apiKey.substring(config.apiKey.length - 4)}`
        : "••••••••"
      : "";

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
      { status: errorMsg.includes("administradores") || errorMsg.includes("Sessão") ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { adminClient } = await requireAdmin();
    const body = await req.json();

    if (body.action === "clear_logs") {
      const { error } = await adminClient.from("email_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, message: "Logs de e-mail limpos com sucesso." });
    }

    if (body.action === "save_template" && body.template) {
      const template = body.template as CustomEmailTemplate;
      const { data: savedRow, error } = await adminClient.from("email_templates").upsert(
        {
          type: template.type,
          name: template.name,
          description: template.description ?? "",
          category: template.category,
          subject: template.subject,
          preview_text: template.previewText ?? "",
          html: template.html,
          is_customized: true,
        },
        { onConflict: "type" },
      ).select("updated_at").single();
      if (error) throw new Error(error.message);
      const saved = { ...template, isCustomized: true, updatedAt: savedRow.updated_at };
      return NextResponse.json({
        success: true,
        message: `Modelo "${saved.name}" salvo com sucesso!`,
        template: saved,
      });
    }

    if (body.action === "reset_template" && body.templateType) {
      const original = getDefaultTemplateDefinitions().find((item) => item.type === body.templateType);
      if (!original) {
        return NextResponse.json({ success: false, error: "Tipo de modelo inválido." }, { status: 400 });
      }
      const { error } = await adminClient.from("email_templates").delete().eq("type", body.templateType);
      if (error) throw new Error(error.message);
      const reset = { ...original, isCustomized: false };
      return NextResponse.json({
        success: true,
        message: `Modelo "${reset.name}" restaurado para o padrão original!`,
        template: reset,
      });
    }

    const config = body.config as Partial<ResendConfig> | undefined;
    if (!config) {
      return NextResponse.json(
        { success: false, error: "Dados de configuração não informados." },
        { status: 400 }
      );
    }

    const { data: existing, error: readError } = await adminClient
      .from("integrations")
      .select("enabled, config, secrets, status")
      .eq("slug", "resend")
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    const apiKey = config.apiKey?.trim();
    if (apiKey && !apiKey.startsWith("re_")) {
      return NextResponse.json(
        { success: false, error: "A chave do Resend deve começar com 're_'." },
        { status: 400 },
      );
    }

    const previous = (existing?.config ?? {}) as Partial<ResendConfig>;
    const storedConfig = {
      fromName: config.fromName ?? previous.fromName ?? "Smart LMS",
      fromEmail: config.fromEmail ?? previous.fromEmail ?? "onboarding@resend.dev",
      replyTo: config.replyTo ?? previous.replyTo,
      categories: {
        platform: {
          ...previous.categories?.platform,
          ...config.categories?.platform,
        },
        notifications: {
          ...previous.categories?.notifications,
          ...config.categories?.notifications,
        },
      },
    };
    const secrets = {
      ...((existing?.secrets ?? {}) as Record<string, unknown>),
      ...(apiKey ? { apiKey } : {}),
    };

    const { error: saveError } = await adminClient.from("integrations").upsert(
      {
        slug: "resend",
        name: "Resend",
        enabled: config.enabled ?? existing?.enabled ?? true,
        config: storedConfig,
        secrets,
        status: config.domainStatus ?? existing?.status ?? "not_started",
      },
      { onConflict: "slug" },
    );
    if (saveError) throw new Error(saveError.message);

    const updated = await getResendServerConfig(adminClient);
    const safeUpdated: Record<string, unknown> = { ...updated };
    delete safeUpdated.apiKey;

    return NextResponse.json({
      success: true,
      message: "Configurações do Resend salvas com sucesso!",
      config: { ...safeUpdated, hasApiKey: Boolean(updated.apiKey) },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Erro ao salvar configurações do Resend";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: errorMsg.includes("administradores") || errorMsg.includes("Sessão") ? 403 : 500 }
    );
  }
}
