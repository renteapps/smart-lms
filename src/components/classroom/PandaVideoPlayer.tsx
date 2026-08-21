"use client";

import { useEffect, useRef } from "react";
import { PlayCircle } from "lucide-react";

interface PandaVideoPlayerProps {
  /** URL de embed retornada pela API de vídeos do PandaVideo (`video_player`). */
  embedUrl?: string;
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (seconds: number) => void;
  /** Disparado no evento `panda_pause` — usado para gravar a posição na hora, sem esperar o próximo timeupdate. */
  onPause?: () => void;
  /** Segundo onde a aula parou da última vez — o player pula para cá assim que puder aceitar o comando de seek. */
  startAt?: number;
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
export default function PandaVideoPlayer({ embedUrl, className, onEnded, onTimeUpdate, onPause, startAt }: PandaVideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const callbacksRef = useRef({ onEnded, onTimeUpdate, onPause, startAt });
  callbacksRef.current = { onEnded, onTimeUpdate, onPause, startAt };
  /** Só pula uma vez por vídeo carregado — `panda_ready` e `panda_canplay` podem chegar os dois. */
  const seekedRef = useRef(false);

  useEffect(() => {
    if (!embedUrl) return;
    seekedRef.current = false;
    const embedOrigin = new URL(embedUrl).origin;

    function handleMessage(event: MessageEvent) {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data as { message?: string; currentTime?: number } | undefined;
      if (!data || typeof data !== "object") return;

      if (data.message === "panda_ended") {
        callbacksRef.current.onEnded?.();
      } else if (data.message === "panda_timeupdate" && typeof data.currentTime === "number") {
        callbacksRef.current.onTimeUpdate?.(data.currentTime);
      } else if (data.message === "panda_pause") {
        callbacksRef.current.onPause?.();
      } else if (
        (data.message === "panda_ready" || data.message === "panda_canplay")
        && !seekedRef.current
        && callbacksRef.current.startAt
        && callbacksRef.current.startAt > 0
      ) {
        seekedRef.current = true;
        iframeRef.current.contentWindow?.postMessage(
          { type: "currentTime", parameter: callbacksRef.current.startAt },
          embedOrigin,
        );
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
