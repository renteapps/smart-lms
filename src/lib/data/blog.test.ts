import { describe, it, expect, vi } from "vitest";
import { mapArticle, getAllArticles, getArticleBySlug, getArticlesByCategory, getArticleSlugs } from "./blog";

describe("blog data functions", () => {
  it("mapArticle correctly maps db row to Article with timestamp", () => {
    const mockRow = {
      id: "123",
      slug: "post-teste",
      title: "Post de Teste",
      excerpt: "Resumo do post",
      cover: "https://example.com/cover.jpg",
      category: "Tecnologia",
      author: "Nohan",
      author_id: "auth-1",
      published_at: "2026-08-24T12:00:00.000Z",
      reading_time: 5,
      format: "text",
      body: "Conteúdo do artigo",
      blocks: [],
      audio_url: null,
      audio_duration: null,
      audio_transcript: null,
      featured: true,
      premium: false,
      courses: { slug: "curso-relacionado" },
      author_rel: {
        id: "auth-1",
        name: "Nohan",
        slug: "nohan",
        title: "Engenheiro",
        avatar_url: "https://example.com/avatar.jpg",
        bio: "Bio do autor",
      },
    };

    const mapped = mapArticle(mockRow);
    expect(mapped.slug).toBe("post-teste");
    expect(mapped.title).toBe("Post de Teste");
    expect(mapped.publishedAt).toBe(new Date("2026-08-24T12:00:00.000Z").getTime());
    expect(mapped.authorDetails?.title).toBe("Engenheiro");
    expect(mapped.relatedCourseSlug).toBe("curso-relacionado");
    expect(mapped.featured).toBe(true);
  });

  describe("query filters for scheduled posts", () => {
    it("getAllArticles queries published articles with published_at <= now", async () => {
      const mockLte = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      const mockEq = vi.fn().mockReturnValue({
        lte: mockLte,
      });
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockDb = {
        from: mockFrom,
      } as any;

      await getAllArticles(mockDb);

      expect(mockFrom).toHaveBeenCalledWith("articles");
      expect(mockEq).toHaveBeenCalledWith("is_published", true);
      expect(mockLte).toHaveBeenCalledWith("published_at", expect.any(String));
    });

    it("getArticleBySlug includes lte check for published_at", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockLte = vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });
      const mockEqPublished = vi.fn().mockReturnValue({
        lte: mockLte,
      });
      const mockEqSlug = vi.fn().mockReturnValue({
        eq: mockEqPublished,
      });
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEqSlug,
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockDb = {
        from: mockFrom,
      } as any;

      await getArticleBySlug(mockDb, "meu-artigo");

      expect(mockEqSlug).toHaveBeenCalledWith("slug", "meu-artigo");
      expect(mockEqPublished).toHaveBeenCalledWith("is_published", true);
      expect(mockLte).toHaveBeenCalledWith("published_at", expect.any(String));
    });
  });
});
