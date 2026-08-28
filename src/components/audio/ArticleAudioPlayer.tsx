"use client";

import { useState, useSyncExternalStore } from "react";
import { Button, Chip, Disclosure, Tooltip } from "@heroui/react";
import { Headphones, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { AudioScrubber } from "@/components/audio/AudioScrubber";
import { Reveal } from "@/components/ui/Reveal";
import { getSavedAudioProgress, useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { formatAudioDuration } from "@/lib/audioOptimization";
import type { Article } from "@/types/blog";

const PLAYBACK_RATES = [1, 1.25, 1.5, 2];

/**
 * O progresso salvo só muda por ação nossa dentro desta mesma árvore, então não
 * há a que se inscrever — o `useSyncExternalStore` está aqui pelo terceiro
 * argumento: ele dá ao servidor o valor 0 e ao navegador o valor do
 * `localStorage`, sem o descompasso de hidratação que ler o storage no render
 * causaria.
 */
const noopSubscribe = () => () => {};

/**
 * Player do áudio na página do artigo.
 *
 * Não tem elemento `<audio>` próprio: reproduz pelo mesmo contexto do mini
 * player flutuante. Dois `<audio>` na mesma página tocariam o mesmo arquivo em
 * duas posições — aqui a página é o controle completo enquanto o leitor está
 * nela, e o mini player assume quando ele sai.
 *
 * O gesto expressivo da peça é um só (§12 do design): a forma de onda. Ela é
 * dado real do arquivo, não textura — por isso o resto (superfície, botões,
 * tipografia) fica contido e deixa a onda carregar a atenção.
 */
export function ArticleAudioPlayer({ article }: { article: Article }) {
  const {
    state,
    playArticle,
    togglePlayPause,
    seekTo,
    skipBackward,
    skipForward,
    setPlaybackRate,
  } = useAudioPlayer();

  // Posição escolhida arrastando a onda com o áudio ainda parado. Enquanto for
  // `null`, vale a posição em que a pessoa parou da última vez.
  const [scrubbedTime, setScrubbedTime] = useState<number | null>(null);
  const savedTime = useSyncExternalStore(
    noopSubscribe,
    () => getSavedAudioProgress(article.slug),
    () => 0
  );
  const resumeAt = scrubbedTime ?? savedTime;

  const isActive = state.article?.slug === article.slug;
  const audio = article.audio;

  if (!audio) return null;

  const duration = isActive && state.duration > 0 ? state.duration : audio.duration;
  const currentTime = isActive ? state.currentTime : resumeAt;
  const isPlaying = isActive && state.isPlaying;
  const hasStarted = currentTime > 1;

  const handleSeek = (seconds: number) => {
    if (isActive) {
      seekTo(seconds);
      return;
    }
    // Ainda não é o áudio ativo: buscar antes de tocar não teria onde ser
    // aplicado, então guardamos a posição e o `playArticle` retoma dela.
    setScrubbedTime(seconds);
  };

  const cyclePlaybackRate = () => {
    const next = PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(state.playbackRate) + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(next);
  };

  return (
    <section aria-label="Ouvir este artigo" className="mb-12">
      <Reveal className="surface-card overflow-hidden">
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="eyebrow flex items-center gap-2 text-accent">
                <Headphones className="size-3.5" aria-hidden="true" />
                Versão em áudio
              </span>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                {article.format === "audio" ? "Ouça este episódio" : "Prefere ouvir?"}
              </h2>
              <p className="mt-1 max-w-md text-sm text-muted">
                O player continua tocando enquanto você navega pela plataforma.
              </p>
            </div>

            <Chip color="accent" variant="soft" size="sm">
              <span data-numeric>{formatAudioDuration(duration)}</span>
            </Chip>
          </div>

          <div className="mt-6">
            <AudioScrubber
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
              peaks={audio.peaks}
              size="md"
              label={`Posição do áudio de ${article.title}`}
            />

            <div className="mt-2 flex items-center justify-between text-xs font-semibold text-muted">
              <span data-numeric>{formatAudioDuration(currentTime)}</span>
              <span data-numeric>-{formatAudioDuration(Math.max(0, duration - currentTime))}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              isIconOnly
              variant="primary"
              onClick={() => (isActive ? togglePlayPause() : playArticle(article, resumeAt))}
              aria-label={isPlaying ? "Pausar áudio" : hasStarted ? "Continuar áudio" : "Reproduzir áudio"}
              className="press size-14 shrink-0 rounded-full"
            >
              {isPlaying ? (
                <Pause className="size-6 fill-current" aria-hidden="true" />
              ) : (
                <Play className="ml-0.5 size-6 fill-current" aria-hidden="true" />
              )}
            </Button>

            <Button
              isIconOnly
              variant="tertiary"
              onClick={skipBackward}
              isDisabled={!isActive}
              aria-label="Voltar 15 segundos"
              className="icon-rotate rounded-full"
            >
              <RotateCcw className="size-5" aria-hidden="true" />
            </Button>

            <Button
              isIconOnly
              variant="tertiary"
              onClick={skipForward}
              isDisabled={!isActive}
              aria-label="Avançar 15 segundos"
              className="icon-rotate rounded-full"
            >
              <RotateCw className="size-5" aria-hidden="true" />
            </Button>

            <Tooltip.Root>
              <Tooltip.Trigger>
                <Button
                  variant="tertiary"
                  onClick={cyclePlaybackRate}
                  aria-label={`Velocidade de reprodução: ${state.playbackRate}x. Alternar.`}
                  className="rounded-full font-bold"
                >
                  <span data-numeric>{state.playbackRate}x</span>
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>Velocidade de reprodução</Tooltip.Content>
            </Tooltip.Root>

            {!isActive && hasStarted && (
              <span className="text-sm font-medium text-muted">
                Você parou em <span data-numeric>{formatAudioDuration(currentTime)}</span>
              </span>
            )}
          </div>
        </div>

        {audio.transcript && (
          <Disclosure className="relative z-10 border-t border-separator">
            <Disclosure.Heading level={3}>
              <Disclosure.Trigger className="flex w-full items-center gap-3 px-6 py-4 text-left text-sm font-semibold text-foreground transition-colors duration-[var(--duration-md)] hover:bg-surface-secondary sm:px-8">
                <span className="flex-1">Transcrição</span>
                <Disclosure.Indicator className="size-4 text-muted" />
              </Disclosure.Trigger>
            </Disclosure.Heading>
            <Disclosure.Content>
              <div className="border-t border-separator px-6 py-5 text-sm leading-relaxed whitespace-pre-line text-muted sm:px-8">
                {audio.transcript}
              </div>
            </Disclosure.Content>
          </Disclosure>
        )}
      </Reveal>
    </section>
  );
}
