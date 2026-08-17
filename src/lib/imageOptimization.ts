import type { SupabaseClient } from "@supabase/supabase-js";

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
  const { quality = 0.7, maxWidth = 800, maxHeight = 800 } = options;

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
          const webpFileName = `${originalNameWithoutExt || "avatar"}.webp`;

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
 * Deleta uma foto do bucket de storage do Supabase para otimizar espaço
 */
export async function deleteAvatarFromStorage(
  supabase: SupabaseClient,
  avatarUrlOrPath: string,
  bucketName: string = "avatars"
): Promise<boolean> {
  const filePath = extractStoragePath(avatarUrlOrPath, bucketName);
  if (!filePath) {
    return false;
  }

  try {
    const { error } = await supabase.storage.from(bucketName).remove([filePath]);
    if (error) {
      console.warn("Aviso ao remover foto antiga do storage:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Erro ao tentar deletar arquivo do storage:", err);
    return false;
  }
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
  // 1. Converte e comprime para WebP a 70% de qualidade
  const webpFile = await compressAndConvertToWebP(file, { quality: 0.7, maxWidth: 800, maxHeight: 800 });

  // 2. Define caminho único no storage
  const timestamp = Date.now();
  const filePath = `${userId}/avatar-${timestamp}.webp`;

  // 3. Upload no Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, webpFile, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Erro ao enviar foto para o servidor: ${uploadError.message}`);
  }

  // 4. Obtém URL pública
  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

  return {
    publicUrl: publicUrlData.publicUrl,
    filePath,
  };
}
