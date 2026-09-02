"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/actionError";
import type { Row } from "@/lib/data/types";
import { requireAdmin } from "@/lib/supabase/auth";
import {
  normalizeBindings,
  normalizeQuestions,
  validatePersonalizedLessonConfig,
} from "@/lib/personalizedLessonCore";
import { compileGuidedPrompt, normalizeGuidedConfig } from "@/lib/personalizedLessonAuthoring";
import type {
  PersonalizedAuthoringMode,
  PersonalizedGuidedConfig,
  PersonalizedLessonBasicDraft,
  PersonalizedLessonConfig,
  PersonalizedSourceKind,
  PersonalizedSourceRef,
} from "@/types/personalizedLesson";

type Result = { success: true; revision: number } | { success: false; message: string };
type DraftSection = "basic" | "ai" | "personalization" | "knowledge" | "all";
type DraftResult = { success: true; draftVersion: number; promptTemplate: string } | { success: false; message: string; field?: string; conflict?: boolean };

function normalizeStringList(value: unknown, limit = 30) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].slice(0, limit)
    : [];
}

function normalizeBasicDraft(input: PersonalizedLessonBasicDraft): PersonalizedLessonBasicDraft {
  return {
    moduleId: String(input.moduleId ?? "").trim(),
    title: String(input.title ?? "").trim().slice(0, 300),
    durationInMinutes: Math.max(1, Math.min(10_000, Number(input.durationInMinutes) || 10)),
    shortDescription: String(input.shortDescription ?? "").trim().slice(0, 200),
    coverUrl: String(input.coverUrl ?? "").trim().slice(0, 2_000),
    topics: normalizeStringList(input.topics),
    solves: normalizeStringList(input.solves),
    level: ["iniciante", "intermediario", "avancado"].includes(input.level) ? input.level : "iniciante",
    objective: String(input.objective ?? "").trim().slice(0, 2_000),
    audience: String(input.audience ?? "").trim().slice(0, 1_000),
    prerequisites: normalizeStringList(input.prerequisites, 100),
    isEligibleForTrail: input.isEligibleForTrail !== false,
  };
}

function failDatabaseOperation(operation: string, error: unknown): never {
  const message = getActionErrorMessage(error, "Erro inesperado no banco de dados.");
  console.error(`[personalized-lessons] ${operation}`, {
    code: error && typeof error === "object" && "code" in error ? error.code : undefined,
    message: error && typeof error === "object" && "message" in error ? error.message : message,
  });
  throw new Error(`${operation}: ${message}`);
}

async function requireOwnedPersonalizedLesson(adminClient: Awaited<ReturnType<typeof requireAdmin>>["adminClient"], lessonId: string, courseId: string) {
  const { data, error } = await adminClient.from("lessons")
    .select("id, type, modules!inner(course_id)")
    .eq("id", lessonId)
    .maybeSingle();
  const moduleRow = Array.isArray(data?.modules) ? data.modules[0] : data?.modules;
  if (error || !data || data.type !== "personalized_ai" || moduleRow?.course_id !== courseId) {
    throw new Error("A aula personalizada não pertence a este curso.");
  }
}

