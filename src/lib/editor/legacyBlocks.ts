import { BlockNoteEditor } from "@blocknote/core";
import type { ContentBlock } from "@/types/course";
import { extractYouTubeId } from "@/lib/editor/youtube";
import { lessonSchema, type PartialLessonBlock } from "./blockSchema";

/**
 * Converte aulas salvas no editor antigo (blocos com `content` em HTML do
 * Tiptap) para o schema novo do BlockNote.
 *
 * Um bloco novo sempre tem `props`; um bloco antigo nunca tem — é o jeito
 * mais barato de diferenciar os dois formatos sem guardar uma versão.
 */
export function isLegacyBlock(block: unknown): block is ContentBlock {
  return !!block && typeof block === "object" && !("props" in (block as Record<string, unknown>));
}

let htmlParser: BlockNoteEditor<any, any, any> | null = null;

/** Editor headless (nunca montado no DOM) usado só para reaproveitar o parser HTML→blocos do BlockNote. */
function getHtmlParser() {
  if (!htmlParser) {
    htmlParser = BlockNoteEditor.create({ schema: lessonSchema });
  }
  return htmlParser;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

/** Preserva negrito/itálico/link/cor ao migrar HTML do Tiptap para conteúdo inline do BlockNote. */
function htmlToInlineContent(html: string): PartialLessonBlock["content"] {
  if (!html?.trim()) return "";
  try {
    const [parsed] = getHtmlParser().tryParseHTMLToBlocks(`<p>${html}</p>`);
    return (parsed?.content as PartialLessonBlock["content"]) ?? stripHtml(html);
  } catch {
    return stripHtml(html);
  }
}

export function convertLegacyBlock(block: ContentBlock): PartialLessonBlock | null {
  switch (block.type) {
    case "h1":
      return { type: "heading", props: { level: 1 }, content: htmlToInlineContent(block.content) } as PartialLessonBlock;
    case "h2":
      return { type: "heading", props: { level: 2 }, content: htmlToInlineContent(block.content) } as PartialLessonBlock;
    case "video": {
      const url: string = block.metadata?.url ?? "";
      const youtubeId = extractYouTubeId(url);
      return {
        type: "lessonVideo",
        props: {
          provider: youtubeId ? "youtube" : "url",
          videoId: youtubeId ?? "",
          url,
          caption: stripHtml(block.content),
        },
      } as PartialLessonBlock;
    }
    case "quiz":
      return {
        type: "quiz",
        props: {
          question: stripHtml(block.content),
          options: JSON.stringify(block.metadata?.options ?? ["", "", "", ""]),
          correctAnswer: block.metadata?.correctAnswer ?? 0,
          explanation: "",
        },
      } as PartialLessonBlock;
    case "reflexao":
      return { type: "callout", props: { variant: "reflexao" }, content: htmlToInlineContent(block.content) } as PartialLessonBlock;
    case "citacao":
      return {
        type: "citation",
        props: { author: block.metadata?.author ?? "" },
        content: htmlToInlineContent(block.content),
      } as PartialLessonBlock;
    case "table": {
      const tableData: string[][] = block.metadata?.tableData ?? [];
      if (tableData.length === 0) return null;
      return {
        type: "table",
        content: { type: "tableContent", rows: tableData.map((row) => ({ cells: row })) },
      } as unknown as PartialLessonBlock;
    }
    case "paragraph":
    default:
      return { type: "paragraph", content: htmlToInlineContent(block.content) } as PartialLessonBlock;
  }
}

export function convertLegacyBlocks(blocks: ContentBlock[]): PartialLessonBlock[] {
  return blocks.map(convertLegacyBlock).filter((block): block is PartialLessonBlock => block !== null);
}
