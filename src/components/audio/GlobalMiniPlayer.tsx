"use client";

import { usePathname } from "next/navigation";
import { Headphones, Pause, Play, RotateCcw, RotateCw, X } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import { AudioScrubber } from "@/components/audio/AudioScrubber";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { formatAudioDuration } from "@/lib/audioOptimization";
import { cn } from "@/lib/utils";

/**
 * Player persistente do áudio dos artigos.
 *
 * É o único elemento que acompanha a pessoa por todo o produto, sempre por cima
 * de conteúdo real — por isso é uma camada de vidro fosco com desfoque profundo
 * (`backdrop-blur-2xl` e superfície aveludada): a página por trás é suavemente
 * desfocada sem criar ruído visual, e o player se destaca com nitidez e elegância.
 * Flutua com margem e respeita a safe-area em celulares para não competir com o
 * fim da página e nem colidir com outros elementos flutuantes (como o assistente IA).
 */
export function GlobalMiniPlayer() {
  const pathname = usePathname();
  const {
    state: { article, isPlaying, currentTime, duration, playbackRate },
    togglePlayPause,
    closePlayer,
    seekTo,
    setPlaybackRate,
    skipBackward,
    skipForward,
  } = useAudioPlayer();

  if (!article || pathname.startsWith("/admin") || /^\/courses\/[^/]+\/lessons/.test(pathname)) return null;

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    setPlaybackRate(rates[(rates.indexOf(playbackRate) + 1) % rates.length]);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-5">
      <div
        className={cn(
          "editorial-container pointer-events-auto overflow-hidden rounded-2xl",
          "border border-hairline-strong bg-surface/90 shadow-elev-4 dark:bg-surface/85",
          "backdrop-blur-2xl backdrop-saturate-150 transition-all duration-[var(--duration-md)]",
        )}
        style={{
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          backdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "var(--elev-4), inset 0 1px 0 var(--material-edge)",
        }}
      >
        <div className="relative z-10 flex items-center gap-2.5 px-3 pt-3 sm:gap-4 sm:px-5 sm:pt-4">
          {/* Ícone indicativo / miniatura */}
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent sm:size-10">
            <Headphones className="size-4.5" aria-hidden="true" />
          </div>

          {/* Título e informações */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground sm:text-base">{article.title}</p>
            <p className="mt-0.5 truncate text-xs text-muted">
              <span className="sm:hidden" data-numeric>
                {formatAudioDuration(currentTime)} / {formatAudioDuration(duration)}
              </span>
              <span className="sm:hidden">{article.author ? ` · ${article.author}` : ""}</span>
              <span className="hidden sm:inline">{article.author || "Versão em áudio"}</span>
            </p>
          </div>

          {/* Controles de reprodução */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onClick={skipBackward}
              aria-label="Voltar 15 segundos"
              className="icon-rotate hidden rounded-full sm:flex"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </Button>

            <Button
              isIconOnly
              variant="primary"
              onClick={togglePlayPause}
              aria-label={isPlaying ? "Pausar" : "Reproduzir"}
              className="press size-10 rounded-full sm:size-11"
            >
              {isPlaying ? (
                <Pause className="size-5 fill-current" aria-hidden="true" />
              ) : (
                <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />
              )}
            </Button>

            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onClick={skipForward}
              aria-label="Avançar 15 segundos"
              className="icon-rotate hidden rounded-full sm:flex"
            >
              <RotateCw className="size-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Tempo no desktop */}
          <p className="hidden min-w-24 text-center text-xs font-semibold text-muted md:block" data-numeric>
            {formatAudioDuration(currentTime)} / {formatAudioDuration(duration)}
          </p>

          {/* Velocidade */}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button
                variant="ghost"
                size="sm"
                onClick={cyclePlaybackRate}
                aria-label={`Velocidade de reprodução: ${playbackRate}x. Alternar.`}
                className="hidden rounded-full font-bold md:flex"
              >
                <span data-numeric>{playbackRate}x</span>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Velocidade de reprodução</Tooltip.Content>
          </Tooltip.Root>

          {/* Fechar player */}
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            onClick={closePlayer}
            aria-label="Fechar player"
            className="shrink-0 rounded-full"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {/*
          Faixa de progresso / forma de onda:
          Área de busca interativa e precisa com teclado e arrasto tátil.
        */}
        <div className="relative z-10 px-3 pb-2.5 pt-1 sm:px-5 sm:pb-3">
          <AudioScrubber
            currentTime={currentTime}
            duration={duration}
            onSeek={seekTo}
            peaks={article.audio?.peaks}
            size="sm"
            label={`Posição do áudio de ${article.title}`}
          />
        </div>
      </div>
    </div>
  );
}
