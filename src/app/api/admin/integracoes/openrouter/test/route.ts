import { NextRequest, NextResponse } from "next/server";
import {
  fetchOpenRouterModels,
  getOpenRouterServerConfig,
  sendOpenRouterChatCompletion,
  validateOpenRouterKey,
} from "@/lib/openrouterService";
import { requireAdmin } from "@/lib/supabase/auth";
import { AiBillingError, cancelAiUsage, reserveAiUsage, settleAiUsage, type AiUsageReservation } from "@/lib/aiBilling";
import type { OpenRouterChatMessage, OpenRouterChatResponse } from "@/types/openrouter";

export async function POST(req: NextRequest) {
  let reservation: AiUsageReservation | null = null;
  let providerResponse: OpenRouterChatResponse | null = null;
  try {
    const { user } = await requireAdmin();
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
      const chatMessages: OpenRouterChatMessage[] = Array.isArray(messages) && messages.length > 0
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

      const selectedModel = model || "google/gemini-2.0-flash-001";
      reservation = await reserveAiUsage({
        userId: user.id,
        feature: "admin_sandbox",
        model: selectedModel,
        messages: chatMessages,
        maxOutputTokens: typeof maxTokens === "number" ? maxTokens : 1000,
      });

      const result = await sendOpenRouterChatCompletion(
        {
          model: selectedModel,
          messages: chatMessages,
          temperature: typeof temperature === "number" ? temperature : 0.7,
          maxTokens: reservation.maxOutputTokens,
        },
        // Sem chave digitada nesta chamada: testa com a chave já salva no
        // servidor, não com o modo simulado — é o que o admin espera ao
        // clicar em "Testar" sem reabrir o campo de credencial.
        apiKey ? { apiKey } : await getOpenRouterServerConfig(),
      );
      providerResponse = result;

      if (result.success && result.text?.trim()) {
        const settlement = await settleAiUsage(reservation, result, { source: "admin_openrouter_sandbox" });
        reservation = null;
        return NextResponse.json({
          success: true,
          text: result.text,
          model: result.model,
          usage: result.usage,
          latencyMs: result.latencyMs,
          simulated: result.simulated,
          creditsCharged: settlement.creditsCharged,
        });
      } else {
        await cancelAiUsage(reservation, result.success ? "empty_response" : "provider_error", result);
        reservation = null;
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
    await cancelAiUsage(reservation, error instanceof AiBillingError ? error.code : "sandbox_error", providerResponse);
    const errorMsg = error instanceof Error ? error.message : "Erro ao processar requisição.";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: error instanceof AiBillingError ? error.status : 500 }
    );
  }
}
