"use client";

import { Play } from "lucide-react";
import { Lesson } from "@/lib/mockData";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false }) as any;

interface VideoPlayerProps {
  lesson: Lesson;
  onEnded?: () => void;
}

export default function VideoPlayer({ lesson, onEnded }: VideoPlayerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (lesson.type !== "video") {
    return (
      <div className="w-full aspect-video bg-surface-card rounded-xl border border-border flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold mb-4">{lesson.title}</h2>
          <p className="text-text-soft">{lesson.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative group shadow-lg">
      {!isMounted ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="w-16 h-16 text-white/50" />
        </div>
      ) : (
        <ReactPlayer
          url={lesson.videoUrl}
          width="100%"
          height="100%"
          controls={true}
          onEnded={onEnded}
        />
      )}
    </div>
  );
}
