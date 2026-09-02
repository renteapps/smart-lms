"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import {
  normalizeBindings,
  normalizeQuestions,
  validatePersonalizedLessonConfig,
} from "@/lib/personalizedLessonCore";
import type { PersonalizedLessonConfig, PersonalizedSourceRef } from "@/types/personalizedLesson";

type Result = { success: true; revision: number } | { success: false; message: string };

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
    if (modelError) throw modelError;
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

    const { data: existingDefinitions } = await adminClient
      .from("student_variable_definitions")
      .select("variable_key, question_type, options, source_lesson_id")
      .in("variable_key", questions.map((question) => question.key));
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
    if (documentsError) throw documentsError;
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
    if (currentError) throw currentError;
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
    if (saveError) throw saveError;

    for (const question of questions) {
      const existing = (existingDefinitions ?? []).find((row) => row.variable_key === question.key);
      if (existing) {
        const { error } = await adminClient.from("student_variable_definitions").update({
          active: true,
          label: question.label,
          updated_at: new Date().toISOString(),
        }).eq("variable_key", question.key);
        if (error) throw error;
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
      if (error) throw error;
    }

    const currentKeys = new Set(questions.map((question) => question.key));
    const { data: ownedDefinitions } = await adminClient.from("student_variable_definitions")
      .select("variable_key")
      .eq("source_lesson_id", input.lessonId);
    const removedKeys = (ownedDefinitions ?? [])
      .map((row) => String(row.variable_key))
      .filter((key) => !currentKeys.has(key));
    if (removedKeys.length) {
      await adminClient.from("student_variable_definitions")
        .update({ active: false, updated_at: new Date().toISOString() })
        .in("variable_key", removedKeys);
    }

    const { error: publishError } = await adminClient.from("lessons")
      .update({ is_published: input.publish, updated_at: new Date().toISOString() })
      .eq("id", input.lessonId);
    if (publishError) throw publishError;

    revalidatePath(`/admin/cursos/${input.courseId}/aulas/${input.lessonId}`);
    revalidatePath("/courses/[slug]/lessons/[lessonSlug]", "page");
    return { success: true, revision: Number(savedConfig.revision) || revision };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Não foi possível salvar a personalização." };
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
    const { error: storageError } = await adminClient.storage.from("secure-documents").remove([data.storage_path]);
    if (storageError) return { success: false, message: storageError.message };
    const { error: deleteError } = await adminClient.from("personalized_lesson_documents").delete().eq("id", input.documentId);
    if (deleteError) return { success: false, message: deleteError.message };
    const { data: revision } = await adminClient.rpc("touch_personalized_lesson_revision", { p_lesson_id: input.lessonId });
    revalidatePath(`/admin/cursos/${input.courseId}/aulas/${input.lessonId}`);
    return { success: true, revision: Number(revision) || undefined };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Não foi possível excluir o documento." };
  }
}
