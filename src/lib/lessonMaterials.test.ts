import { describe, expect, it } from "vitest";
import { lessonMaterialHref, lessonMaterialPath } from "@/lib/lessonMaterials";

const BASE = "https://proj.supabase.co/storage/v1/object/public/lesson-materials/";

describe("lessonMaterialPath", () => {
  it("extrai o caminho da URL pública do upload", () => {
    expect(lessonMaterialPath(`${BASE}0b1c-apostila.pdf`)).toBe("0b1c-apostila.pdf");
    expect(lessonMaterialPath(`${BASE}pasta/arquivo%20final.pdf?download=1`)).toBe("pasta/arquivo final.pdf");
  });

  it("devolve null para links externos, vazios ou caminhos suspeitos", () => {
    expect(lessonMaterialPath("https://drive.google.com/file/abc")).toBeNull();
    expect(lessonMaterialPath(null)).toBeNull();
    expect(lessonMaterialPath(BASE)).toBeNull();
    expect(lessonMaterialPath(`${BASE}../secure-documents/x.pdf`)).toBeNull();
    expect(lessonMaterialPath(`${BASE}a//b.pdf`)).toBeNull();
  });

  it("monta o link protegido pelo id do anexo", () => {
    expect(lessonMaterialHref("11111111-2222-3333-4444-555555555555")).toBe(
      "/api/materiais/11111111-2222-3333-4444-555555555555",
    );
  });
});
