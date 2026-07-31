"use client";

import { usePathname } from "next/navigation";
import { Pause, Play, RotateCcw, RotateCw, X } from "lucide-react";
import { useRef } from "react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

export function GlobalMiniPlayer() {
  const pathname = usePathname();
  const {
    state: { article, isPlaying, progress, currentTime, duration, playbackRate },
    togglePlayPause,
    closePlayer,
    seekTo,
    setPlaybackRate,
    skipBackward,
    skipForward,
  } = useAudioPlayer();
  const progressBarRef = useRef<HTMLDivElement>(null);

  if (!article || pathname.startsWith("/admin") || /^\/courses\/[^/]+\/lessons/.test(pathname)) return null;

  const formatTime = (time: number) => `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, "0")}`;

  const handleProgressBarClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    seekTo(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * duration);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    setPlaybackRate(rates[(rates.indexOf(playbackRate) + 1) % rates.length]);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink text-white shadow-[0_-14px_40px_rgb(23,32,51,0.18)]">
      <div ref={progressBarRef} onClick={handleProgressBarClick} className="group relative h-1.5 cursor-pointer bg-white/15" aria-label="Progresso do áudio">
        <div className="h-full bg-accent-orange" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="editorial-container flex h-[74px] items-center gap-3 sm:gap-5">
        <div className="min-w-0 flex-1 sm:max-w-sm"><p className="truncate text-sm font-bold">{article.title}</p><p className="mt-1 hidden truncate text-xs text-white/55 sm:block">{article.author}</p></div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={skipBackward} aria-label="Voltar 15 segundos" className="hidden h-10 w-10 place-items-center rounded-[10px] text-white/65 hover:bg-white/10 hover:text-white sm:grid"><RotateCcw className="h-4 w-4" /></button>
          <button onClick={togglePlayPause} aria-label={isPlaying ? "Pausar" : "Reproduzir"} className="grid h-11 w-11 place-items-center rounded-[13px] bg-white text-ink hover:bg-primary-pale">{isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}</button>
          <button onClick={skipForward} aria-label="Avançar 15 segundos" className="hidden h-10 w-10 place-items-center rounded-[10px] text-white/65 hover:bg-white/10 hover:text-white sm:grid"><RotateCw className="h-4 w-4" /></button>
        </div>
        <div className="hidden min-w-24 text-center text-xs font-semibold tabular-nums text-white/60 md:block">{formatTime(currentTime)} / {formatTime(duration)}</div>
        <button onClick={cyclePlaybackRate} className="hidden min-h-10 rounded-[10px] bg-white/8 px-3 text-xs font-bold text-white/70 hover:bg-white/12 hover:text-white md:block">{playbackRate}x</button>
        <button onClick={closePlayer} aria-label="Fechar player" className="grid h-10 w-10 place-items-center rounded-[10px] text-white/55 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
