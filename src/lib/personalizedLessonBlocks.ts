import type { LessonContentBlock } from "@/types/course";

/**
 * Converte o Markdown enriquecido (já saneado por `sanitizeGeneratedMarkdown`) que a
 * IA devolve para uma aula personalizada em blocos do `BlockViewer` — o mesmo
 * renderizador das aulas normais.
 *
 * O vocabulário aceito é texto puro de propósito (o modelo não gera JSON de bloco
 * de forma confiável, e o saneador remove qualquer HTML):
 *
 * - `## ` / `### ` títulos · `**negrito**` · `*itálico*` · `` `código` `` · `~~tachado~~`
 * - listas `- ` / `1. ` / `- [ ]` · tabelas GFM `|` · `> ` citação · blocos de código cercados
 * - `==frase==`                         → grifo (marca-texto) da frase-chave
 * - `:::dica` / `:::atencao` / `:::reflexao` … `:::`  → caixa de destaque
 * - `:::citacao autor="Nome"` … `:::`   → citação com autor
 *
 * Nada fora dessa lista é emitido: o conversor degrada para parágrafo/texto puro.
 */

const CALLOUT_VARIANTS = new Set(["dica", "atencao", "reflexao"]);
const KNOWN_HIGHLIGHT = "yellow";
const SAFE_LINK = /^(https?:|mailto:|\/|#|\.\/|\.\.\/)/i;

export type InlineStyle = {
  bold?: true;
  italic?: true;
  underline?: true;
  strike?: true;
  code?: true;
  textColor?: string;
  backgroundColor?: string;
};

type TextNode = { type: "text"; text: string; styles: InlineStyle };
type LinkNode = { type: "link"; href: string; content: TextNode[] };
export type InlineNode = TextNode | LinkNode;

type Draft = Omit<LessonContentBlock, "id" | "children"> & { children?: Draft[] };

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

function text(value: string, styles: InlineStyle = {}): TextNode {
  return { type: "text", text: value, styles };
}

/** Mescla um estilo em todos os nós de texto (usado por `**`, `*`, `~~`). */
function withStyle(nodes: InlineNode[], extra: InlineStyle): InlineNode[] {
  return nodes.map((node) => {
    if (node.type === "link") {
      return { ...node, content: node.content.map((child) => text(child.text, { ...child.styles, ...extra })) };
    }
    return text(node.text, { ...node.styles, ...extra });
  });
}

// Grupos: 1 código · 2 texto do link · 3 url · 4 negrito · 5 grifo · 6 tachado ·
// 7 delimitador do itálico · 8 conteúdo do itálico.
const INLINE_SOURCE = [
  "`([^`\\n]+)`",
  "\\[([^\\]]+)\\]\\(([^)\\s]+)\\)",
  "\\*\\*([^\\n]+?)\\*\\*",
  "==(?!\\s)([^=\\n]+?)(?<!\\s)==",
  "~~(?!\\s)([^~\\n]+?)(?<!\\s)~~",
  "(\\*|_)(?!\\s)([^*_\\n]+?)(?<!\\s)\\7",
].join("|");

/**
 * Tokeniza um trecho de texto em nós inline no formato consumido pelo
 * `InlineContent` do `BlockViewer`. Uma passada só; precedência na ordem do
 * `INLINE_SOURCE` (código → link → negrito → grifo → tachado → itálico).
 *
 * Cria um `RegExp` novo a cada chamada de propósito: a função é recursiva e um
 * regex `/g/` compartilhado teria o `lastIndex` corrompido pela recursão.
 */
export function parseInlineContent(input: string): InlineNode[] {
  const value = input.replace(/\s+/g, " ");
  if (!value) return [];

  const pattern = new RegExp(INLINE_SOURCE, "g");
  const nodes: InlineNode[] = [];
  let cursor = 0;

  for (let match = pattern.exec(value); match; match = pattern.exec(value)) {
    if (match.index > cursor) nodes.push(text(value.slice(cursor, match.index)));

    const [, code, linkText, linkUrl, bold, highlight, strike, , italic] = match;
    if (code !== undefined) {
      nodes.push(text(code, { code: true }));
    } else if (linkText !== undefined) {
      if (SAFE_LINK.test(linkUrl)) {
        nodes.push({ type: "link", href: linkUrl, content: flattenText(parseInlineContent(linkText)) });
      } else {
        nodes.push(...parseInlineContent(linkText));
      }
    } else if (bold !== undefined) {
      nodes.push(...withStyle(parseInlineContent(bold), { bold: true }));
    } else if (highlight !== undefined) {
      nodes.push(text(highlight, { backgroundColor: KNOWN_HIGHLIGHT }));
    } else if (strike !== undefined) {
      nodes.push(...withStyle(parseInlineContent(strike), { strike: true }));
    } else if (italic !== undefined) {
      nodes.push(...withStyle(parseInlineContent(italic), { italic: true }));
    }
    cursor = pattern.lastIndex;
  }

  if (cursor < value.length) nodes.push(text(value.slice(cursor)));
  return mergeAdjacentText(nodes);
}

/** Links não aninham outros links — achata para nós de texto. */
function flattenText(nodes: InlineNode[]): TextNode[] {
  return nodes.flatMap((node) => (node.type === "link" ? node.content : [node]));
}

function sameStyles(a: InlineStyle, b: InlineStyle): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if (a[key as keyof InlineStyle] !== b[key as keyof InlineStyle]) return false;
  return true;
}