export async function savePersonalizedLessonDraft(input: {
  lessonId: string;
  courseId: string;
  expectedDraftVersion: number;
  section: DraftSection;
  basic: PersonalizedLessonBasicDraft;
  authoringMode: PersonalizedAuthoringMode;
  guidedConfig: PersonalizedGuidedConfig;
  promptTemplate: string;
  context: string;
  model: string;
  questions: unknown;
  variableBindings: unknown;
  sourceRefs: PersonalizedSourceRef[];
  documentIds: string[];
}): Promise<DraftResult> {
  try {
    const { adminClient, supabase } = await requireAdmin();
    await requireOwnedPersonalizedLesson(adminClient, input.lessonId, input.courseId);
    const basic = normalizeBasicDraft(input.basic);
    const guidedConfig = normalizeGuidedConfig(input.guidedConfig);
    const questions = normalizeQuestions(input.questions);
    const variableBindings = normalizeBindings(input.variableBindings);
    const sourceRefs = (input.sourceRefs ?? []).filter((ref) =>
      ["course", "module", "lesson", "article"].includes(ref.kind) && Boolean(ref.id && ref.title),
    );

    if (input.section === "knowledge" || input.section === "all") {
      for (const ref of sourceRefs) {
        if (ref.kind === "module") {
          const { data: mod } = await adminClient.from("modules").select("course_id").eq("id", ref.id).maybeSingle();
          if (!mod || mod.course_id !== input.courseId) {
            return { success: false, message: `O módulo "${ref.title}" não pertence a este curso.`, field: "knowledge" };
          }
        } else if (ref.kind === "lesson") {
          const { data: les } = await adminClient.from("lessons").select("id, modules!inner(course_id)").eq("id", ref.id).maybeSingle();
          const mod = Array.isArray(les?.modules) ? les.modules[0] : les?.modules;
          if (!les || les.id === input.lessonId || mod?.course_id !== input.courseId) {
            return { success: false, message: `A aula "${ref.title}" não pertence a este curso.`, field: "knowledge" };
          }
        }
      }
    }

    if ((input.section === "basic" || input.section === "all") && !basic.title) {
      return { success: false, message: "Informe o título da aula.", field: "title" };
    }
    if ((input.section === "basic" || input.section === "all") && !basic.objective) {
      return { success: false, message: "Descreva o que o aluno deverá aprender ou conseguir fazer.", field: "objective" };
    }
    const { data: moduleRow } = await adminClient.from("modules").select("id, course_id").eq("id", basic.moduleId).maybeSingle();
    if (!moduleRow || moduleRow.course_id !== input.courseId) {
      return { success: false, message: "Escolha um módulo deste curso.", field: "moduleId" };
    }

    const { data: models, error: modelError } = await adminClient.from("ai_model_pricing")
      .select("model").eq("enabled", true);
    if (modelError) failDatabaseOperation("Não foi possível validar o modelo de IA", modelError);
    const allowedModels = new Set((models ?? []).map((row) => String(row.model)));
    if ((input.section === "ai" || input.section === "all") && !allowedModels.has(input.model)) {
      return { success: false, message: "Escolha um modelo de IA disponível.", field: "model" };
    }
    if ((input.section === "ai" || input.section === "all")
      && input.authoringMode === "guided" && !guidedConfig.coreInstructions.trim()) {
      return { success: false, message: "Explique quais conteúdos e situações a IA deve abordar.", field: "coreInstructions" };
    }

    const compiledPrompt = input.authoringMode === "guided"
      ? compileGuidedPrompt({ basic, guided: guidedConfig, questions, bindings: variableBindings })
      : input.promptTemplate.trim();
    if ((input.section === "ai" || input.section === "all") && !compiledPrompt) {
      return { success: false, message: "Escreva as instruções que a IA deve seguir.", field: "promptTemplate" };
    }
    if ((input.section === "ai" || input.section === "all") && compiledPrompt.length > 20_000) {
      return { success: false, message: "As instruções ultrapassam o limite de 20.000 caracteres.", field: "promptTemplate" };
    }
    const config: Pick<PersonalizedLessonConfig, "promptTemplate" | "context" | "model" | "questions" | "variableBindings"> = {
      promptTemplate: compiledPrompt,
      context: input.context,
      model: input.model,
      questions,
      variableBindings,
    };
    const validationErrors = validatePersonalizedLessonConfig(config, { allowedModels });
    if ((input.section === "personalization" || input.section === "all") && validationErrors.length) {
      return { success: false, message: validationErrors.join(" "), field: "personalization" };
    }

    const { data: activeConfig } = await adminClient.from("personalized_lesson_configs")
      .select("questions").eq("lesson_id", input.lessonId).maybeSingle();
    const activeQuestions = normalizeQuestions(activeConfig?.questions);
    for (const activeQuestion of activeQuestions) {
      const edited = questions.find((question) => question.id === activeQuestion.id);
      if (edited && edited.key !== activeQuestion.key) {
        return { success: false, message: `A chave da pergunta “${activeQuestion.label}” não pode ser alterada depois da publicação.`, field: "personalization" };
      }
    }

    const documentIds = [...new Set(input.documentIds.map(String).filter(Boolean))].slice(0, 10);
    if (documentIds.length) {
      const { data: ownedDocuments, error } = await adminClient.from("personalized_lesson_documents")
        .select("id").eq("lesson_id", input.lessonId).in("id", documentIds);
      if (error) failDatabaseOperation("Não foi possível validar os documentos", error);
      if ((ownedDocuments ?? []).length !== documentIds.length) {
        return { success: false, message: "Um dos documentos selecionados não pertence a esta aula.", field: "documents" };
      }
    }

    const payload = {
      lessonPayload: basic,
      authoringMode: input.authoringMode,
      guidedConfig,
      promptTemplate: compiledPrompt,
      context: input.context.trim(),
      model: input.model || null,
      questions,
      variableBindings,
      sourceRefs,
    };
    const { data: saved, error: saveError } = await supabase.rpc("save_personalized_lesson_draft", {
      p_lesson_id: input.lessonId,
      p_expected_draft_version: input.expectedDraftVersion,
      p_payload: payload,
      p_document_ids: documentIds,
    });
    if (saveError?.code === "40001") return { success: false, message: saveError.message, conflict: true };
    if (saveError) failDatabaseOperation("Não foi possível salvar o rascunho", saveError);
    const nextVersion = Number((saved as { draft_version?: number } | null)?.draft_version) || input.expectedDraftVersion + 1;

    revalidatePath(`/admin/cursos/${input.courseId}/aulas/${input.lessonId}`);
    return { success: true, draftVersion: nextVersion, promptTemplate: compiledPrompt };
  } catch (error) {
    return { success: false, message: getActionErrorMessage(error, "Não foi possível salvar o rascunho.") };
  }
}

