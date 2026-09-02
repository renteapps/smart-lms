import { describe, expect, it } from "vitest";
import { markdownToLessonBlocks, parseInlineContent } from "@/lib/personalizedLessonBlocks";
import type { LessonContentBlock } from "@/types/course";

/** Acha o primeiro bloco de um tipo. */
function first(blocks: LessonContentBlock[], type: string) {
  const block = blocks.find((item) => item.type === type);
  if (!block) throw new Error(`bloco "${type}" não encontrado`);
  return block;
}

describe("parseInlineContent", () => {
  it("aplica os estilos básicos", () => {
    expect(parseInlineContent("**negrito**")).toEqual([{ type: "text", text: "negrito", styles: { bold: true } }]);
    expect(parseInlineContent("*ita*")).toEqual([{ type: "text", text: "ita", styles: { italic: true } }]);
    expect(parseInlineContent("_ita_")).toEqual([{ type: "text", text: "ita", styles: { italic: true } }]);
    expect(parseInlineContent("`x()`")).toEqual([{ type: "text", text: "x()", styles: { code: true } }]);
    expect(parseInlineContent("~~fora~~")).toEqual([{ type: "text", text: "fora", styles: { strike: true } }]);
  });

  it("converte ==frase== em grifo amarelo", () => {
    expect(parseInlineContent("uma ==frase-chave== aqui")).toEqual([
      { type: "text", text: "uma ", styles: {} },
      { type: "text", text: "frase-chave", styles: { backgroundColor: "yellow" } },
      { type: "text", text: " aqui", styles: {} },
    ]);
  });

  it("não grifa quando há espaço colado ao ==", () => {
    expect(parseInlineContent("== espacado ==")).toEqual([{ type: "text", text: "== espacado ==", styles: {} }]);
  });

  it("aninha estilos dentro do negrito", () => {
    expect(parseInlineContent("**forte com `codigo`**")).toEqual([
      { type: "text", text: "forte com ", styles: { bold: true } },
      { type: "text", text: "codigo", styles: { bold: true, code: true } },
    ]);
    expect(parseInlineContent("**forte ==grifo==**")).toEqual([
      { type: "text", text: "forte ", styles: { bold: true } },
      { type: "text", text: "grifo", styles: { bold: true, backgroundColor: "yellow" } },
    ]);
  });

  it("mantém links seguros e descarta protocolos perigosos", () => {
    expect(parseInlineContent("[abrir](https://x.com/a)")).toEqual([
      { type: "link", href: "https://x.com/a", content: [{ type: "text", text: "abrir", styles: {} }] },
    ]);
    expect(parseInlineContent("[t](javascript:x)")).toEqual([{ type: "text", text: "t", styles: {} }]);
  });

  it("não reprocessa o interior de código inline", () => {
    expect(parseInlineContent("veja `:::dica e ==x==` fim")).toEqual([
      { type: "text", text: "veja ", styles: {} },
      { type: "text", text: ":::dica e ==x==", styles: { code: true } },
      { type: "text", text: " fim", styles: {} },
    ]);
  });
});

describe("markdownToLessonBlocks — títulos e parágrafos", () => {
  it("mapeia # e ## para nível 2 e ### em diante para nível 3", () => {
    const blocks = markdownToLessonBlocks("# Um\n\n## Dois\n\n### Três\n\n#### Quatro");
    expect(blocks.map((b) => b.props.level)).toEqual([2, 2, 3, 3]);
    expect(blocks.every((b) => b.type === "heading")).toBe(true);
  });

  it("agrupa linhas soltas em parágrafos separados por linha em branco", () => {
    const blocks = markdownToLessonBlocks("Um.\n\nDois.\n\nTrês.");
    expect(blocks).toHaveLength(3);
    expect(blocks.every((b) => b.type === "paragraph")).toBe(true);
    expect(blocks[1].content).toEqual([{ type: "text", text: "Dois.", styles: {} }]);
  });

  it("devolve [] para entrada vazia", () => {
    expect(markdownToLessonBlocks("")).toEqual([]);
    expect(markdownToLessonBlocks("\n\n  \n")).toEqual([]);
  });
});