function mergeAdjacentText(nodes: InlineNode[]): InlineNode[] {
  const merged: InlineNode[] = [];
  for (const node of nodes) {
    const last = merged[merged.length - 1];
    if (node.type === "text" && last?.type === "text" && sameStyles(last.styles, node.styles)) {
      last.text += node.text;
    } else {
      merged.push(node);
    }
  }
  return merged.filter((node) => node.type === "link" || node.text !== "");
}

/** Junta várias linhas num único array inline (para corpo de callout/citação). */
function inlineFromLines(lines: string[]): InlineNode[] {
  return parseInlineContent(lines.map((line) => line.trim()).filter(Boolean).join(" "));
}

// ---------------------------------------------------------------------------
// Blocos
// ---------------------------------------------------------------------------

const FENCE_CODE = /^(```|~~~)[ \t]*([\w-]*)[ \t]*$/;
const FENCE_OPEN = /^:::[ \t]*([A-Za-zÀ-ÿ]+)[ \t]*(.*)$/;
const FENCE_CLOSE = /^:::[ \t]*$/;
const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/;
const QUOTE = /^>[ \t]?(.*)$/;
const HR = /^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/;
const TABLE_DIVIDER = /^[ \t]*\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)+\|?[ \t]*$/;
const CHECK_ITEM = /^([ \t]*)[-*+][ \t]+\[([ xX])\][ \t]+(.*)$/;
const BULLET_ITEM = /^([ \t]*)[-*+][ \t]+(.*)$/;
const NUMBER_ITEM = /^([ \t]*)\d+[.)][ \t]+(.*)$/;
const AUTHOR_ATTR = /autor[ \t]*=[ \t]*(?:"([^"]*)"|'([^']*)'|(\S+))/i;

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Divide uma linha de tabela em células, respeitando `\|`. */
function splitTableRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\\" && line[i + 1] === "|") {
      current += "|";
      i += 1;
    } else if (char === "|") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  if (cells[0].trim() === "") cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
  return cells.map((cell) => cell.trim());
}

export function markdownToLessonBlocks(markdown: string): LessonContentBlock[] {
  const lines = (markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: Draft[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const content = inlineFromLines(paragraph);
    paragraph = [];
    if (content.length) blocks.push({ type: "paragraph", props: {}, content });
  };

  const appendListItem = (block: Draft, indent: number) => {
    const parent = indent >= 2 ? lastListItem(blocks) : null;
    if (parent) (parent.children ??= []).push(block);
    else blocks.push(block);
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // 1. Bloco de código cercado — conteúdo verbatim, `:::`/`==` não interpretados.
    const codeFence = line.match(FENCE_CODE);
    if (codeFence) {
      flushParagraph();
      const marker = codeFence[1];
      const language = codeFence[2];
      const body: string[] = [];
      i += 1;
      for (; i < lines.length && lines[i].trimEnd() !== marker; i += 1) body.push(lines[i]);
      blocks.push({
        type: "codeBlock",
        props: language ? { language } : {},
        content: [text(body.join("\n"))],
      });
      continue;
    }

    // 2. Caixa `:::variante` … `:::`
    const fenceOpen = line.match(FENCE_OPEN);
    if (fenceOpen) {
      const keyword = stripAccents(fenceOpen[1]);
      const isCallout = CALLOUT_VARIANTS.has(keyword);
      const isCitation = keyword === "citacao";
      if (isCallout || isCitation) {
        flushParagraph();
        const body: string[] = [];
        const firstLine = fenceOpen[2].trim();
        if (isCallout && firstLine) body.push(firstLine);
        let insideCode = false;
        i += 1;
        for (; i < lines.length; i += 1) {
          const inner = lines[i];
          if (!insideCode && FENCE_CLOSE.test(inner)) break;
          if (FENCE_CODE.test(inner)) insideCode = !insideCode;
          body.push(inner);
        }
        const content = inlineFromLines(body);
        if (content.length) {
          if (isCallout) {
            blocks.push({ type: "callout", props: { variant: keyword }, content });
          } else {
            const author = firstLine.match(AUTHOR_ATTR);
            blocks.push({
              type: "citation",
              props: { author: (author?.[1] ?? author?.[2] ?? author?.[3] ?? "").trim() },
              content,
            });
          }
        }
        continue;
      }
      // Palavra desconhecida: não é uma caixa, cai para parágrafo.
    }

    // 3. Título ATX — `#`/`##` → nível 2, `###`+ → nível 3 (nunca nível 1).
    const heading = line.match(HEADING);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: "heading",
        props: { level: heading[1].length <= 2 ? 2 : 3 },
        content: parseInlineContent(heading[2]),
      });
      continue;
    }

    // 4. Régua — descartada (não há `hr` no BlockViewer).
    if (HR.test(line)) {
      flushParagraph();
      continue;
    }

    // 5. Tabela GFM — linha com `|` seguida de linha delimitadora.
    if (line.includes("|") && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      flushParagraph();
      const rows: Array<{ cells: InlineNode[][] }> = [
        { cells: splitTableRow(line).map(parseInlineContent) },
      ];
      i += 2;
      for (; i < lines.length && lines[i].includes("|") && lines[i].trim() !== ""; i += 1) {
        rows.push({ cells: splitTableRow(lines[i]).map(parseInlineContent) });
      }
      i -= 1;
      blocks.push({ type: "table", props: {}, content: { rows } });
      continue;
    }

    // 6. Citação `>` — linhas consecutivas.
    if (QUOTE.test(line)) {
      flushParagraph();
      const body: string[] = [];
      for (; i < lines.length; i += 1) {
        const quoted = lines[i].match(QUOTE);
        if (!quoted) break;
        body.push(quoted[1]);
      }
      i -= 1;
      blocks.push({ type: "quote", props: {}, content: inlineFromLines(body) });
      continue;
    }

    // 7. Listas — checklist antes de bullet; indentação ≥ 2 → filho do último item.
    const checkItem = line.match(CHECK_ITEM);
    if (checkItem) {
      flushParagraph();
      appendListItem(
        {
          type: "checkListItem",
          props: { checked: checkItem[2].toLowerCase() === "x" },
          content: parseInlineContent(checkItem[3]),
        },
        checkItem[1].replace(/\t/g, "  ").length,
      );
      continue;
    }
    const bulletItem = line.match(BULLET_ITEM);
    if (bulletItem) {
      flushParagraph();
      appendListItem(
        { type: "bulletListItem", props: {}, content: parseInlineContent(bulletItem[2]) },
        bulletItem[1].replace(/\t/g, "  ").length,
      );
      continue;
    }
    const numberItem = line.match(NUMBER_ITEM);
    if (numberItem) {
      flushParagraph();
      appendListItem(
        { type: "numberedListItem", props: {}, content: parseInlineContent(numberItem[2]) },
        numberItem[1].replace(/\t/g, "  ").length,
      );
      continue;
    }

    // 8. Linha em branco fecha o parágrafo.
    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    // 9. Fallback: acumula no parágrafo corrente.
    paragraph.push(line);
  }

  flushParagraph();
  return assignIds(blocks);
}

function lastListItem(blocks: Draft[]): Draft | null {
  const last = blocks[blocks.length - 1];
  return last && /ListItem$/.test(last.type) ? last : null;
}

/** Ids determinísticos (`pl-0`, `pl-1`, …) — mesmo Markdown ⇒ mesmos blocos. */
function assignIds(blocks: Draft[]): LessonContentBlock[] {
  let counter = 0;
  const walk = (list: Draft[]): LessonContentBlock[] =>
    list.map(({ children, ...rest }) => {
      const id = `pl-${counter++}`;
      const kids = children?.length ? walk(children) : undefined;
      return kids ? { id, ...rest, children: kids } : { id, ...rest };
    });
  return walk(blocks);
}
