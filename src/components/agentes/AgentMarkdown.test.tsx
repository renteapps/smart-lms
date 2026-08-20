import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentMarkdown } from "./AgentMarkdown";

describe("AgentMarkdown", () => {
  it("renderiza ênfase e listas sem expor os marcadores do Markdown", () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown text={"1. **Contexto:** Primeiro item\n2. **Impacto:** Segundo item"} />,
    );

    expect(html).toContain("<ol");
    expect(html).toContain("<strong");
    expect(html).toContain("Contexto:");
    expect(html).not.toContain("**Contexto:**");
  });

  it("ignora HTML e imagens vindos da resposta", () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown text={'<script>alert("xss")</script>\n\n![rastreador](https://example.com/pixel.png)'} />,
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("pixel.png");
  });

  it("abre links em outra aba com isolamento da página", () => {
    const html = renderToStaticMarkup(<AgentMarkdown text="[Documentação](https://example.com)" />);

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
  });
});