describe("markdownToLessonBlocks — caixas :::", () => {
  it("converte :::dica com parágrafos ao redor em blocos próprios", () => {
    const blocks = markdownToLessonBlocks("Antes.\n\n:::dica\nFaça **isso**.\n:::\n\nDepois.");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "callout", "paragraph"]);
    expect(blocks[1].props).toEqual({ variant: "dica" });
    expect(blocks[1].content).toEqual([
      { type: "text", text: "Faça ", styles: {} },
      { type: "text", text: "isso", styles: { bold: true } },
      { type: "text", text: ".", styles: {} },
    ]);
  });

  it("normaliza acento e caixa alta da variante", () => {
    const blocks = markdownToLessonBlocks(":::Atenção\nCuidado aqui.\n:::");
    expect(first(blocks, "callout").props).toEqual({ variant: "atencao" });
  });

  it("aceita :::reflexao", () => {
    const blocks = markdownToLessonBlocks(":::reflexao\nO que você faria?\n:::");
    expect(first(blocks, "callout").props).toEqual({ variant: "reflexao" });
  });

  it("omite caixa de corpo vazio", () => {
    expect(markdownToLessonBlocks(":::dica\n:::")).toEqual([]);
  });

  it("fecha a caixa implicitamente no fim do texto", () => {
    const blocks = markdownToLessonBlocks(":::dica\nSem fechar.");
    expect(first(blocks, "callout").content).toEqual([{ type: "text", text: "Sem fechar.", styles: {} }]);
  });

  it("trata palavra desconhecida como parágrafo literal", () => {
    const blocks = markdownToLessonBlocks(":::info\nconteudo\n:::");
    expect(blocks.every((b) => b.type === "paragraph")).toBe(true);
    expect(JSON.stringify(blocks)).toContain(":::info");
  });

  it("extrai o autor da citação em aspas duplas, simples ou sem aspas", () => {
    expect(first(markdownToLessonBlocks(':::citacao autor="Paulo Freire"\nNinguém educa ninguém.\n:::'), "citation").props)
      .toEqual({ author: "Paulo Freire" });
    expect(first(markdownToLessonBlocks(":::citacao autor='Fulano'\nFrase.\n:::"), "citation").props)
      .toEqual({ author: "Fulano" });
    expect(first(markdownToLessonBlocks(":::citacao\nFrase sem autor.\n:::"), "citation").props)
      .toEqual({ author: "" });
  });
});

describe("markdownToLessonBlocks — código, tabela, listas, citação", () => {
  it("preserva o bloco de código verbatim e não interpreta ::: ou == dentro", () => {
    const md = "```ts\nfunction id<T>(x: T): T {\n  return x; // :::dica ==nao==\n}\n```";
    const block = first(markdownToLessonBlocks(md), "codeBlock");
    expect(block.props).toEqual({ language: "ts" });
    expect(block.content).toEqual([
      { type: "text", text: "function id<T>(x: T): T {\n  return x; // :::dica ==nao==\n}", styles: {} },
    ]);
  });

  it("monta a tabela GFM com cabeçalho na primeira linha", () => {
    const blocks = markdownToLessonBlocks("| A | B |\n|---|---|\n| 1 | 2 |");
    const table = first(blocks, "table") as LessonContentBlock & { content: { rows: Array<{ cells: unknown[][] }> } };
    expect(table.content.rows).toHaveLength(2);
    expect(table.content.rows[0].cells).toEqual([
      [{ type: "text", text: "A", styles: {} }],
      [{ type: "text", text: "B", styles: {} }],
    ]);
    expect(table.content.rows[1].cells[1]).toEqual([{ type: "text", text: "2", styles: {} }]);
  });

  it("gera um item por linha para listas com marcador e numeradas", () => {
    const bullets = markdownToLessonBlocks("- um\n- dois");
    expect(bullets.map((b) => b.type)).toEqual(["bulletListItem", "bulletListItem"]);
    const numbered = markdownToLessonBlocks("1. primeiro\n2. segundo");
    expect(numbered.map((b) => b.type)).toEqual(["numberedListItem", "numberedListItem"]);
  });

  it("aninha itens indentados no último item de topo", () => {
    const blocks = markdownToLessonBlocks("- pai\n  - filho");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].children?.map((c) => c.content)).toEqual([[{ type: "text", text: "filho", styles: {} }]]);
  });

  it("lê o estado do checklist", () => {
    const blocks = markdownToLessonBlocks("- [x] feito\n- [ ] pendente");
    expect(blocks.map((b) => b.props.checked)).toEqual([true, false]);
    expect(blocks.every((b) => b.type === "checkListItem")).toBe(true);
  });

  it("junta linhas de citação > num bloco quote", () => {
    const blocks = markdownToLessonBlocks("> Uma citação\n> que continua");
    expect(first(blocks, "quote").content).toEqual([{ type: "text", text: "Uma citação que continua", styles: {} }]);
  });

  it("descarta réguas horizontais", () => {
    expect(markdownToLessonBlocks("Texto.\n\n---\n\nMais.").map((b) => b.type)).toEqual(["paragraph", "paragraph"]);
  });
});

describe("markdownToLessonBlocks — ids", () => {
  it("atribui ids determinísticos e únicos, inclusive em filhos", () => {
    const blocks = markdownToLessonBlocks("## Título\n\n- pai\n  - filho\n\nParágrafo.");
    const ids: string[] = [];
    const collect = (list: LessonContentBlock[]) => list.forEach((b) => {
      ids.push(b.id);
      if (b.children) collect(b.children);
    });
    collect(blocks);
    expect(ids).toEqual(["pl-0", "pl-1", "pl-2", "pl-3"]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(markdownToLessonBlocks("## Título\n\n- pai\n  - filho\n\nParágrafo.")).toEqual(blocks);
  });
});
