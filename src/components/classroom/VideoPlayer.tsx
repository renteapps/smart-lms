"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Card, Skeleton, Typography } from "@heroui/react";
import { NoteIcon } from "@/components/ui/AnimatedIcon";
import type { Lesson } from "@/types/course";

const ReactPlayer = dynamic(() => import("react-player").then((module) => module.default), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

const PandaVideoPlayer = dynamic(() => import("./PandaVideoPlayer"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

interface VideoPlayerProps {
  lesson: Lesson;
  onEnded?: () => void;
  onTimeUpdate?: (seconds: number) => void;
  /** Aula pausada — sinal melhor que o polling do timeupdate pra gravar a posição na hora. */
  onPause?: () => void;
  /** Segundo onde a aula parou da última vez — "continuar de onde parei". */
  startAt?: number;
}

export default function VideoPlayer({ lesson, onEnded, onTimeUpdate, onPause, startAt }: VideoPlayerProps) {
  if (lesson.type !== "video") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="overflow-hidden p-0">
          <Card.Content className="flex min-h-[22rem] flex-col items-center justify-center px-6 py-14 text-center">
            <span className="icon-draw grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
              <NoteIcon size={26} />
            </span>
            <h2 className="display-3 mt-6 text-foreground">{lesson.title}</h2>
            <Typography.Prose className="mt-4 max-w-[52ch] text-muted">
              <p>{lesson.content}</p>
            </Typography.Prose>
          </Card.Content>
        </Card>
      </motion.div>
    );
  }

  // Fundo escuro é intencional e permitido em mídia: a moldura some e o vídeo fica.
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-elev-4"
    >
      {lesson.pandavideoId ? (
        <PandaVideoPlayer
          embedUrl={lesson.videoUrl}
          className="size-full"
          onEnded={onEnded}
          onTimeUpdate={onTimeUpdate}
          onPause={onPause}
          startAt={startAt}
        />
      ) : (
        <ReactPlayer
          src={lesson.videoUrl}
          width="100%"
          height="100%"
          controls
          onEnded={onEnded}
          onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
          onPause={() => onPause?.()}
          onLoadedMetadata={(e) => {
            if (startAt && startAt > 0) e.currentTarget.currentTime = startAt;
          }}
        />
      )}
    </motion.div>
  );
}
