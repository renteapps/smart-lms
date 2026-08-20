import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { LessonVideoBlock } from "@/components/admin/editor/blocknote/VideoBlock";
import { QuizBlock } from "@/components/admin/editor/blocknote/QuizBlock";
import { CalloutBlock } from "@/components/admin/editor/blocknote/CalloutBlock";
import { CitationBlock } from "@/components/admin/editor/blocknote/CitationBlock";

// O bloco `video` padrão do BlockNote só sabe tocar arquivo direto (<video src>),
// sem noção de YouTube/PandaVideo — substituímos por `lessonVideo`.
const { video: _defaultVideo, ...restDefaultBlockSpecs } = defaultBlockSpecs;

export const lessonSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...restDefaultBlockSpecs,
    lessonVideo: LessonVideoBlock(),
    quiz: QuizBlock(),
    callout: CalloutBlock(),
    citation: CitationBlock(),
  },
});

export type LessonBlock = typeof lessonSchema.Block;
export type PartialLessonBlock = typeof lessonSchema.PartialBlock;
