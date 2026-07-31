"use client";

import dynamic from "next/dynamic";
import { FileText } from "lucide-react";
import type { Lesson } from "@/lib/mockData";

const ReactPlayer = dynamic(() => import("react-player").then((module) => module.default), { ssr: false });

interface VideoPlayerProps {
  lesson: Lesson;
  onEnded?: () => void;
}

export default function VideoPlayer({ lesson, onEnded }: VideoPlayerProps) {
  if (lesson.type !== "video") {
    return (
      <div className="editorial-card flex aspect-video w-full items-center justify-center">
        <div className="max-w-md p-8 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-primary-pale text-primary"><FileText className="h-6 w-6" /></span><h2 className="mt-5 text-2xl font-extrabold text-ink">{lesson.title}</h2><p className="mt-3 leading-7 text-text-soft">{lesson.content}</p></div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[10px] bg-black shadow-[0_20px_55px_rgb(23,32,51,0.18)]">
      <ReactPlayer src={lesson.videoUrl} width="100%" height="100%" controls onEnded={onEnded} />
    </div>
  );
}
