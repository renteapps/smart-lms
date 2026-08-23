"use client";

import { useEffect, useState } from "react";
import { keyboardInset } from "@/lib/platformAssistantWidget";

/**
 * Altura do teclado virtual sobre a janela, em px (0 no desktop).
 *
 * Elementos `fixed` são posicionados pelo *layout viewport*, que não encolhe
 * quando o teclado abre — sem esta compensação qualquer painel ancorado
 * embaixo fica atrás do teclado no celular.
 */
export function useKeyboardInset(isActive: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = typeof window === "undefined" ? null : window.visualViewport;
    if (!isActive || !viewport) {
      setInset(0);
      return;
    }
    const update = () => setInset(keyboardInset(window.innerHeight, viewport));
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [isActive]);

  return inset;
}
