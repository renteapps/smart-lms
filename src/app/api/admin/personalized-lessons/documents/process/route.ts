import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText } from "unpdf";
import { requireAdmin } from "@/lib/supabase/auth";
import { sanitizeExtractedText } from "@/lib/personalizedLessonCore";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 500_000;
const TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function extractDocumentText(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "application/pdf") {
    const result = await extractText(bytes, { mergePages: true });
    return result.text;
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return result.value;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export async function POST(request: Request) {
  let documentId: string | null = null;
  try {
    const { adminClient, user } = await requireAdmin();
    const body = await request.json() as Record<string, unknown>;
    const lessonId = asText(body.lessonId);
    const storagePath = asText(body.storagePath);
    const fileName = asText(body.fileName).slice(0, 255);
    const requestedMimeType = asText(body.mimeType).toLowerCase();
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = TYPE_BY_EXTENSION[extension];
    if (!lessonId || !fileName || !storagePath.startsWith(`personalized-lessons/${lessonId}/`)) {
      return NextResponse.json({ error: "Documento inválido." }, { status: 400 });
    }
    if (!mimeType || (requestedMimeType && requestedMimeType !== mimeType && !(mimeType === "text/markdown" && requestedMimeType === "text/x-markdown"))) {
      return NextResponse.json({ error: "Use PDF, DOCX, TXT ou Markdown." }, { status: 415 });
    }

    const [{ count }, lessonResult] = await Promise.all([
      adminClient.from("personalized_lesson_documents").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId),
      adminClient.from("lessons").select("id, type").eq("id", lessonId).maybeSingle(),
    ]);
    if (lessonResult.data?.type !== "personalized_ai") {
      return NextResponse.json({ error: "Aula personalizada não encontrada." }, { status: 404 });
    }
    if ((count ?? 0) >= 10) {
      return NextResponse.json({ error: "Cada aula aceita no máximo 10 documentos." }, { status: 422 });
    }

    const { data: created, error: createError } = await adminClient.from("personalized_lesson_documents").insert({
      lesson_id: lessonId,
      file_name: fileName,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: 1,
      status: "processing",
      created_by: user.id,
    }).select("id").single();
    if (createError) throw createError;
    documentId = created.id;

    const { data: blob, error: downloadError } = await adminClient.storage.from("secure-documents").download(storagePath);
    if (downloadError || !blob) throw new Error(downloadError?.message || "Arquivo não encontrado no Storage.");
    if (blob.size < 1 || blob.size > MAX_FILE_BYTES) throw new Error("O arquivo deve ter no máximo 10 MB.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (mimeType === "application/pdf" && new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
      throw new Error("O arquivo enviado não é um PDF válido.");
    }
    if (mimeType.includes("wordprocessingml") && !(bytes[0] === 0x50 && bytes[1] === 0x4b)) {
      throw new Error("O arquivo enviado não é um DOCX válido.");
    }
    const extractedText = sanitizeExtractedText(await extractDocumentText(bytes, mimeType)).slice(0, MAX_EXTRACTED_CHARS);
    if (!extractedText) throw new Error("Nenhum texto legível foi encontrado no documento.");
    const contentHash = createHash("sha256").update(bytes).digest("hex");
    const { error: updateError } = await adminClient.from("personalized_lesson_documents").update({
      size_bytes: blob.size,
      content_hash: contentHash,
      extracted_text: extractedText,
      status: "ready",
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq("id", documentId);
    if (updateError) throw updateError;
    const { data: revision } = await adminClient.rpc("touch_personalized_lesson_revision", { p_lesson_id: lessonId });
    return NextResponse.json({ id: documentId, status: "ready", revision: Number(revision) || undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar o documento.";
    if (documentId) {
      try {
        const { adminClient } = await requireAdmin();
        await adminClient.from("personalized_lesson_documents").update({
          status: "failed",
          error_message: message.slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq("id", documentId);
      } catch {
        // O erro original é mais útil para o administrador.
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
