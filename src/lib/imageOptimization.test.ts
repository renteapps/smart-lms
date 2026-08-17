import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractStoragePath, deleteAvatarFromStorage } from "./imageOptimization";

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
