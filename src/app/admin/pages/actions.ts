"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { publishedPageSettingKey } from "@/lib/data/pages";
import {
  isReservedPageSlug,
  isSystemPageKey,
  isValidPageSlugFormat,
  validatePageDocument,
} from "@/lib/pageBuilder";
import type { PageDocument } from "@/types/pageBuilder";

type PageActionResult = {
  success: boolean;
  message: string;
  revision?: number;
  conflict?: boolean;
  updatedAt?: string;
};

type CreatePageResult = PageActionResult & { slug?: string };

function isValidPageKeyFormat(value: string): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 80;
}

export async function savePageDraft(
  pageKeyInput: string,
  documentInput: PageDocument,
  expectedRevision: number,
): Promise<PageActionResult> {
  try {
    if (!isValidPageKeyFormat(pageKeyInput)) return { success: false, message: "Página inválida." };
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
      if (error?.code === "23503") {
        return { success: false, message: "Esta página não existe mais — ela pode ter sido excluída em outra sessão." };
      }
      if (error || !data) return { success: false, message: error?.message || "Não foi possível salvar o rascunho." };
      revalidatePath("/admin/pages");
      revalidatePath(`/admin/pages/${pageKeyInput}`);
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
    revalidatePath(`/admin/pages/${pageKeyInput}`);
    return { success: true, message: "Rascunho salvo.", revision: data.revision, updatedAt: data.updated_at ?? now };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Não foi possível salvar o rascunho." };
  }
}

export async function publishPage(pageKeyInput: string, expectedRevision: number): Promise<PageActionResult> {
  try {
    if (!isValidPageKeyFormat(pageKeyInput)) return { success: false, message: "Página inválida." };
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

    // A home pública/vitrine usa a mesma rota "/" para qualquer sessão; uma
    // página custom tem sua própria rota — sem essa distinção, publicar uma
    // custom nunca invalidaria o cache da URL certa.
    if (isSystemPageKey(pageKeyInput)) {
      revalidatePath("/");
    } else {
      revalidatePath(`/pagina/${pageKeyInput}`);
    }
    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${pageKeyInput}`);
    return { success: true, message: "Página publicada com sucesso.", revision: draft.revision, updatedAt: publishedAt };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Não foi possível publicar a página." };
  }
}

export async function createPage(input: { title: string; slug: string; description?: string }): Promise<CreatePageResult> {
  try {
    const title = input.title.trim();
    const slug = input.slug.trim().toLowerCase();
    const description = input.description?.trim() || null;

    if (title.length < 1 || title.length > 180) return { success: false, message: "Informe um título válido." };
    if (!isValidPageSlugFormat(slug)) {
      return { success: false, message: "O endereço deve ter só letras minúsculas, números e hifens." };
    }
    if (isReservedPageSlug(slug)) {
      return { success: false, message: "Este endereço já é usado pela plataforma — escolha outro." };
    }

    const { adminClient, user } = await requireAdmin();
    const { error } = await adminClient.from("pages").insert({
      slug,
      title,
      description,
      kind: "custom",
      created_by: user.id,
    });

    if (error?.code === "23505") {
      return { success: false, message: "Já existe uma página com esse endereço." };
    }
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/pages");
    return { success: true, message: "Página criada.", slug };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Não foi possível criar a página." };
  }
}

export async function deletePage(slugInput: string): Promise<PageActionResult> {
  try {
    if (!isValidPageKeyFormat(slugInput)) return { success: false, message: "Página inválida." };
    const { adminClient } = await requireAdmin();

    const { data: page, error: pageError } = await adminClient.from("pages")
      .select("kind")
      .eq("slug", slugInput)
      .maybeSingle();
    if (pageError) return { success: false, message: pageError.message };
    if (!page) return { success: false, message: "Página não encontrada." };
    if (page.kind !== "custom") return { success: false, message: "Páginas do sistema não podem ser excluídas." };

    // A publicação não tem vínculo automático com o registro (app_settings
    // não tem FK para pages) — por isso o conteúdo publicado é removido à
    // parte, antes do registro. Se esta etapa falhar no meio, a página some
    // da lista/edição mas o /pagina/<slug> continua respondendo até uma
    // nova tentativa completar a limpeza.
    const { error: settingsError } = await adminClient.from("app_settings")
      .delete()
      .eq("key", publishedPageSettingKey(slugInput));
    if (settingsError) return { success: false, message: settingsError.message };

    const { error: deleteError } = await adminClient.from("pages").delete().eq("slug", slugInput);
    if (deleteError) return { success: false, message: deleteError.message };

    revalidatePath("/admin/pages");
    revalidatePath(`/pagina/${slugInput}`);
    return { success: true, message: "Página excluída." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Não foi possível excluir a página." };
  }
}
