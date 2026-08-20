import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentFile } from "@/types/agente";

/** Bucket privado — RLS libera upload/leitura/remoção só para admins. */
export const AGENT_FILES_BUCKET = "secure-documents";

export const MAX_AGENT_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"];

/**
 * O bucket é privado, então não existe URL pública: o link salvo é assinado.
 * Sem UI de "renovar link" ainda, então o TTL é longo o bastante (10 anos)
 * para não expirar na prática enquanto só o admin usa esse link.
 */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

function assertAllowedFile(file: File) {
  const lowerName = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    throw new Error(`"${file.name}": formato não suportado. Envie PDF, DOC, DOCX ou TXT.`);
  }
  if (file.size > MAX_AGENT_FILE_BYTES) {
    throw new Error(`"${file.name}": o arquivo precisa ter no máximo 10 MB.`);
  }
}

/** Envia um documento de apoio para o bucket seguro e devolve seus metadados. */
export async function uploadAgentFile(supabase: SupabaseClient, file: File): Promise<AgentFile> {
  assertAllowedFile(file);

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const storagePath = `agent-knowledge/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(AGENT_FILES_BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });
  if (uploadError) throw new Error(`Erro ao enviar "${file.name}": ${uploadError.message}`);

  const { data: signedData, error: signError } = await supabase.storage
    .from(AGENT_FILES_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (signError || !signedData?.signedUrl) {
    await supabase.storage.from(AGENT_FILES_BUCKET).remove([storagePath]);
    throw new Error(`"${file.name}" foi enviado, mas o link de acesso falhou: ${signError?.message ?? "erro desconhecido"}.`);
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    url: signedData.signedUrl,
    sizeBytes: file.size,
    storagePath,
  };
}

/** Melhor esforço: remover o objeto do storage nunca deve travar a remoção na tela. */
export async function deleteAgentFile(supabase: SupabaseClient, file: AgentFile): Promise<void> {
  if (!file.storagePath) return;
  try {
    await supabase.storage.from(AGENT_FILES_BUCKET).remove([file.storagePath]);
  } catch (err) {
    console.warn("Erro ao remover arquivo do storage:", err);
  }
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileExtensionLabel(name: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(name);
  return match ? match[1].toUpperCase() : "Arquivo";
}
