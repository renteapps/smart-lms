"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { publishedPageSettingKey } from "@/lib/data/pages";
import { PAGE_KEYS, validatePageDocument } from "@/lib/pageBuilder";
import type { PageDocument, PageKey } from "@/types/pageBuilder";

type PageActionResult = {
  success: boolean;
  message: string;
  revision?: number;
  conflict?: boolean;
  updatedAt?: string;
};

function isPageKey(value: string): value is PageKey {
  return PAGE_KEYS.includes(value as PageKey);
}

export async function savePageDraft(
  pageKeyInput: string,
  documentInput: PageDocument,
  expectedRevision: number,
): Promise<PageActionResult> {
  try {
    if (!isPageKey(pageKeyInput)) return { success: false, message: "Página inválida." };
    const validated = validatePageDocument(documentInput, pageKeyInput);
    if (!validated.success) return { success: false, message: validated.error };
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return { success: false, message: "Revisão inválida." };
    }

    const { adminClient, user } = await requireAdmin();
    const nextRevision = expectedRevision + 1;
    const now = new Date().toISOString();

    if (expectedRevision === 0) {
      const { data, error } = await adminClient.from("page_builder_drafts").insert({
        page_key: pageKeyInput,
        document: validated.document,
        revision: nextRevision,
        updated_by: user.id,
      }).select("revision, updated_at").maybeSingle();

      if (error?.code === "23505") {
        return { success: false, conflict: true, message: "Outro administrador criou este rascunho. Recarregue a página." };
      }
      if (error || !data) return { success: false, message: error?.message || "Não foi possível salvar o rascunho." };
      revalidatePath("/admin/pages");
      return { success: true, message: "Rascunho salvo.", revision: data.revision, updatedAt: data.updated_at ?? now };
    }

    const { data, error } = await adminClient.from("page_builder_drafts")
      .update({ document: validated.document, revision: nextRevision, updated_by: user.id })
      .eq("page_key", pageKeyInput)
      .eq("revision", expectedRevision)
      .select("revision, updated_at")
      .maybeSingle();

    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, conflict: true, message: "Este rascunho mudou em outra sessão. Recarregue antes de continuar." };
    revalidatePath("/admin/pages");
    return { success: true, message: "Rascunho salvo.", revision: data.revision, updatedAt: data.updated_at ?? now };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Não foi possível salvar o rascunho." };
  }
}

export async function publishPage(pageKeyInput: string, expectedRevision: number): Promise<PageActionResult> {
  try {
    if (!isPageKey(pageKeyInput)) return { success: false, message: "Página inválida." };
    const { adminClient } = await requireAdmin();
    const { data: draft, error: draftError } = await adminClient.from("page_builder_drafts")
      .select("document, revision")
      .eq("page_key", pageKeyInput)
      .maybeSingle();

    if (draftError) return { success: false, message: draftError.message };
    if (!draft || draft.revision !== expectedRevision) {
      return { success: false, conflict: true, message: "Salve a versão mais recente do rascunho antes de publicar." };
    }
    const validated = validatePageDocument(draft.document, pageKeyInput);
    if (!validated.success) return { success: false, message: validated.error };

    const publishedAt = new Date().toISOString();
    const { error } = await adminClient.from("app_settings").upsert({
      key: publishedPageSettingKey(pageKeyInput),
      value: validated.document,
      updated_at: publishedAt,
    }, { onConflict: "key" });
    if (error) return { success: false, message: error.message };

    revalidatePath("/");
    revalidatePath("/admin/pages");
    return { success: true, message: "Página publicada com sucesso.", revision: draft.revision, updatedAt: publishedAt };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Não foi possível publicar a página." };
  }
}
