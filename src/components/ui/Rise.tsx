"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type RiseProps = {
  children: ReactNode;
  className?: string;
  /** Atraso em ms, para escalonar itens de uma mesma linha. */
  delay?: number;
  as?: ElementType;
};

/**
 * Revela o conteúdo quando ele entra na viewport.
 *
 * Usa IntersectionObserver e desconecta no primeiro disparo: a entrada é um
 * evento único, e manter o observer vivo custaria trabalho a cada scroll sem
 * mudar nada. O estilo fica em `.rise` (globals.css), que já é neutralizado
 * por `prefers-reduced-motion`.
 */
export function Rise({ children, className, delay = 0, as: Tag = "div" }: RiseProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Sem suporte a IntersectionObserver, mostra imediatamente em vez de esconder.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn("rise", className)}
      data-visible={visible ? "true" : "false"}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
