"use server";

import { requireAdmin } from "@/lib/supabase/auth";
import { sendOpenRouterChatCompletion } from "@/lib/openrouterService";

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

Retorne EXCLUSIVAMENTE um objeto JSON válido. Nenhuma palavra a mais, nada de crases markdown em volta. Apenas o objeto JSON puro:
{
  "contentMarkdown": "Texto longo em Markdown. Use headers ##, listas -, negritos **. Baseie-se no vídeo para criar o apoio de leitura estruturado.",
  "shortDescription": "Resumo muito breve do assunto, máximo 200 caracteres.",
  "level": "Escolha entre 'iniciante', 'intermediario' ou 'avancado'.",
  "audience": "Para quem é esta aula (ex: 'Quem já conhece HTML básico')",
  "objective": "O que o aluno saberá ao final (ex: 'Criar um componente reativo')",
  "topics": ["palavra-chave", "outra-palavra"],
  "solves": ["Problema 1 que resolve", "Problema 2"]
}`;

  try {
    const response = await sendOpenRouterChatCompletion({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      maxTokens: 3000,
    });

    if (!response.success || !response.text) {
      return { success: false, error: response.error || "Ocorreu um erro na IA." };
    }

    let jsonText = response.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const data = JSON.parse(jsonText);
    return { success: true, data };
  } catch (error: any) {
    console.error("Erro na geração de IA:", error);
    return { success: false, error: error.message || "Erro ao processar a resposta da IA." };
  }
}
