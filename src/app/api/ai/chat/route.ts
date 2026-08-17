import { NextRequest, NextResponse } from "next/server";
import { sendOpenRouterChatCompletion, getOpenRouterConfig } from "@/lib/openrouterService";
import { OpenRouterChatMessage } from "@/types/openrouter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agentId,
      agentName,
      messages,
      systemPrompt,
      context,
      model,
      temperature,
      maxTokens,
    } = body;

    const config = getOpenRouterConfig();

    // Monta mensagens completas incluindo contexto e instruções do sistema
    const formattedMessages: OpenRouterChatMessage[] = [];

    const systemParts: string[] = [];
    if (systemPrompt?.trim()) {
      systemParts.push(systemPrompt.trim());
    }
    if (context?.trim()) {
      systemParts.push(`\n\n--- Contexto e Material de Apoio ---\n${context.trim()}`);
    }

    if (systemParts.length > 0) {
      formattedMessages.push({
        role: "system",
        content: systemParts.join(""),
      });
    }

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (msg.role && msg.content) {
          formattedMessages.push({
            role: msg.role === "agent" || msg.role === "assistant" ? "assistant" : "user",
            content: msg.content,
          });
        }
      }
    }

    // Se nenhuma mensagem foi passada
    if (formattedMessages.length === 0 || !formattedMessages.some((m) => m.role === "user")) {
      return NextResponse.json(
        { success: false, error: "Nenhuma mensagem do usuário fornecida." },
        { status: 400 }
      );
    }

    const selectedModel = model || config.defaultModel || "google/gemini-2.0-flash-001";

    const result = await sendOpenRouterChatCompletion({
      model: selectedModel,
      messages: formattedMessages,
      temperature: typeof temperature === "number" ? temperature : config.temperature ?? 0.7,
      maxTokens: typeof maxTokens === "number" ? maxTokens : config.maxTokens ?? 1500,
      agentId,
      agentName,
    });

    if (result.success && result.text) {
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
          error: result.error || "Erro ao obter resposta da inteligência artificial.",
          latencyMs: result.latencyMs,
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Erro interno no processamento de IA.";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