export async function publishPersonalizedLessonDraft(input: {
  lessonId: string;
  courseId: string;
  expectedDraftVersion: number;
}): Promise<Result & { draftVersion?: number }> {
  try {
    const { adminClient, supabase } = await requireAdmin();
    await requireOwnedPersonalizedLesson(adminClient, input.lessonId, input.courseId);
    // A RPC é security invoker e valida o admin da sessão; preserve o JWT do
    // usuário mesmo quando o servidor também possui uma service role.
    const { data, error } = await supabase.rpc("publish_personalized_lesson_draft", {
      p_lesson_id: input.lessonId,
      p_expected_draft_version: input.expectedDraftVersion,
    });
    if (error) failDatabaseOperation("Não foi possível publicar a aula personalizada", error);
    const payload = data as { revision?: number; draft_version?: number } | null;
    revalidatePath(`/admin/cursos/${input.courseId}/aulas/${input.lessonId}`);
    revalidatePath("/courses/[slug]/lessons/[lessonSlug]", "page");
    return { success: true, revision: Number(payload?.revision) || 1, draftVersion: Number(payload?.draft_version) || input.expectedDraftVersion };
  } catch (error) {
    return { success: false, message: getActionErrorMessage(error, "Não foi possível publicar a aula personalizada.") };
  }
}

