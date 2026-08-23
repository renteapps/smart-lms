"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { CURATED_OPENROUTER_MODELS } from "@/lib/openrouterService";
import { normalizeKnowledgeSources } from "@/lib/platformAssistantKnowledge";
import {
  ASSISTANT_ICON_KEYS,
  ASSISTANT_KNOWLEDGE_MODES,
  type AssistantIconKey,
  type AssistantKnowledgeMode,
  type PlatformAssistantSettings,
} from "@/types/platformAssistant";

export type AssistantSettingsInput = Omit<PlatformAssistantSettings, "id" | "updatedAt">;

function requiredString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} é obrigatório.`);
  const clean = value.trim();
  if (clean.length > maxLength) throw new Error(`${label} deve ter no máximo ${maxLength.toLocaleString("pt-BR")} caracteres.`);
  return clean;
}

export async function savePlatformAssistantSettings(input: AssistantSettingsInput) {
  try {
    const { adminClient, user } = await requireAdmin();
    if (!input || typeof input !== "object") throw new Error("Configuração inválida.");
    const displayName = requiredString(input.displayName, "Nome", 60);
    const welcomeMessage = requiredString(input.welcomeMessage, "Mensagem inicial", 500);
    const systemPrompt = requiredString(input.systemPrompt, "Prompt administrativo", 20_000);
    const platformKnowledge = typeof input.platformKnowledge === "string" ? input.platformKnowledge.trim() : "";
    if (platformKnowledge.length > 120_000) throw new Error("A base manual deve ter no máximo 120.000 caracteres.");
    if (!/^#[0-9a-f]{6}$/i.test(input.primaryColor)) throw new Error("Informe uma cor hexadecimal válida.");
    if (!ASSISTANT_ICON_KEYS.includes(input.iconKey as AssistantIconKey)) throw new Error("Ícone inválido.");
    if (!CURATED_OPENROUTER_MODELS.some((model) => model.id === input.model)) throw new Error("Modelo não permitido.");
    if (!ASSISTANT_KNOWLEDGE_MODES.includes(input.knowledgeMode)) throw new Error("Modo de conhecimento inválido.");
    const knowledgeSources = normalizeKnowledgeSources(input.knowledgeSources);
    if (input.avatarType !== "icon" && input.avatarType !== "photo") throw new Error("Tipo de avatar inválido.");
    let avatarUrl: string | null = null;
    if (input.avatarUrl?.trim()) {
      const parsed = new URL(input.avatarUrl.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("URL da foto inválida.");
      avatarUrl = parsed.toString();
    }

    const { error } = await adminClient.from("platform_assistant_settings").upsert({
      id: 1,
      enabled: Boolean(input.enabled),
      display_name: displayName,
      avatar_type: input.avatarType,
      icon_key: input.iconKey,
      avatar_url: avatarUrl,
      primary_color: input.primaryColor.toUpperCase(),
      welcome_message: welcomeMessage,
      system_prompt: systemPrompt,
      model: input.model,
      platform_knowledge: platformKnowledge,
      knowledge_mode: input.knowledgeMode,
      knowledge_sources: knowledgeSources,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/chat");
    return { success: true as const, message: "Configurações do assistente salvas." };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "Não foi possível salvar." };
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Exceção de escopo para um curso.
 *
 * `default` apaga a linha em vez de gravar o modo global: assim o curso volta
 * a acompanhar o admin quando ele mudar o modo geral, em vez de ficar preso ao
 * valor que era global no dia em que a exceção foi criada.
 */
export async function saveAssistantCourseRule(courseId: string, mode: AssistantKnowledgeMode | "default") {
  try {
    const { adminClient, user } = await requireAdmin();
    if (!UUID_RE.test(courseId)) throw new Error("Curso inválido.");

    if (mode === "default") {
      const { error } = await adminClient.from("platform_assistant_course_rules").delete().eq("course_id", courseId);
      if (error) throw new Error(error.message);
      revalidatePath("/admin/chat");
      return { success: true as const, message: "O curso voltou a seguir o modo global." };
    }

    if (!ASSISTANT_KNOWLEDGE_MODES.includes(mode)) throw new Error("Modo de conhecimento inválido.");
    const { error } = await adminClient.from("platform_assistant_course_rules").upsert({
      course_id: courseId,
      knowledge_mode: mode,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/chat");
    return { success: true as const, message: "Exceção do curso salva." };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "Não foi possível salvar." };
  }
}

export async function deletePlatformAssistantConversation(conversationId: string) {
  try {
    const { adminClient } = await requireAdmin();
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(conversationId)) throw new Error("Conversa inválida.");
    const { error } = await adminClient
      .from("platform_assistant_conversations")
      .delete()
      .eq("id", conversationId);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/chat");
    return { success: true as const, message: "Conversa excluída permanentemente." };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : "Não foi possível excluir." };
  }
}
