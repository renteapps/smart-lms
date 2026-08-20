"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useMemo } from "react";
import {
  useCreateBlockNote,
  useEditorChange,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  BlockNoteContext,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import { pt } from "@blocknote/core/locales";
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

/**
 * O admin não tem tema escuro: `AdminShell` sempre monta `.admin-theme`, e não
 * existe toggle de tema no app. Sem isto o BlockNote seguia o
 * `prefers-color-scheme` do sistema operacional e aparecia preto no meio de um
 * formulário branco.
 */
const LIGHT_ONLY = { colorSchemePreference: "light" } as const;

/** Itens do menu "/" para os blocos de aula que não existem no BlockNote padrão. */
function customSlashMenuItems(editor: LessonEditor): DefaultReactSuggestionItem[] {
  return [
    {
      title: "Vídeo da aula",
      subtext: "YouTube ou PandaVideo",
      aliases: ["video", "vídeo", "youtube", "panda", "pandavideo", "aula"],
      group: "Aula",
      icon: <Film className="size-4.5" aria-hidden="true" />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "lessonVideo" } as PartialLessonBlock),
    },
    {
      title: "Quiz",
      subtext: "Pergunta de múltipla escolha",
      aliases: ["quiz", "pergunta", "questionario", "questionário", "exercicio", "exercício"],
      group: "Aula",
      icon: <HelpCircle className="size-4.5" aria-hidden="true" />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "quiz" } as PartialLessonBlock),
    },
    {
      title: "Destaque",
      subtext: "Reflexão, dica ou atenção",
      aliases: ["destaque", "callout", "reflexao", "reflexão", "dica", "atencao", "atenção", "aviso"],
      group: "Aula",
      icon: <Lightbulb className="size-4.5" aria-hidden="true" />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "callout" } as PartialLessonBlock),
    },
    {
      // "Citação" sozinho colidia com o bloco `quote` nativo, que o menu já
      // traduz como "Citação" — dois itens com o mesmo nome e comportamentos
      // diferentes. O nome aqui diz o que este tem a mais: o campo de autor.
      title: "Citação com autor",
      subtext: "Trecho destacado com crédito",
      aliases: ["citacao", "citação", "autor", "frase", "epigrafe", "epígrafe"],
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
    dictionary: pt,
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
    uploadFile: async (file: File) => {
      const { publicUrl } = await uploadImageToStorage(createClient(), { file, folder: "lessons" });
      return publicUrl;
    },
  });

  useEditorChange((changedEditor) => onChange(changedEditor.document as unknown as LessonContentBlock[]), editor);

  return (
    <BlockNoteContext.Provider value={LIGHT_ONLY}>
      <BlockNoteView editor={editor} theme={lessonEditorTheme} slashMenu={false} className="lesson-editor">
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            // Os blocos de aula vêm primeiro: são o motivo de existir este editor,
            // e enterrá-los abaixo de títulos e listas escondia justamente o que
            // o autor da aula mais usa.
            filterSuggestionItems(
              [...customSlashMenuItems(editor), ...getDefaultReactSlashMenuItems(editor)],
              query,
            )
          }
        />
      </BlockNoteView>
    </BlockNoteContext.Provider>
  );
}
