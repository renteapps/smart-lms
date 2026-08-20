"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useMemo } from "react";
import {
  useCreateBlockNote,
  useEditorChange,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import { Film, HelpCircle, Lightbulb, Quote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadImageToStorage } from "@/lib/imageOptimization";
import { lessonSchema, type PartialLessonBlock } from "@/lib/editor/blockSchema";
import { convertLegacyBlocks, isLegacyBlock } from "@/lib/editor/legacyBlocks";
import { lessonEditorTheme } from "@/lib/editor/theme";
import type { ContentBlock, LessonContentBlock } from "@/types/course";

type LessonEditor = ReturnType<typeof useCreateBlockNote<{ schema: typeof lessonSchema }>>;

interface LessonBlockEditorProps {
  initialBlocks?: LessonContentBlock[] | ContentBlock[];
  onChange: (blocks: LessonContentBlock[]) => void;
}

/** Itens extras do menu "/" para os blocos de aula que não existem no BlockNote padrão. */
function customSlashMenuItems(editor: LessonEditor): DefaultReactSuggestionItem[] {
  return [
    {
      title: "Vídeo da aula",
      subtext: "YouTube ou PandaVideo",
      aliases: ["video", "youtube", "panda", "pandavideo"],
      group: "Aula",
      icon: <Film className="size-4.5" aria-hidden="true" />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "lessonVideo" } as PartialLessonBlock),
    },
    {
      title: "Quiz",
      subtext: "Pergunta de múltipla escolha",
      aliases: ["quiz", "pergunta", "questionario"],
      group: "Aula",
      icon: <HelpCircle className="size-4.5" aria-hidden="true" />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "quiz" } as PartialLessonBlock),
    },
    {
      title: "Destaque",
      subtext: "Reflexão, dica ou atenção",
      aliases: ["callout", "reflexao", "dica", "atencao"],
      group: "Aula",
      icon: <Lightbulb className="size-4.5" aria-hidden="true" />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "callout" } as PartialLessonBlock),
    },
    {
      title: "Citação",
      subtext: "Trecho destacado com autor",
      aliases: ["citacao", "quote"],
      group: "Aula",
      icon: <Quote className="size-4.5" aria-hidden="true" />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "citation" } as PartialLessonBlock),
    },
  ];
}

export default function LessonBlockEditor({ initialBlocks, onChange }: LessonBlockEditorProps) {
  const initialContent = useMemo<PartialLessonBlock[] | undefined>(() => {
    if (!initialBlocks || initialBlocks.length === 0) return undefined;
    return isLegacyBlock(initialBlocks[0])
      ? convertLegacyBlocks(initialBlocks as ContentBlock[])
      : (initialBlocks as unknown as PartialLessonBlock[]);
    // Só roda uma vez: `useCreateBlockNote` também só lê `initialContent` na criação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editor = useCreateBlockNote({
    schema: lessonSchema,
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
    uploadFile: async (file: File) => {
      const { publicUrl } = await uploadImageToStorage(createClient(), { file, folder: "lessons" });
      return publicUrl;
    },
  });

  useEditorChange((changedEditor) => onChange(changedEditor.document as unknown as LessonContentBlock[]), editor);

  return (
    <BlockNoteView editor={editor} theme={lessonEditorTheme} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems([...getDefaultReactSlashMenuItems(editor), ...customSlashMenuItems(editor)], query)
        }
      />
    </BlockNoteView>
  );
}
