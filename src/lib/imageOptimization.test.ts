import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PUBLIC_ASSETS_BUCKET,
  compressAndConvertToWebP,
  deleteAvatarFromStorage,
  deleteImageFromStorage,
  extractStoragePath,
  isManagedStorageUrl,
  uploadImageToStorage,
} from "./imageOptimization";

describe("imageOptimization - extractStoragePath", () => {
  it("extrai corretamente o caminho a partir de uma URL pública do Supabase Storage", () => {
    const url = "https://example.supabase.co/storage/v1/object/public/avatars/user-123/avatar-1700000000.webp";
    const path = extractStoragePath(url, "avatars");
    expect(path).toBe("user-123/avatar-1700000000.webp");
  });

  it("extrai corretamente a partir de URL com caracteres codificados", () => {
    const url = "https://example.supabase.co/storage/v1/object/public/avatars/user%20123/avatar.webp";
    const path = extractStoragePath(url, "avatars");
    expect(path).toBe("user 123/avatar.webp");
  });

  it("extrai corretamente quando o path já é relativo com prefixo do bucket", () => {
    const pathWithBucket = "avatars/user-456/photo.webp";
    const path = extractStoragePath(pathWithBucket, "avatars");
    expect(path).toBe("user-456/photo.webp");
  });

  it("retorna o caminho limpo quando já é relativo sem prefixo", () => {
    const cleanRelative = "user-789/avatar.webp";
    const path = extractStoragePath(cleanRelative, "avatars");
    expect(path).toBe("user-789/avatar.webp");
  });

  it("retorna null se a string for vazia", () => {
    expect(extractStoragePath("", "avatars")).toBeNull();
  });
});

describe("imageOptimization - deleteAvatarFromStorage", () => {
  it("chama remove no bucket correto com o caminho extraído", async () => {
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          remove: removeMock,
        }),
      },
    } as unknown as SupabaseClient;

    const url = "https://example.supabase.co/storage/v1/object/public/avatars/user-123/avatar-1700000000.webp";
    const success = await deleteAvatarFromStorage(mockSupabase, url, "avatars");

    expect(mockSupabase.storage.from).toHaveBeenCalledWith("avatars");
    expect(removeMock).toHaveBeenCalledWith(["user-123/avatar-1700000000.webp"]);
    expect(success).toBe(true);
  });

  it("retorna false se a url for inválida ou não pertencer ao bucket", async () => {
    const mockSupabase = {
      storage: {
        from: vi.fn(),
      },
    } as unknown as SupabaseClient;

    const success = await deleteAvatarFromStorage(mockSupabase, "");
    expect(success).toBe(false);
  });
});

describe("imageOptimization - isManagedStorageUrl", () => {
  it("reconhece uma URL pública do nosso bucket", () => {
    const url = `https://exemplo.supabase.co/storage/v1/object/public/${PUBLIC_ASSETS_BUCKET}/courses/abc.webp`;
    expect(isManagedStorageUrl(url)).toBe(true);
  });

  it("reconhece URLs assinadas e autenticadas do bucket", () => {
    const base = "https://exemplo.supabase.co/storage/v1/object";
    expect(isManagedStorageUrl(`${base}/sign/${PUBLIC_ASSETS_BUCKET}/courses/abc.webp`)).toBe(true);
    expect(isManagedStorageUrl(`${base}/authenticated/${PUBLIC_ASSETS_BUCKET}/courses/abc.webp`)).toBe(true);
  });

  it("respeita o bucket informado", () => {
    const url = "https://exemplo.supabase.co/storage/v1/object/public/avatars/user-1/avatar.webp";
    expect(isManagedStorageUrl(url, "avatars")).toBe(true);
    expect(isManagedStorageUrl(url, PUBLIC_ASSETS_BUCKET)).toBe(false);
  });

  it("não considera nossa uma URL externa colada pelo admin", () => {
    expect(isManagedStorageUrl("https://images.unsplash.com/photo-123")).toBe(false);
  });

  it("rejeita string vazia e caminho relativo", () => {
    expect(isManagedStorageUrl("")).toBe(false);
    expect(isManagedStorageUrl("courses/abc.webp")).toBe(false);
  });
});

describe("imageOptimization - deleteImageFromStorage", () => {
  it("remove do bucket público por padrão", async () => {
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      storage: { from: vi.fn().mockReturnValue({ remove: removeMock }) },
    } as unknown as SupabaseClient;

    const url = `https://exemplo.supabase.co/storage/v1/object/public/${PUBLIC_ASSETS_BUCKET}/courses/abc.webp`;
    const success = await deleteImageFromStorage(mockSupabase, url);

    expect(mockSupabase.storage.from).toHaveBeenCalledWith(PUBLIC_ASSETS_BUCKET);
    expect(removeMock).toHaveBeenCalledWith(["courses/abc.webp"]);
    expect(success).toBe(true);
  });

  it("retorna false — sem lançar — quando o storage recusa a remoção", async () => {
    const mockSupabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          remove: vi.fn().mockResolvedValue({ error: { message: "sem permissão" } }),
        }),
      },
    } as unknown as SupabaseClient;

    const url = `https://exemplo.supabase.co/storage/v1/object/public/${PUBLIC_ASSETS_BUCKET}/courses/abc.webp`;
    await expect(deleteImageFromStorage(mockSupabase, url)).resolves.toBe(false);
  });
});

describe("imageOptimization - uploadImageToStorage", () => {
  const mockSupabase = {} as unknown as SupabaseClient;

  it("recusa arquivos acima de 5 MB antes de tocar a rede", async () => {
    const bigFile = { size: 6 * 1024 * 1024, type: "image/png", name: "capa.png" } as File;

    await expect(
      uploadImageToStorage(mockSupabase, { file: bigFile, folder: "courses" })
    ).rejects.toThrow("A imagem precisa ter no máximo 5 MB.");
  });
});

describe("imageOptimization - compressAndConvertToWebP", () => {
  it("rejeita arquivo que não é imagem", async () => {
    const file = { size: 10, type: "application/pdf", name: "doc.pdf" } as File;
    await expect(compressAndConvertToWebP(file)).rejects.toThrow("não é uma imagem válida");
  });
});
