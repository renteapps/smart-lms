"use client";

import { useCallback, useRef, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Realça também a borda seguindo o cursor. Reservar para cards de destaque. */
  edge?: boolean;
  style?: CSSProperties;
};

/**
 * Superfície com "reveal" no estilo Fluent: um foco de luz acompanha o cursor.
 *
 * As coordenadas são escritas direto no style do nó (`--mx` / `--my`) dentro de
 * um rAF, em vez de virarem estado do React — mousemove dispara dezenas de
 * vezes por segundo e re-renderizar a árvore a cada evento derrubaria o frame
 * rate justamente durante a interação que deveria parecer suave.
 *
 * Sem ponteiro fino (toque) ou com `prefers-reduced-motion`, o efeito não é
 * anexado e o componente vira uma div comum.
 */
export function Reveal({ children, className, edge = false, style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  const handleMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion || event.pointerType !== "mouse") return;

      const { clientX, clientY } = event;
      if (frame.current !== null) return;

      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const node = ref.current;
        if (!node) return;

        const rect = node.getBoundingClientRect();
        node.style.setProperty("--mx", `${((clientX - rect.left) / rect.width) * 100}%`);
        node.style.setProperty("--my", `${((clientY - rect.top) / rect.height) * 100}%`);
      });
    },
    [reduceMotion],
  );

  return (
    <div
      ref={ref}
      className={cn("reveal", edge && "reveal-edge", className)}
      onPointerMove={handleMove}
      style={style}
    >
      {children}
    </div>
  );
}
