import { NextRequest, NextResponse } from "next/server";
import {
  fetchOpenRouterModels,
  sendOpenRouterChatCompletion,
  validateOpenRouterKey,
} from "@/lib/openrouterService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, apiKey, model, messages, temperature, maxTokens } = body;

    // Ação 1: Validar chave de API
    if (action === "validate_key") {
      if (!apiKey?.trim()) {
        return NextResponse.json(
          { valid: false, message: "Informe a chave de API para validação." },
          { status: 400 }
        );
      }

      const validation = await validateOpenRouterKey(apiKey);
      return NextResponse.json(validation);
    }

    // Ação 2: Listar modelos disponíveis
    if (action === "fetch_models") {
      const models = await fetchOpenRouterModels(apiKey);
      return NextResponse.json({ success: true, models });
    }

    // Ação 3: Testar execução de Chat / Prompt Sandbox
    if (action === "chat_test") {
      const chatMessages = Array.isArray(messages) && messages.length > 0
        ? messages
        : [
            {
              role: "system",
              content: "Você é um assistente de IA didático integrado ao Smart LMS.",
            },
            {
              role: "user",
              content: body.prompt || "Olá! Faça uma breve apresentação de como você pode ajudar os alunos no Smart LMS.",
            },
          ];

      const result = await sendOpenRouterChatCompletion(
        {
          model: model || "google/gemini-2.0-flash-001",
          messages: chatMessages,
          temperature: typeof temperature === "number" ? temperature : 0.7,
          maxTokens: typeof maxTokens === "number" ? maxTokens : 1000,
        },
        apiKey ? { apiKey } : undefined
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          text: result.text,
          model: result.model,
          usage: result.usage,
          latencyMs: result.latencyMs,
          simulated: result.simulated,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error || "Falha ao gerar resposta com o OpenRouter.",
            latencyMs: result.latencyMs,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Ação não especificada ou inválida." },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Erro ao processar requisição.";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
