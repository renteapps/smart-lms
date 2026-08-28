import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ARTICLE_AUDIO_BUCKET,
  AUDIO_PRESETS,
  deleteAudioFromStorage,
  formatAudioDuration,
  isManagedAudioUrl,
} from "./audioOptimization";

describe("audioOptimization - formatAudioDuration", () => {
  it("formata minutos e segundos com dois dígitos", () => {
    expect(formatAudioDuration(0)).toBe("0:00");
    expect(formatAudioDuration(5)).toBe("0:05");
    expect(formatAudioDuration(185)).toBe("3:05");
  });

  it("acrescenta a casa das horas só quando existe hora", () => {
    expect(formatAudioDuration(3599)).toBe("59:59");
    expect(formatAudioDuration(3600)).toBe("1:00:00");
    expect(formatAudioDuration(3725)).toBe("1:02:05");
  });

  it("degrada para 0:00 em valores inválidos", () => {
    // `audio.duration` é NaN enquanto os metadados não carregaram, e o player
    // renderiza antes disso — sem esta guarda a interface mostraria "NaN:NaN".
    expect(formatAudioDuration(NaN)).toBe("0:00");
    expect(formatAudioDuration(Infinity)).toBe("0:00");
    expect(formatAudioDuration(-10)).toBe("0:00");
  });
});

describe("audioOptimization - isManagedAudioUrl", () => {
  it("reconhece um arquivo hospedado no nosso bucket", () => {
    const url = `https://x.supabase.co/storage/v1/object/public/${ARTICLE_AUDIO_BUCKET}/blog/abc.m4a`;
    expect(isManagedAudioUrl(url)).toBe(true);
  });

  it("não reconhece URL externa colada pelo admin", () => {
    // Importa porque só o que é nosso pode ser apagado do storage ao trocar o
    // áudio — um link de CDN externo deve ser apenas descartado.
    expect(isManagedAudioUrl("https://cdn.exemplo.com/podcast/ep1.mp3")).toBe(false);
    expect(isManagedAudioUrl("")).toBe(false);
  });
});

describe("audioOptimization - deleteAudioFromStorage", () => {
  it("remove o objeto correspondente ao caminho dentro do bucket", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const supabase = { storage: { from: vi.fn(() => ({ remove })) } } as unknown as SupabaseClient;

    const url = `https://x.supabase.co/storage/v1/object/public/${ARTICLE_AUDIO_BUCKET}/blog/abc.m4a`;
    await expect(deleteAudioFromStorage(supabase, url)).resolves.toBe(true);

    expect(supabase.storage.from).toHaveBeenCalledWith(ARTICLE_AUDIO_BUCKET);
    expect(remove).toHaveBeenCalledWith(["blog/abc.m4a"]);
  });

  it("devolve false — sem lançar — quando a remoção falha", async () => {
    // Limpar o arquivo antigo é sempre melhor-esforço: nunca deve derrubar o
    // fluxo de quem acabou de subir um áudio novo.
    const remove = vi.fn().mockResolvedValue({ error: { message: "not found" } });
    const supabase = { storage: { from: vi.fn(() => ({ remove })) } } as unknown as SupabaseClient;

    const url = `https://x.supabase.co/storage/v1/object/public/${ARTICLE_AUDIO_BUCKET}/blog/abc.m4a`;
    await expect(deleteAudioFromStorage(supabase, url)).resolves.toBe(false);
  });
});

describe("audioOptimization - presets", () => {
  it("mantém voz em mono e música em estéreo", () => {
    expect(AUDIO_PRESETS.voz.numberOfChannels).toBe(1);
    expect(AUDIO_PRESETS.musica.numberOfChannels).toBe(2);
    expect(AUDIO_PRESETS.voz.bitrate).toBeLessThan(AUDIO_PRESETS.musica.bitrate);
  });
});
