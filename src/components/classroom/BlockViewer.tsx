"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { lessonSchema, type PartialLessonBlock } from "@/lib/editor/blockSchema";
import { convertLegacyBlocks, isLegacyBlock } from "@/lib/editor/legacyBlocks";
import { lessonEditorTheme } from "@/lib/editor/theme";
import type { ContentBlock, LessonContentBlock } from "@/types/course";

interface BlockViewerProps {
  blocks: LessonContentBlock[] | ContentBlock[];
}

/**
 * Renderiza o conteúdo editorial de uma aula em modo leitura.
 *
 * Reaproveita o próprio BlockNote (mesmo schema do editor) em vez de um
 * renderer paralelo: os blocos de vídeo e quiz ficam interativos (o quiz
 * troca para o modo de resposta quando `editable=false`) sem duplicar a
 * lógica de cada tipo de bloco em dois lugares.
 */
export default function BlockViewer({ blocks }: BlockViewerProps) {
  const content: PartialLessonBlock[] = !blocks || blocks.length === 0
    ? []
    : isLegacyBlock(blocks[0])
      ? convertLegacyBlocks(blocks as ContentBlock[])
      : (blocks as unknown as PartialLessonBlock[]);

  const editor = useCreateBlockNote(
    {
      schema: lessonSchema,
      initialContent: content.length > 0 ? content : undefined,
    },
    [blocks],
  );

  if (content.length === 0) {
    return null;
  }

  return (
    <div className="block-viewer">
      <BlockNoteView editor={editor} editable={false} theme={lessonEditorTheme} />
    </div>
  );
}
