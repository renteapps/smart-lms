import { describe, expect, it } from "vitest";
import { extractYouTubeId, youtubeEmbedUrl, youtubeThumbnailUrl } from "./youtube";

describe("extractYouTubeId", () => {
  it("aceita os formatos de link que o admin costuma colar", () => {
    const cases = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ];
    for (const url of cases) {
      expect(extractYouTubeId(url), url).toBe("dQw4w9WgXcQ");
    }
  });

  it("aceita o id cru e ignora espaços em volta", () => {
    expect(extractYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("  dQw4w9WgXcQ  ")).toBe("dQw4w9WgXcQ");
  });

  it("preserva parâmetros extras do link sem se confundir", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=abc123")).toBe("dQw4w9WgXcQ");
  });

  it("devolve null para o que não é YouTube", () => {
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId("https://vimeo.com/123456789")).toBeNull();
    expect(extractYouTubeId("não é um link")).toBeNull();
    // 10 caracteres: id do YouTube tem exatamente 11.
    expect(extractYouTubeId("dQw4w9WgXc")).toBeNull();
  });
});

describe("urls derivadas", () => {
  it("monta embed sem cookies e thumbnail", () => {
    expect(youtubeEmbedUrl("dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(youtubeThumbnailUrl("dQw4w9WgXcQ")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });
});
