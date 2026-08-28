"use client";

import { usePathname } from "next/navigation";
import { Pause, Play, RotateCcw, RotateCw, X } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import { AudioScrubber } from "@/components/audio/AudioScrubber";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { formatAudioDuration } from "@/lib/audioOptimization";

/**
 * Player persistente do áudio dos artigos.
 *
 * É o único elemento que acompanha a pessoa por todo o produto, sempre por cima
 * de conteúdo real — por isso é vidro (`.liquid-glass`) e não uma barra opaca: a
 * página continua legível atrás dele e o player se lê como uma camada, não como
 * um rodapé que roubou espaço. Flutua com margem em vez de colar na borda para
 * não competir com o fim da página — é a mesma peça de vidro do menu, na outra
 * ponta da tela.
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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="editorial-container pointer-events-auto liquid-glass overflow-hidden rounded-2xl">
        <div className="relative z-10 flex items-center gap-3 px-3 pt-3 sm:gap-5 sm:px-5 sm:pt-4">
          <div className="min-w-0 flex-1 sm:max-w-sm">
            <p className="truncate text-sm font-bold text-foreground">{article.title}</p>
            <p className="mt-0.5 hidden truncate text-xs text-muted sm:block">{article.author}</p>
          </div>

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
              className="press size-11 rounded-full"
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

          <p className="hidden min-w-24 text-center text-xs font-semibold text-muted md:block" data-numeric>
            {formatAudioDuration(currentTime)} / {formatAudioDuration(duration)}
          </p>

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
          A faixa de progresso é também a área de busca — mesmo controle da
          página do artigo, então a onda, o teclado e o arrasto se comportam
          igual nos dois lugares.
        */}
        <div className="relative z-10 mx-3 py-2 sm:mx-5">
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
