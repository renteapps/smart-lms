"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Headphones, Pause, Play, RotateCcw, RotateCw, X } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import { AudioScrubber } from "@/components/audio/AudioScrubber";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { formatAudioDuration } from "@/lib/audioOptimization";
import { cn } from "@/lib/utils";
import type { Article } from "@/types/blog";

/**
 * Precisa casar com `--duration-md`, usado na saída: é o tempo que o nó fica
 * montado depois de mandado embora, só para a transição ter onde acontecer.
 */
const EXIT_MS = 240;

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
    audioRef,
  } = useAudioPlayer();

  const isHiddenRoute = pathname.startsWith("/admin") || /^\/courses\/[^/]+\/lessons/.test(pathname);
  const shouldShow = Boolean(article) && !isHiddenRoute;

  /*
   * `closePlayer()` zera o artigo no contexto na mesma hora — e é o certo, o som
   * tem de parar imediatamente. Só que isso desmontava o painel junto, e sem nó
   * na árvore não existe transição de saída. Daí a cópia local: o player segura
   * o último artigo o tempo da animação e só então larga.
   */
  const [rendered, setRendered] = useState<Article | null>(null);
  const [hasEntered, setHasEntered] = useState(false);

  // Ajuste de estado durante o render — o padrão que o React documenta para
  // estado derivado de props. Ele descarta este render e refaz na hora, sem
  // pintar o intermediário; num efeito isso viraria um segundo passe visível.
  if (shouldShow && article && article !== rendered) {
    setRendered(article);
  }

  // `hasEntered` existe só para o primeiro quadro: o painel precisa ser pintado
  // fechado uma vez antes de abrir, senão não há de onde animar. Na saída não é
  // preciso estado nenhum — `shouldShow` já caiu.
  const isOpen = shouldShow && hasEntered;

  useEffect(() => {
    if (shouldShow) {
      // Dois quadros: o primeiro pinta o painel fechado, o segundo abre. Com um
      // só, as duas mudanças podem cair no mesmo commit e a peça nasce aberta.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setHasEntered(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    const timer = setTimeout(() => {
      setRendered(null);
      setHasEntered(false);
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [shouldShow]);

  if (!rendered) return null;

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    setPlaybackRate(rates[(rates.indexOf(playbackRate) + 1) % rates.length]);
  };

  return (
    /*
      A entrada usa `--spring` e a saída `--ease-precise`, de propósito. A mola
      passa de 1 antes de assentar, e num painel ancorado na borda inferior esse
      overshoot mínimo é o que faz a peça parecer que encaixou; na saída ele
      leria como defeito. Dispensar também deve ser mais rápido que chegar.

      A transformação fica no invólucro externo, não no painel: a altura daqui
      inclui o respiro de baixo, então `translate-y-full` leva a peça inteira
      para fora sem deixar sobra na borda.
    */
    <div
      inert={!isOpen}
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-5",
        "transition-[transform,opacity]",
        isOpen
          ? "translate-y-0 opacity-100 duration-[var(--duration-lg)] ease-[var(--spring)]"
          : "translate-y-full opacity-0 duration-[var(--duration-md)] ease-[var(--ease-precise)]",
      )}
    >
      <div
        className={cn(
          "editorial-container pointer-events-auto overflow-hidden rounded-2xl",
          "border border-hairline-strong bg-surface/90 shadow-elev-4 dark:bg-surface/85",
          // `transition-all` aqui repintava também o desfoque a cada mudança de
          // estado, e design.md §9 o proíbe: só cor e sombra precisam transitar.
          "backdrop-blur-2xl backdrop-saturate-150",
          "transition-[background-color,box-shadow] duration-[var(--duration-md)]",
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
            <p className="truncate text-sm font-bold text-foreground sm:text-base">{rendered.title}</p>
            <p className="mt-0.5 truncate text-xs text-muted">
              <span className="sm:hidden" data-numeric>
                {formatAudioDuration(currentTime)} / {formatAudioDuration(duration)}
              </span>
              <span className="sm:hidden">{rendered.author ? ` · ${rendered.author}` : ""}</span>
              <span className="hidden sm:inline">{rendered.author || "Versão em áudio"}</span>
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
            peaks={rendered.audio?.peaks}
            liveSource={audioRef}
            isPlaying={isPlaying}
            size="sm"
            label={`Posição do áudio de ${rendered.title}`}
          />
        </div>
      </div>
    </div>
  );
}
