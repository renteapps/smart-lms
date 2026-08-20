"use client";

import { useEffect, useRef } from "react";
import { PlayCircle } from "lucide-react";

interface PandaVideoPlayerProps {
  /** URL de embed retornada pela API de vídeos do PandaVideo (`video_player`). */
  embedUrl?: string;
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (seconds: number) => void;
}

/**
 * Player do PandaVideo via iframe + eventos por `postMessage`.
 * https://docs.pandavideo.com/reference/receive-events
 *
 * A API JS (`PandaPlayer`) exige `library_id` (pullzone) além do `video_id`,
 * e não temos como derivar o pullzone com segurança a partir do id do vídeo.
 * A própria doc do Panda expõe os eventos do player por `window.postMessage`
 * independente de como o iframe foi criado — então ouvimos a mensagem
 * diretamente na URL de embed que a API de vídeos já devolve pronta
 * (`video.video_player`), sem precisar instanciar o SDK.
 */
export default function PandaVideoPlayer({ embedUrl, className, onEnded, onTimeUpdate }: PandaVideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const callbacksRef = useRef({ onEnded, onTimeUpdate });
  callbacksRef.current = { onEnded, onTimeUpdate };

  useEffect(() => {
    if (!embedUrl) return;

    function handleMessage(event: MessageEvent) {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data as { message?: string; currentTime?: number } | undefined;
      if (!data || typeof data !== "object") return;

      if (data.message === "panda_ended") {
        callbacksRef.current.onEnded?.();
      } else if (data.message === "panda_timeupdate" && typeof data.currentTime === "number") {
        callbacksRef.current.onTimeUpdate?.(data.currentTime);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [embedUrl]);

  if (!embedUrl) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-black/90 text-center text-sm text-white/70 ${className ?? ""}`}>
        <PlayCircle className="size-8 opacity-60" />
        Selecione um vídeo da biblioteca PandaVideo.
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={embedUrl}
      className={className}
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
      title="Vídeo PandaVideo"
    />
  );
}