export async function discardPersonalizedLessonDraft(input: { lessonId: string; courseId: string }) {
  try {
    const { adminClient } = await requireAdmin();
    await requireOwnedPersonalizedLesson(adminClient, input.lessonId, input.courseId);
    const { data: documents } = await adminClient.from("personalized_lesson_documents").select("id").eq("lesson_id", input.lessonId);
    const ids = (documents ?? []).map((row) => row.id);
    if (ids.length) await adminClient.from("personalized_lesson_document_refs").delete().eq("scope", "draft").in("document_id", ids);
    const { error } = await adminClient.from("personalized_lesson_drafts").delete().eq("lesson_id", input.lessonId);
    if (error) failDatabaseOperation("Não foi possível descartar o rascunho", error);
    revalidatePath(`/admin/cursos/${input.courseId}/aulas/${input.lessonId}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: getActionErrorMessage(error, "Não foi possível descartar o rascunho.") };
  }
}

export async function searchPersonalizedLessonSources(input: {
  lessonId: string;
  courseId?: string;
  query: string;
  kind: PersonalizedSourceKind | "all";
  page?: number;
}) {
  const { adminClient } = await requireAdmin();
  const query = input.query.trim().slice(0, 100);
  const page = Math.max(0, input.page ?? 0);

  let courseId = input.courseId;
  if (!courseId) {
    const { data: lessonRow } = await adminClient
      .from("lessons")
      .select("id, module_id, modules!inner(course_id)")
      .eq("id", input.lessonId)
      .maybeSingle();
    const moduleRow = Array.isArray(lessonRow?.modules) ? lessonRow.modules[0] : lessonRow?.modules;
    courseId = moduleRow?.course_id;
  }

  const allowedKinds: PersonalizedSourceKind[] = ["module", "lesson", "article"];
  const kinds: PersonalizedSourceKind[] = input.kind === "all"
    ? allowedKinds
    : allowedKinds.includes(input.kind as PersonalizedSourceKind)
      ? [input.kind as PersonalizedSourceKind]
      : [];

  const pageSize = input.kind === "all" ? 10 : 25;
  const from = page * pageSize;
  const results: Array<{ kind: PersonalizedSourceKind; id: string; title: string; subtitle?: string }> = [];
  let hasMore = false;

  for (const kind of kinds) {
    if (kind === "module") {
      if (!courseId) continue;
      let request = adminClient
        .from("modules")
        .select("id, title, order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true })
        .order("title")
        .range(from, from + pageSize);

      if (query) request = request.ilike("title", `%${query.replace(/[%_]/g, "")}%`);
      const { data } = await request;
      const rows = data ?? [];
      if (rows.length > pageSize) hasMore = true;
      results.push(...rows.slice(0, pageSize).map((row: Row) => ({
        kind,
        id: row.id,
        title: row.title,
        subtitle: "Módulo deste curso",
      })));
    } else if (kind === "lesson") {
      if (!courseId) continue;
      let request = adminClient
        .from("lessons")
        .select("id, title, module_id, modules!inner(id, title, course_id)")
        .eq("modules.course_id", courseId)
        .neq("id", input.lessonId)
        .order("title")
        .range(from, from + pageSize);

      if (query) request = request.ilike("title", `%${query.replace(/[%_]/g, "")}%`);
      const { data } = await request;
      const rows = data ?? [];
      if (rows.length > pageSize) hasMore = true;
      results.push(...rows.slice(0, pageSize).map((row: Row) => {
        const mod = Array.isArray(row.modules) ? row.modules[0] : row.modules;
        return {
          kind,
          id: row.id,
          title: row.title,
          subtitle: mod?.title ? `Módulo: ${mod.title}` : "Aula deste curso",
        };
      }));
    } else if (kind === "article") {
      let request = adminClient
        .from("articles")
        .select("id, title")
        .order("title")
        .range(from, from + pageSize);

      if (query) request = request.ilike("title", `%${query.replace(/[%_]/g, "")}%`);
      const { data } = await request;
      const rows = data ?? [];
      if (rows.length > pageSize) hasMore = true;
      results.push(...rows.slice(0, pageSize).map((row: Row) => ({
        kind,
        id: row.id,
        title: row.title,
        subtitle: "Artigo da plataforma",
      })));
    }
  }

  return { success: true, data: results, hasMore };
}

export async function savePersonalizedLessonConfig(input: {
  lessonId: string;
  courseId: string;
  promptTemplate: string;
  context: string;
  model: string;
  questions: unknown;
  variableBindings: unknown;
  sourceRefs: PersonalizedSourceRef[];
  publish: boolean;
}): Promise<Result> {
  try {
    const { adminClient, user } = await requireAdmin();
    const questions = normalizeQuestions(input.questions);
    const variableBindings = normalizeBindings(input.variableBindings);
    const config: Pick<PersonalizedLessonConfig, "promptTemplate" | "context" | "model" | "questions" | "variableBindings"> = {
      promptTemplate: input.promptTemplate,
      context: input.context,
      model: input.model,
      questions,
      variableBindings,
    };
    const { data: models, error: modelError } = await adminClient
      .from("ai_model_pricing")
      .select("model")
      .eq("enabled", true);
    if (modelError) failDatabaseOperation("Não foi possível validar o modelo de IA", modelError);
    const errors = validatePersonalizedLessonConfig(config, {
      allowedModels: new Set((models ?? []).map((row) => String(row.model))),
    });
    if (errors.length) return { success: false, message: errors.join(" ") };

    const { data: lesson, error: lessonError } = await adminClient
      .from("lessons")
      .select("id, type, modules!inner(course_id)")
      .eq("id", input.lessonId)
      .maybeSingle();
    const moduleRow = Array.isArray(lesson?.modules) ? lesson.modules[0] : lesson?.modules;
    if (lessonError || !lesson || lesson.type !== "personalized_ai" || moduleRow?.course_id !== input.courseId) {
      return { success: false, message: "A aula personalizada não pertence a este curso." };
    }

    const definitionsResult = questions.length
      ? await adminClient
        .from("student_variable_definitions")
        .select("variable_key, question_type, options, source_lesson_id")
        .in("variable_key", questions.map((question) => question.key))
      : { data: [], error: null };
    const { data: existingDefinitions, error: definitionsError } = definitionsResult;
    if (definitionsError) failDatabaseOperation("Não foi possível validar as perguntas", definitionsError);
    for (const question of questions) {
      const existing = (existingDefinitions ?? []).find((row) => row.variable_key === question.key);
      if (existing && (existing.question_type !== question.type
        || JSON.stringify(existing.options ?? []) !== JSON.stringify(question.options))) {
        return {
          success: false,
          message: `A chave {{${question.key}}} já existe com outro tipo ou outras opções. Escolha outra chave.`,
        };
      }
    }

    const { data: documents, error: documentsError } = await adminClient
      .from("personalized_lesson_documents")
      .select("status")
      .eq("lesson_id", input.lessonId);
    if (documentsError) failDatabaseOperation("Não foi possível validar os documentos", documentsError);
    if ((documents ?? []).length > 10) return { success: false, message: "A aula pode ter no máximo 10 documentos privados." };
    if (input.publish && (documents ?? []).some((document) => document.status !== "ready")) {
      return { success: false, message: "A publicação aguarda o processamento de todos os documentos." };
    }

    const sourceRefs = (input.sourceRefs ?? []).filter((ref) =>
      ["course", "module", "lesson", "article"].includes(ref.kind) && Boolean(ref.id && ref.title),
    );
    const { data: current, error: currentError } = await adminClient
      .from("personalized_lesson_configs")
      .select("prompt_template, context, model, questions, variable_bindings, source_refs, revision")
      .eq("lesson_id", input.lessonId)
      .maybeSingle();
    if (currentError) failDatabaseOperation("Não foi possível ler a configuração atual", currentError);
    const semantic = {
      prompt_template: input.promptTemplate.trim(),
      context: input.context.trim(),
      model: input.model,
      questions,
      variable_bindings: variableBindings,
      source_refs: sourceRefs,
    };
    const changed = !current || JSON.stringify(semantic) !== JSON.stringify({
      prompt_template: current.prompt_template,
      context: current.context,
      model: current.model,
      questions: current.questions,
      variable_bindings: current.variable_bindings,
      source_refs: current.source_refs,
    });
    const revision = current ? Number(current.revision) + (changed ? 1 : 0) : 1;

    const { data: savedConfig, error: saveError } = await adminClient.from("personalized_lesson_configs").upsert({
      lesson_id: input.lessonId,
      ...semantic,
      revision,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "lesson_id" }).select("revision").single();
    if (saveError) failDatabaseOperation("Não foi possível salvar prompt, modelo e fontes", saveError);

    for (const question of questions) {
      const existing = (existingDefinitions ?? []).find((row) => row.variable_key === question.key);
      if (existing) {
        const { error } = await adminClient.from("student_variable_definitions").update({
          active: true,
          label: question.label,
          updated_at: new Date().toISOString(),
        }).eq("variable_key", question.key);
        if (error) failDatabaseOperation(`Não foi possível atualizar a pergunta {{${question.key}}}`, error);
        continue;
      }
      const { error } = await adminClient.from("student_variable_definitions").insert({
        variable_key: question.key,
        label: question.label,
        question_type: question.type,
        options: question.options,
        source_lesson_id: input.lessonId,
        created_by: user.id,
      });
      if (error) failDatabaseOperation(`Não foi possível criar a pergunta {{${question.key}}}`, error);
    }

    const currentKeys = new Set(questions.map((question) => question.key));
    const { data: ownedDefinitions, error: ownedDefinitionsError } = await adminClient.from("student_variable_definitions")
      .select("variable_key")
      .eq("source_lesson_id", input.lessonId);
    if (ownedDefinitionsError) failDatabaseOperation("Não foi possível conferir as perguntas removidas", ownedDefinitionsError);
    const removedKeys = (ownedDefinitions ?? [])
      .map((row) => String(row.variable_key))
      .filter((key) => !currentKeys.has(key));
    if (removedKeys.length) {
      const { error: deactivateError } = await adminClient.from("student_variable_definitions")
        .update({ active: false, updated_at: new Date().toISOString() })
        .in("variable_key", removedKeys);
      if (deactivateError) failDatabaseOperation("Não foi possível desativar as perguntas removidas", deactivateError);
    }

    const { error: publishError } = await adminClient.from("lessons")
      .update({ is_published: input.publish, updated_at: new Date().toISOString() })
      .eq("id", input.lessonId);
    if (publishError) failDatabaseOperation(
      input.publish ? "A configuração foi salva, mas a publicação falhou" : "A configuração foi salva, mas o rascunho não pôde ser atualizado",
      publishError,
    );

    revalidatePath(`/admin/cursos/${input.courseId}/aulas/${input.lessonId}`);
    revalidatePath("/courses/[slug]/lessons/[lessonSlug]", "page");
    return { success: true, revision: Number(savedConfig.revision) || revision };
  } catch (error) {
    const message = getActionErrorMessage(error, "Não foi possível salvar a personalização.");
    console.error("[personalized-lessons] Falha ao salvar personalização", { message });
    return { success: false, message };
  }
}

export async function deletePersonalizedLessonDocument(input: {
  lessonId: string;
  documentId: string;
  courseId: string;
}) {
  try {
    const { adminClient } = await requireAdmin();
    const { data, error } = await adminClient.from("personalized_lesson_documents")
      .select("storage_path")
      .eq("id", input.documentId)
      .eq("lesson_id", input.lessonId)
      .maybeSingle();
    if (error || !data) return { success: false, message: "Documento não encontrado." };
    const { data: refs, error: refsError } = await adminClient.from("personalized_lesson_document_refs")
      .select("scope").eq("document_id", input.documentId);
    if (refsError) return { success: false, message: refsError.message };
    const { error: unlinkError } = await adminClient.from("personalized_lesson_document_refs")
      .delete().eq("document_id", input.documentId).eq("scope", "draft");
    if (unlinkError) return { success: false, message: unlinkError.message };
    const remainsPublished = (refs ?? []).some((ref) => ref.scope === "published");
    if (!remainsPublished) {
      const { error: storageError } = await adminClient.storage.from("secure-documents").remove([data.storage_path]);
      if (storageError) return { success: false, message: storageError.message };
      const { error: deleteError } = await adminClient.from("personalized_lesson_documents").delete().eq("id", input.documentId);
      if (deleteError) return { success: false, message: deleteError.message };
    }
    revalidatePath(`/admin/cursos/${input.courseId}/aulas/${input.lessonId}`);
    return { success: true, retainedForPublishedVersion: remainsPublished };
  } catch (error) {
    return { success: false, message: getActionErrorMessage(error, "Não foi possível excluir o documento.") };
  }
}
