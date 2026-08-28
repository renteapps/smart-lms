"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatAudioDuration } from "@/lib/audioOptimization";
import { cn } from "@/lib/utils";

type AudioScrubberProps = {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  /** Envoltória gravada no upload. Sem ela o controle vira uma trilha lisa. */
  peaks?: number[] | null;
  /** Altura da faixa. `sm` para o mini player, `md` para a página do artigo. */
  size?: "sm" | "md";
  isDisabled?: boolean;
  label?: string;
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-6",
  md: "h-16 sm:h-20",
} as const;

/** Barra silenciosa ainda precisa existir: a onda se lê como um objeto contínuo. */
const MIN_BAR_HEIGHT = 8;

const STEP_SECONDS = 5;
const PAGE_SECONDS = 30;

/**
 * Faixa de progresso e busca do áudio, desenhada como forma de onda.
 *
 * A onda não é enfeite: os picos vêm do arquivo real, então quem arrasta enxerga
 * onde a fala começa, onde há pausa e onde entra a trilha — a barra lisa não diz
 * nada disso. As barras já tocadas ficam em `accent`, as demais em `muted`, e o
 * corte entre as duas camadas é feito por `clip-path` (nunca por `width`, que
 * forçaria layout a cada quadro).
 *
 * O HeroUI tem `Slider`, mas o esqueleto dele é uma trilha de 20px com polegar
 * próprio e regras aninhadas de alta especificidade — reaproveitá-lo aqui seria
 * lutar contra o CSS dele, não usá-lo. O que importa do React Aria (semântica de
 * slider, teclado, rótulo) está reproduzido abaixo.
 */
export function AudioScrubber({
  currentTime,
  duration,
  onSeek,
  peaks,
  size = "md",
  isDisabled = false,
  label = "Posição do áudio",
  className,
}: AudioScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);

  const hasDuration = Number.isFinite(duration) && duration > 0;
  const shownTime = dragTime ?? currentTime;
  const progress = hasDuration ? Math.min(1, Math.max(0, shownTime / duration)) : 0;

  const bars = useMemo(() => {
    if (peaks && peaks.length > 0) return peaks;
    // Sem envoltória (artigos antigos, áudio por URL externa) a faixa vira uma
    // trilha reta — o mesmo componente, sem fingir uma onda que não temos.
    return null;
  }, [peaks]);

  const timeFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || !hasDuration) return 0;

      const rect = track.getBoundingClientRect();
      // Largura zero acontece quando a faixa está oculta (aba em segundo plano,
      // painel recolhido). Sem esta guarda a divisão vira `NaN` e contamina a
      // posição, o `aria-valuenow` e o recorte da onda.
      if (rect.width <= 0) return 0;

      const ratio = (clientX - rect.left) / rect.width;
      return Math.min(duration, Math.max(0, ratio * duration));
    },
    [duration, hasDuration]
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isDisabled || !hasDuration || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragTime(timeFromPointer(event.clientX));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragTime === null) return;
    setDragTime(timeFromPointer(event.clientX));
  };

  // Durante o arrasto só a posição visual muda; o `seek` real acontece ao soltar.
  // Buscar a cada movimento do dedo faria o navegador rebufferizar dezenas de
  // vezes e o áudio engasgaria justamente enquanto se procura o trecho.
  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragTime === null) return;
    const target = timeFromPointer(event.clientX);
    setDragTime(null);
    onSeek(target);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isDisabled || !hasDuration) return;

    const step = (delta: number) => {
      event.preventDefault();
      onSeek(Math.min(duration, Math.max(0, currentTime + delta)));
    };

    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        return step(STEP_SECONDS);
      case "ArrowLeft":
      case "ArrowDown":
        return step(-STEP_SECONDS);
      case "PageUp":
        return step(PAGE_SECONDS);
      case "PageDown":
        return step(-PAGE_SECONDS);
      case "Home":
        event.preventDefault();
        return onSeek(0);
      case "End":
        event.preventDefault();
        return onSeek(duration);
    }
  };

  const playedStyle = { clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={isDisabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={hasDuration ? Math.round(duration) : 0}
      aria-valuenow={Math.round(shownTime)}
      aria-valuetext={`${formatAudioDuration(shownTime)} de ${formatAudioDuration(duration)}`}
      aria-disabled={isDisabled || !hasDuration}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDragTime(null)}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative w-full touch-none rounded-md outline-none select-none",
        "focus-visible:ring-3 focus-visible:ring-accent/30",
        isDisabled || !hasDuration ? "cursor-default opacity-60" : "cursor-pointer",
        SIZE_CLASS[size],
        className
      )}
    >
      {bars ? (
        <>
          <WaveformBars peaks={bars} className="text-muted/45" />
          <WaveformBars peaks={bars} className="text-accent" style={playedStyle} />
        </>
      ) : (
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-muted/30">
          <div className="size-full rounded-full bg-accent" style={playedStyle} />
        </div>
      )}
    </div>
  );
}

function WaveformBars({
  peaks,
  className,
  style,
}: {
  peaks: number[];
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center gap-px sm:gap-0.5",
        className
      )}
    >
      {peaks.map((peak, index) => (
        <span
          key={index}
          className="min-w-px flex-1 rounded-full bg-current"
          style={{ height: `${Math.max(MIN_BAR_HEIGHT, peak)}%` }}
        />
      ))}
    </div>
  );
}
