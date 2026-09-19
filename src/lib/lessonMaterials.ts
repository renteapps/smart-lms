export const LESSON_MATERIALS_BUCKET = "lesson-materials";

const STORAGE_MARKER = `/storage/v1/object/public/${LESSON_MATERIALS_BUCKET}/`;

/**
 * Caminho do arquivo dentro do bucket `lesson-materials` a partir da URL
 * gravada em `attachments.url` (a URL pública gerada no upload), ou `null`
 * quando o anexo é um link externo.
 */
export function lessonMaterialPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const index = url.indexOf(STORAGE_MARKER);
  if (index === -1) return null;
  const raw = url.slice(index + STORAGE_MARKER.length).split(/[?#]/)[0];
  if (!raw) return null;
  try {
    const path = decodeURIComponent(raw);
    return path.split("/").some((segment) => segment === ".." || segment === "") ? null : path;
  } catch {
    return null;
  }
}

/** Link que o aluno clica: passa pela checagem de acesso antes de assinar a URL. */
export function lessonMaterialHref(attachmentId: string): string {
  return `/api/materiais/${encodeURIComponent(attachmentId)}`;
}
