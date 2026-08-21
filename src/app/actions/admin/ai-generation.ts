"use server";

import { requireAdmin } from "@/lib/supabase/auth";
import {
  getOpenRouterServerConfig,
  sendOpenRouterChatCompletion,
} from "@/lib/openrouterService";

export async function generateLessonMetadataFromTranscription(
  transcription: string,
  settings: {
    tone: string;
    length: string;
    extraInstructions: string;
  }
) {
  await requireAdmin();

  if (!transcription || transcription.trim().length === 0) {
    return { success: false, error: "A transcrição está vazia." };
  }

  const openRouterConfig = await getOpenRouterServerConfig();
  if (!openRouterConfig.enabled || !openRouterConfig.apiKey?.trim()) {
    return {
      success: false,
      error:
        "A integração com OpenRouter não está configurada ou está desativada. Acesse /admin/integracoes/openrouter para salvar uma chave de API válida.",
    };
  }

  const prompt = `Você é um assistente educacional de primeira linha.
Sua tarefa é analisar a transcrição de um vídeo e gerar metadados pedagógicos mais um material de apoio textual bem formatado.

Configurações:
- Tom do texto: ${settings.tone || "Didático, claro e engajador"}
- Extensão do conteúdo: ${settings.length || "Resumo detalhado (médio)"}
- Instruções extras: ${settings.extraInstructions || "Nenhuma"}

Transcrição da Aula:
"""
${transcription.slice(0, 60000)}
"""

Retorne EXCLUSIVAMENTE um objeto JSON válido. Nenhuma palavra a mais, nada de introdução ou conclusão. Apenas o objeto JSON:
{
  "contentMarkdown": "Texto longo em Markdown. Use headers ##, listas -, negritos **. Baseie-se no vídeo para criar o apoio de leitura estruturado.",
  "shortDescription": "Resumo muito breve do assunto, máximo 200 caracteres.",
  "level": "iniciante",
  "audience": "Para quem é esta aula (ex: 'Quem já conhece HTML básico')",
  "objective": "O que o aluno saberá ao final (ex: 'Criar um componente reativo')",
  "topics": ["palavra-chave", "outra-palavra"],
  "solves": ["Problema 1 que resolve", "Problema 2"]
}

Nota sobre o campo "level": deve ser exatamente uma destas 3 opções: "iniciante", "intermediario" ou "avancado".`;

  try {
    const response = await sendOpenRouterChatCompletion(
      {
        model: openRouterConfig.defaultModel || "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        maxTokens: 3000,
      },
      openRouterConfig
    );

    if (!response.success || response.simulated || !response.text) {
      return {
        success: false,
        error:
          response.error ||
          (response.simulated
            ? "A chave do OpenRouter não está configurada. Configure em /admin/integracoes/openrouter."
            : "Ocorreu um erro ao comunicar com a IA."),
      };
    }

    const rawText = response.text.trim();
    // Extrai o conteúdo entre delimitadores de código ou chaves JSON
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, rawText];
    let candidate = (jsonMatch[1] || rawText).trim();

    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      candidate = candidate.slice(firstBrace, lastBrace + 1);
    }

    const data = JSON.parse(candidate);
    return { success: true, data };
  } catch (error: any) {
    console.error("Erro na geração de IA:", error);
    return {
      success: false,
      error: error.message || "Erro ao processar a resposta da IA.",
    };
  }
}
