import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Bucket público padrão para imagens de produto (capas, logos, banners, branding).
 * Avatares continuam no bucket `avatars`, cujas policies exigem que o primeiro
 * segmento do caminho seja o id do usuário.
 */
export const PUBLIC_ASSETS_BUCKET = "public-assets";

/** Teto de qualidade da plataforma. Nenhum call-site consegue pedir mais que isso. */
export const MAX_IMAGE_QUALITY = 0.7;

/** Tamanho máximo aceito antes da conversão (5 MB) — espelha o limite do bucket. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Pastas conhecidas dentro do bucket público. Tipar o conjunto evita que um erro
 * de digitação vire uma pasta órfã no storage.
 */
export type ImageFolder =
  | "courses"
  | "modules"
  | "lessons"
  | "banners"
  | "profile-tests"
  | "companies"
  | "branding"
  | "plans"
  | "pilulas"
  | "blog";

export interface ImageOptimizationOptions {
  /**
   * Qualidade da imagem entre 0 e 1. Padrão: 0.70 (70%)
   */
  quality?: number;
  /**
   * Largura máxima em pixels para redimensionamento proporcional. Padrão: 800
   */
  maxWidth?: number;
  /**
   * Altura máxima em pixels para redimensionamento proporcional. Padrão: 800
   */
  maxHeight?: number;
}

/**
 * Converte qualquer imagem recebida (PNG, JPEG, HEIC, etc.) para formato WebP
 * com compressão de qualidade definida (padrão 70%) e redimensionamento proporcional no navegador.
 */
export async function compressAndConvertToWebP(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<File> {
  const { maxWidth = 800, maxHeight = 800 } = options;
  // Teto rígido: a plataforma nunca envia imagem acima de 70% de qualidade.
  const quality = Math.min(options.quality ?? MAX_IMAGE_QUALITY, MAX_IMAGE_QUALITY);

  return new Promise((resolve, reject) => {
    // Validação básica do tipo
    if (!file.type.startsWith("image/")) {
      return reject(new Error("O arquivo selecionado não é uma imagem válida."));
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Redimensionamento proporcional mantendo o aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Não foi possível inicializar o contexto 2D do Canvas."));
      }

      // Suavização de imagem de alta qualidade
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Desenha a imagem redimensionada no canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Converte para WebP com qualidade 70%
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error("Falha ao gerar o arquivo WebP comprimido."));
          }

          // Nome base sem extensão anterior
          const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
          const webpFileName = `${originalNameWithoutExt || "imagem"}.webp`;

          const optimizedFile = new File([blob], webpFileName, {
            type: "image/webp",
            lastModified: Date.now(),
          });

          resolve(optimizedFile);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível carregar a imagem para processamento."));
    };

    img.src = objectUrl;
  });
}

/**
 * Extrai o caminho relativo dentro do bucket a partir de uma URL pública do Supabase Storage ou path.
 * Exemplo:
 * https://xyz.supabase.co/storage/v1/object/public/avatars/user-id/avatar-123.webp -> user-id/avatar-123.webp
 */
export function extractStoragePath(urlOrPath: string, bucketName: string = "avatars"): string | null {
  if (!urlOrPath) return null;

  try {
    // Se for uma URL completa
    if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
      const url = new URL(urlOrPath);
      const pathname = decodeURIComponent(url.pathname);

      // Padrão comum do Supabase Storage: /storage/v1/object/public/{bucketName}/{path}
      const publicPattern = `/storage/v1/object/public/${bucketName}/`;
      const signPattern = `/storage/v1/object/sign/${bucketName}/`;
      const authPattern = `/storage/v1/object/authenticated/${bucketName}/`;

      if (pathname.includes(publicPattern)) {
        return pathname.substring(pathname.indexOf(publicPattern) + publicPattern.length);
      }
      if (pathname.includes(signPattern)) {
        return pathname.substring(pathname.indexOf(signPattern) + signPattern.length);
      }
      if (pathname.includes(authPattern)) {
        return pathname.substring(pathname.indexOf(authPattern) + authPattern.length);
      }

      // Se contém /{bucketName}/
      const bucketPattern = `/${bucketName}/`;
      const idx = pathname.indexOf(bucketPattern);
      if (idx !== -1) {
        return pathname.substring(idx + bucketPattern.length);
      }
      return null;
    }

    // Se já for um path relativo
    let cleanPath = urlOrPath.trim();
    if (cleanPath.startsWith(`${bucketName}/`)) {
      cleanPath = cleanPath.substring(bucketName.length + 1);
    }
    return cleanPath || null;
  } catch {
    return null;
  }
}

/**
 * Diz se a URL aponta para um arquivo hospedado por nós naquele bucket.
 * Só faz sentido apagar do storage o que é nosso — uma URL do Unsplash colada
 * pelo admin deve ser simplesmente descartada, nunca "removida".
 */
