"use server";

import { requireAdmin } from "@/lib/supabase/auth";
import {
  CURATED_OPENROUTER_MODELS,
  getOpenRouterResponseText,
  getOpenRouterServerConfig,
  getOpenRouterUnavailableReason,
  sendOpenRouterChatCompletion,
  type OpenRouterUnavailableReason,
} from "@/lib/openrouterService";
import { getLessonsAiSource, isUuid } from "@/lib/data/courses";
import {
  MAX_AI_EXTRA_PROMPT,
  MAX_AI_LESSONS,
  MAX_AI_QUESTIONS,
  buildQuizQuestionsPrompt,
  isLessonEligibleForAi,
  isQuestionType,
  lessonSourceToText,
  normalizeGeneratedQuestions,
} from "@/lib/quiz/aiQuestions";
import type { QuestionType, QuizQuestion } from "@/types/quiz";

const OPENROUTER_SETUP_URL = "/admin/integracoes/openrouter";

const UNAVAILABLE_MESSAGES: Record<OpenRouterUnavailableReason, string> = {
  disabled: `A integração com OpenRouter está desativada. Reative em ${OPENROUTER_SETUP_URL}.`,
  missing_api_key: `A integração com OpenRouter não está configurada. Salve uma chave de API válida em ${OPENROUTER_SETUP_URL}.`,
  invalid_key: `A chave do OpenRouter foi recusada pelo provedor. Atualize em ${OPENROUTER_SETUP_URL}.`,
  rate_limited: "O OpenRouter está limitando as requisições no momento. Tente de novo em alguns minutos.",
};

/**
 * Isola o JSON da resposta do modelo: tira cercas de código e corta tudo fora
 * do primeiro delimitador até o último. Modelos costumam embrulhar o objeto em
 * texto explicativo mesmo quando o prompt proíbe.
 */
function extractJsonPayload(rawText: string): string {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  let candidate = (fenced?.[1] ?? rawText).trim();

  const openers: Array<[string, string]> = [
    ["{", "}"],
    ["[", "]"],
  ];
  const starts = openers
    .map(([open, close]) => ({ start: candidate.indexOf(open), end: candidate.lastIndexOf(close) }))
    .filter((range) => range.start !== -1 && range.end > range.start)
    .sort((a, b) => a.start - b.start);

  if (starts.length > 0) {
    candidate = candidate.slice(starts[0].start, starts[0].end + 1);
  }

  return candidate;
}

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

    const data = JSON.parse(extractJsonPayload(response.text));
    return { success: true, data };
  } catch (error: unknown) {
    console.error("Erro na geração de IA:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao processar a resposta da IA.",
    };
  }
}

