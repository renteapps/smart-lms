import { NextRequest, NextResponse } from "next/server";
import { parseAgentChatRequest } from "@/lib/agentChatRequest";
import { deriveConversationTitle, getAgentById } from "@/lib/data/agents";
import {
  getOpenRouterResponseText,
  getOpenRouterServerConfig,
  getOpenRouterUnavailableReason,
  sendOpenRouterChatCompletion,
} from "@/lib/openrouterService";
import { requireUser } from "@/lib/supabase/auth";
import type { OpenRouterChatMessage, OpenRouterChatResponse } from "@/types/openrouter";
import {
  AiBillingError,
  cancelAiUsage,
  reserveAiUsage,
  settleAiUsage,
  type AiUsageReservation,
} from "@/lib/aiBilling";

const AI_UNAVAILABLE_MESSAGE =
  "A IA deste agente está temporariamente indisponível. Avise um administrador para revisar a integração com o OpenRouter.";

export async function POST(req: NextRequest) {
  let reservation: AiUsageReservation | null = null;
  let providerResponse: OpenRouterChatResponse | null = null;
  try {
    const body = parseAgentChatRequest(await req.json());
    const { agentId, message } = body;

    const { supabase, user } = await requireUser();
    const agent = await getAgentById(supabase, agentId);
    if (!agent || agent.status === "Em manutenção") {
      return NextResponse.json({ success: false, error: "Agente indisponível." }, { status: 404 });
    }

    let conversationId = body.conversationId;
    if (conversationId) {
      const { data: owned } = await supabase
        .from("agent_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("agent_id", agentId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!owned) {
        return NextResponse.json({ success: false, error: "Conversa não encontrada." }, { status: 404 });
      }
    }

    const config = await getOpenRouterServerConfig();
    const unavailableReason = getOpenRouterUnavailableReason(config);
    if (unavailableReason) {
      console.error("[agent-chat:openrouter-unavailable]", { agentId, reason: unavailableReason });
      return NextResponse.json(
        { success: false, error: AI_UNAVAILABLE_MESSAGE },
        { status: 503 },
      );
    }

    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("agent_conversations")
        .insert({
          agent_id: agentId,
          user_id: user.id,
          title: deriveConversationTitle(message),
          course_title: agent.courseTitle || null,
          status: "em_andamento",
        })
        .select("id")
        .single();
      if (error || !created) throw new Error(error?.message || "Falha ao abrir a conversa.");
      conversationId = created.id;
    }

    const { data: history, error: historyError } = await supabase
      .from("agent_messages")
      .select("author, text")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(40);
    if (historyError) throw new Error(historyError.message);

    const formattedMessages: OpenRouterChatMessage[] = [];
    const systemParts = [agent.systemPrompt?.trim(), agent.context?.trim()]
      .filter(Boolean) as string[];
    if (systemParts.length) {
      formattedMessages.push({
        role: "system",
        content: systemParts.length > 1
          ? `${systemParts[0]}\n\n--- Contexto e Material de Apoio ---\n${systemParts.slice(1).join("\n\n")}`
          : systemParts[0],
      });
    }
    formattedMessages.push(...(history ?? []).map((item) => ({
      role: item.author === "agent" ? "assistant" as const : "user" as const,
      content: item.text,
    })));
    formattedMessages.push({ role: "user", content: message });

    const selectedModel = agent.aiModel || config.defaultModel || "google/gemini-2.0-flash-001";
    reservation = await reserveAiUsage({
      userId: user.id,
      feature: "agent_chat",
      model: selectedModel,
      messages: formattedMessages,
      maxOutputTokens: config.maxTokens ?? 1500,
    });

    const { data: userMessage, error: userMessageError } = await supabase
      .from("agent_messages")
      .insert({ conversation_id: conversationId, author: "student", text: message })
      .select("id, author, text")
      .single();
    if (userMessageError || !userMessage) throw new Error(userMessageError?.message || "Falha ao salvar a mensagem.");

    const aiResult = await sendOpenRouterChatCompletion(
      {
        model: selectedModel,
        messages: formattedMessages,
        temperature: config.temperature ?? 0.7,
        maxTokens: reservation.maxOutputTokens,
        agentId: agent.id,
        agentName: agent.name,
      },
      config,
    );
    providerResponse = aiResult;

    const reply = getOpenRouterResponseText(aiResult);
    if (!reply) {
      console.error("[agent-chat:openrouter-response]", {
        agentId,
        error: aiResult.error || (aiResult.simulated ? "simulated_response" : "empty_response"),
        latencyMs: aiResult.latencyMs,
      });
      await supabase
        .from("agent_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
      await cancelAiUsage(reservation, aiResult.error ? "provider_error" : "empty_response", aiResult);
      reservation = null;
      return NextResponse.json({
        success: false,
        error: "O agente não conseguiu gerar uma resposta agora. Tente novamente em instantes.",
        conversationId,
        userMessage,
      }, { status: 502 });
    }

    const [{ data: assistantMessage, error: assistantError }] = await Promise.all([
      supabase
        .from("agent_messages")
        .insert({ conversation_id: conversationId, author: "agent", text: reply })
        .select("id, author, text")
        .single(),
      supabase
        .from("agent_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId),
    ]);
    if (assistantError || !assistantMessage) throw new Error(assistantError?.message || "Falha ao salvar a resposta.");

    const settlement = await settleAiUsage(reservation, aiResult, {
      conversationId,
      agentId: agent.id,
      assistantMessageId: assistantMessage.id,
    });
    reservation = null;

    return NextResponse.json({
      success: true,
      conversationId,
      userMessage,
      assistantMessage,
      text: reply,
      source: "ai",
      creditsRemaining: settlement.creditsRemaining,
      creditsCharged: settlement.creditsCharged,
      model: aiResult.model,
      usage: aiResult.usage,
      latencyMs: aiResult.latencyMs,
    });
  } catch (error: unknown) {
    await cancelAiUsage(reservation, error instanceof AiBillingError ? error.code : "application_error", providerResponse);
    if (error instanceof AiBillingError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro interno no processamento de IA.";
    const status = message.includes("Sessão")
      ? 401
      : message.includes("obrigatórios") || message.includes("4.000")
        ? 400
        : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