export function isManagedStorageUrl(url: string, bucketName: string = PUBLIC_ASSETS_BUCKET): boolean {
  if (!url) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;

  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    return (
      pathname.includes(`/storage/v1/object/public/${bucketName}/`) ||
      pathname.includes(`/storage/v1/object/sign/${bucketName}/`) ||
      pathname.includes(`/storage/v1/object/authenticated/${bucketName}/`)
    );
  } catch {
    return false;
  }
}

/**
 * Remove um arquivo do bucket informado para não acumular lixo no storage.
 * Retorna false — sem lançar — quando o caminho não pôde ser resolvido ou a
 * remoção falhou: apagar o arquivo antigo é sempre melhor-esforço e nunca deve
 * derrubar o fluxo de quem acabou de subir uma imagem nova.
 */
export async function deleteImageFromStorage(
  supabase: SupabaseClient,
  urlOrPath: string,
  bucketName: string = PUBLIC_ASSETS_BUCKET
): Promise<boolean> {
  const filePath = extractStoragePath(urlOrPath, bucketName);
  if (!filePath) {
    return false;
  }

  try {
    const { error } = await supabase.storage.from(bucketName).remove([filePath]);
    if (error) {
      console.warn("Aviso ao remover imagem antiga do storage:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Erro ao tentar deletar arquivo do storage:", err);
    return false;
  }
}

/** Fases do envio, para quem quiser refletir o progresso na interface. */
export type UploadPhase = "optimizing" | "uploading";

export interface UploadImageOptions extends ImageOptimizationOptions {
  file: File;
  /** Pasta dentro do bucket. Ex.: "courses", "companies", ou o id do usuário para avatares. */
  folder: ImageFolder | (string & {});
  bucket?: string;
  /** Nome do arquivo sem extensão. Padrão: um id aleatório. */
  fileName?: string;
  /** Chamado ao entrar em cada fase — evita comprimir duas vezes só para exibir progresso. */
  onPhase?: (phase: UploadPhase) => void;
}

/**
 * Otimiza a imagem em WebP (qualidade ≤ 70%) e envia para o Supabase Storage.
 * Retorna a URL pública gerada e o caminho relativo dentro do bucket.
 */
export async function uploadImageToStorage(
  supabase: SupabaseClient,
  options: UploadImageOptions
): Promise<{ publicUrl: string; filePath: string }> {
  const {
    file,
    folder,
    bucket = PUBLIC_ASSETS_BUCKET,
    quality = MAX_IMAGE_QUALITY,
    maxWidth = 1600,
    maxHeight = 1600,
    fileName,
    onPhase,
  } = options;

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("A imagem precisa ter no máximo 5 MB.");
  }

  // 1. Converte e comprime para WebP (o teto de 70% é aplicado dentro da função)
  onPhase?.("optimizing");
  const webpFile = await compressAndConvertToWebP(file, { quality, maxWidth, maxHeight });

  // 2. Caminho único — nome aleatório permite cache imutável e evita colisão
  const safeFolder = String(folder).replace(/^\/+|\/+$/g, "");
  const uniqueName = fileName ?? generateFileId();
  const filePath = `${safeFolder}/${uniqueName}.webp`;

  // 3. Upload no Supabase Storage
  onPhase?.("uploading");
  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, webpFile, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });

  if (uploadError) {
    throw new Error(`Erro ao enviar a imagem para o servidor: ${uploadError.message}`);
  }

  // 4. Obtém URL pública
  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    publicUrl: publicUrlData.publicUrl,
    filePath,
  };
}

function generateFileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Avatares — wrappers finos sobre as funções genéricas.
// O bucket `avatars` tem policies próprias que exigem `(storage.foldername(name))[1] = auth.uid()`,
// por isso a pasta é sempre o id do usuário.
// ---------------------------------------------------------------------------

/**
 * Deleta uma foto de perfil do storage para otimizar espaço.
 */
export async function deleteAvatarFromStorage(
  supabase: SupabaseClient,
  avatarUrlOrPath: string,
  bucketName: string = "avatars"
): Promise<boolean> {
  return deleteImageFromStorage(supabase, avatarUrlOrPath, bucketName);
}

/**
 * Otimiza a imagem em WebP (70% qualidade) e envia para o bucket 'avatars' no Supabase.
 * Retorna a URL pública gerada.
 */
export async function uploadAvatarToStorage(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  bucketName: string = "avatars"
): Promise<{ publicUrl: string; filePath: string }> {
  return uploadImageToStorage(supabase, {
    file,
    folder: userId,
    bucket: bucketName,
    quality: MAX_IMAGE_QUALITY,
    maxWidth: 800,
    maxHeight: 800,
    fileName: `avatar-${Date.now()}`,
  });
}