export async function generatePilulaWithAI(
  topicOrIdea: string,
  settings?: {
    category?: string;
    courseTitle?: string;
    format?: string;
  }
) {
  await requireAdmin();

  if (!topicOrIdea || topicOrIdea.trim().length === 0) {
    return { success: false, error: "Informe o tema ou ideia para a pílula." };
  }

  const openRouterConfig = await getOpenRouterServerConfig();
  if (!openRouterConfig.enabled || !openRouterConfig.apiKey?.trim()) {
    return {
      success: false,
      error:
        "A integração com OpenRouter não está configurada ou está desativada. Acesse /admin/integracoes/openrouter para salvar uma chave de API válida.",
    };
  }

  const prompt = `Você é um especialista em microlearning e design pedagógico de alta performance.
Sua tarefa é criar uma "Pílula de Conhecimento" — um microconteúdo altamente prático, dinâmico e aplicável no dia a dia do aluno.

Tema / Ideia fornecida:
"${topicOrIdea.trim()}"

${settings?.category && settings.category !== "all" && settings.category !== "Outra" ? `Categoria sugerida: ${settings.category}` : ""}
${settings?.courseTitle ? `Curso relacionado: ${settings.courseTitle}` : ""}
${settings?.format && settings.format !== "all" ? `Formato sugerido: ${settings.format}` : ""}

Estrutura da Pílula:
- title: Título curto, atraente e focado em ação (máximo 60 caracteres). Ex: "Escuta Ativa na Prática".
- category: Uma destas categorias: "Liderança", "Produtividade", "Comunicação", "Bem-estar", "Vendas", "Inovação", "Geral".
- format: Uma destas opções: "desafio", "texto", "video", "audio".
- summary: Conceito-chave ou insight explicativo direto, didático e inspirador em 2 a 4 frases (máximo 300 caracteres).
- challenge: Desafio prático acionável e claro que o aluno possa fazer hoje mesmo no trabalho ou rotina diária (máximo 250 caracteres).
- estimatedMinutes: Número inteiro de 1 a 10 (ex: 2, 3, 5).

Retorne EXCLUSIVAMENTE um objeto JSON válido. Nenhuma palavra a mais, nada de introdução ou conclusão.
{
  "title": "...",
  "category": "...",
  "format": "desafio",
  "summary": "...",
  "challenge": "...",
  "estimatedMinutes": 3
}`;

  try {
    const response = await sendOpenRouterChatCompletion(
      {
        model: openRouterConfig.defaultModel || "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        maxTokens: 1000,
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

    const data = JSON.parse(extractJsonPayload(response.text));
    return { success: true, data };
  } catch (error: unknown) {
    console.error("Erro na geração de Pílula por IA:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao processar a resposta da IA.",
    };
  }
}

export interface GenerateQuizQuestionsInput {
  courseId: string;
  lessonIds: string[];
  model: string;
  questionType: QuestionType;
  count: number;
  extraPrompt?: string;
  courseTitle?: string;
  quizTitle?: string;
}

export type GenerateQuizQuestionsResult =
  | { success: true; data: QuizQuestion[]; discarded: number }
  | { success: false; error: string };

/**
 * Gera perguntas de quiz a partir do material das aulas selecionadas.
 *
 * O cliente manda só ids: o texto das aulas é relido aqui, escopado ao curso,
 * porque uma Server Action é um endpoint POST público para quem tem sessão de
 * admin — nada que venha do formulário serve como fonte de conteúdo.
 */
export async function generateQuizQuestionsWithAI(
  input: GenerateQuizQuestionsInput,
): Promise<GenerateQuizQuestionsResult> {
  const { supabase } = await requireAdmin();

  if (!input || typeof input !== "object") {
    return { success: false, error: "Requisição inválida." };
  }

  const { courseId, model, questionType } = input;

  if (typeof courseId !== "string" || !isUuid(courseId)) {
    return { success: false, error: "Curso inválido." };
  }

  const lessonIds = Array.isArray(input.lessonIds) ? [...new Set(input.lessonIds.filter(isUuid))] : [];
  if (lessonIds.length === 0) {
    return { success: false, error: "Selecione pelo menos uma aula." };
  }
  if (lessonIds.length > MAX_AI_LESSONS) {
    return { success: false, error: `Selecione no máximo ${MAX_AI_LESSONS} aulas por geração.` };
  }

  if (!isQuestionType(questionType)) {
    return { success: false, error: "Tipo de pergunta inválido." };
  }

  const count = Math.trunc(Number(input.count));
  if (!Number.isFinite(count) || count < 1 || count > MAX_AI_QUESTIONS) {
    return { success: false, error: `Escolha entre 1 e ${MAX_AI_QUESTIONS} perguntas.` };
  }

  // Mesma allowlist do editor de agentes: modelo fora da curadoria não é
  // cobrado nem precificado, e viraria erro opaco do provedor.
  if (typeof model !== "string" || !CURATED_OPENROUTER_MODELS.some((item) => item.id === model)) {
    return { success: false, error: "Modelo de IA não permitido." };
  }

  const extraPrompt = typeof input.extraPrompt === "string" ? input.extraPrompt.trim() : "";
  if (extraPrompt.length > MAX_AI_EXTRA_PROMPT) {
    return { success: false, error: `O prompt específico deve ter no máximo ${MAX_AI_EXTRA_PROMPT} caracteres.` };
  }

  const config = await getOpenRouterServerConfig();
  const unavailable = getOpenRouterUnavailableReason(config);
  if (unavailable) {
    return { success: false, error: UNAVAILABLE_MESSAGES[unavailable] };
  }

  const lessons = (await getLessonsAiSource(supabase, courseId, lessonIds)).filter(isLessonEligibleForAi);

  if (lessons.length === 0) {
    return {
      success: false,
      error: "Nenhuma das aulas selecionadas tem transcrição, descrição ou conteúdo para usar como material.",
    };
  }

  const prompt = buildQuizQuestionsPrompt({
    courseTitle: typeof input.courseTitle === "string" ? input.courseTitle : undefined,
    quizTitle: typeof input.quizTitle === "string" ? input.quizTitle : undefined,
    lessons: lessons.map((lesson) => ({ title: lesson.title, text: lessonSourceToText(lesson) })),
    type: questionType,
    count,
    extraPrompt,
  });

  try {
    const response = await sendOpenRouterChatCompletion(
      {
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        maxTokens: Math.min(8000, 800 * count + 500),
      },
      config,
    );

    // Devolve null também para o "[Modo Simulado OpenRouter]", que chega com
    // success: true e viraria pergunta de mentira se fosse aceito.
    const text = getOpenRouterResponseText(response);
    if (!text) {
      return { success: false, error: response.error || "A IA não respondeu. Tente novamente." };
    }

    const parsed = JSON.parse(extractJsonPayload(text));
    const questions = normalizeGeneratedQuestions(parsed, questionType, count);

    if (questions.length === 0) {
      return {
        success: false,
        error: "A IA não devolveu nenhuma pergunta utilizável. Tente outro modelo ou ajuste o prompt específico.",
      };
    }

    return { success: true, data: questions, discarded: Math.max(0, count - questions.length) };
  } catch (error: unknown) {
    console.error("Erro na geração de perguntas por IA:", error);
    return {
      success: false,
      error: "Não foi possível interpretar a resposta da IA. Tente novamente ou troque de modelo.",
    };
  }
}
