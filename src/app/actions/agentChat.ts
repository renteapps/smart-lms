"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import { getAgentReply } from "@/lib/agentChat";
import {
  deriveConversationTitle,
  getAgentById,
  getMyConversation,
  getMyConversationSummaries,
  getMyConversations,
} from "@/lib/data/agents";
import type { AgentConversation, AgentConversationPage } from "@/types/agente";
import type { ActionResult } from "./progress";

/**
 * Uma rodada de conversa com o agente.
 *
 * A resposta é calculada no servidor porque é lá que o roteiro do agente vive —
 * o cliente não precisa (nem deve) baixar `replies` e `fallbacks` inteiros para
 * responder a si mesmo. O delay de digitação continua sendo cosmético, no
 * cliente: é animação, não regra de negócio.
 */
export async function sendAgentMessage(
  agentId: string,
  conversationId: string | null,
  text: string,
): Promise<{ success: boolean; conversationId?: string; reply?: string; message?: string }> {
  const content = text.trim();
  if (!content) return { success: false, message: "Escreva uma mensagem." };

  try {
    const { supabase, user } = await requireUser();

    const agent = await getAgentById(supabase, agentId);
    if (!agent) return { success: false, message: "Agente não encontrado." };

    let targetId = conversationId;

    if (!targetId) {
      const { data, error } = await supabase
        .from("agent_conversations")
        .insert({
          agent_id: agentId,
          user_id: user.id,
          title: deriveConversationTitle(content),
          course_title: agent.courseTitle || null,
          status: "em_andamento",
        })
        .select("id")
        .single();

      if (error || !data) return { success: false, message: error?.message ?? "Falha ao abrir a conversa." };
      targetId = data.id;
    }

    // Quantas respostas o agente já deu nesta thread: é o que faz os fallbacks
    // alternarem em vez de repetir a mesma frase.
    const { count } = await supabase
      .from("agent_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", targetId)
      .eq("author", "agent");

    const reply = getAgentReply(agent, content, count ?? 0);

    const { error: messagesError } = await supabase.from("agent_messages").insert([
      { conversation_id: targetId, author: "student", text: content },
      { conversation_id: targetId, author: "agent", text: reply },
    ]);

    if (messagesError) return { success: false, message: messagesError.message };

    await supabase
      .from("agent_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", targetId);

    revalidatePath("/agentes");
    return { success: true, conversationId: targetId ?? undefined, reply };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Abre a thread e grava a primeira mensagem do aluno.
 *
 * Separado de `sendAgentMessage` porque o chat com IA precisa persistir a
 * pergunta **antes** de esperar a resposta do modelo: se a geração falhar, o
 * que a pessoa escreveu não pode se perder.
 */
export async function startConversation(
  agentId: string,
  firstMessage: string,
): Promise<{ success: boolean; conversationId?: string; message?: string }> {
  try {
    const { supabase, user } = await requireUser();

    const agent = await getAgentById(supabase, agentId);
    if (!agent) return { success: false, message: "Agente não encontrado." };

    const { data, error } = await supabase
      .from("agent_conversations")
      .insert({
        agent_id: agentId,
        user_id: user.id,
        title: deriveConversationTitle(firstMessage),
        course_title: agent.courseTitle || null,
        status: "em_andamento",
      })
      .select("id")
      .single();

    if (error || !data) return { success: false, message: error?.message ?? "Falha ao abrir a conversa." };

    return { success: true, conversationId: data.id };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Acrescenta uma mensagem a uma thread existente. */
export async function appendAgentMessage(
  conversationId: string,
  author: "student" | "agent",
  text: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { data: owned } = await supabase
      .from("agent_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!owned) return { success: false, message: "Conversa não encontrada." };

    const { error } = await supabase
      .from("agent_messages")
      .insert({ conversation_id: conversationId, author, text });

    if (error) return { success: false, message: error.message };

    await supabase
      .from("agent_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Avalia uma resposta do agente. RLS restringe o update às conversas do
 * próprio aluno — a checagem de posse não precisa ser repetida aqui.
 */
export async function setMessageFeedback(
  messageId: string,
  feedback: "up" | "down" | null,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();

    const { data, error } = await supabase
      .from("agent_messages")
      .update({ feedback })
      .eq("id", messageId)
      .eq("author", "agent")
      .select("id")
      .maybeSingle();

    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, message: "Mensagem não encontrada." };

    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deleteConversation(conversationId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("agent_conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (error) return { success: false, message: error.message };

    revalidatePath("/agentes");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function rateConversation(conversationId: string, rating: number): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("agent_conversations")
      .update({ rating: Math.min(5, Math.max(1, rating)) })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    return error ? { success: false, message: error.message } : { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Recarrega o histórico do aluno — usado depois de enviar ou apagar. */
export async function listMyConversations(): Promise<AgentConversation[]> {
  try {
    const { supabase, user } = await requireUser();
    return await getMyConversations(supabase, user.id);
  } catch {
    return [];
  }
}

export async function listMyConversationSummaries(
  cursor?: string | null,
): Promise<AgentConversationPage> {
  try {
    const { supabase, user } = await requireUser();
    return await getMyConversationSummaries(supabase, user.id, cursor, 30);
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function loadMyConversation(conversationId: string): Promise<AgentConversation | null> {
  try {
    const { supabase, user } = await requireUser();
    return await getMyConversation(supabase, user.id, conversationId);
  } catch {
    return null;
  }
}
