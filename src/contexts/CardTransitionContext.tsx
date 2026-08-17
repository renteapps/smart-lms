"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";

export type CardTransitionMetadata = {
  title: string;
  cover: string;
  category?: string;
  duration?: string;
  type?: "course" | "lesson" | "article";
  subtitle?: string;
};

export type CardRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius?: string | number;
};

export type TransitionPhase = "idle" | "expanding" | "loading" | "completing";

export type TransitionPayload = {
  sourceRect: CardRect;
  metadata: CardTransitionMetadata;
  href: string;
};

type CardTransitionContextValue = {
  phase: TransitionPhase;
  activeTransition: TransitionPayload | null;
  triggerTransition: (payload: TransitionPayload) => void;
  cancelTransition: () => void;
};

const CardTransitionContext = createContext<CardTransitionContextValue | null>(null);

export function CardTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [, startTransition] = useTransition();

  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [activeTransition, setActiveTransition] = useState<TransitionPayload | null>(null);

  const pendingHrefRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (completingTimeoutRef.current) {
      clearTimeout(completingTimeoutRef.current);
      completingTimeoutRef.current = null;
    }
  }, []);

  const cancelTransition = useCallback(() => {
    clearTimers();
    setPhase("idle");
    setActiveTransition(null);
    pendingHrefRef.current = null;
  }, [clearTimers]);

  const triggerTransition = useCallback(
    (payload: TransitionPayload) => {
      // Se já houver transição em andamento, ignora novos disparos imediatos
      if (phase !== "idle") return;

      const { href, sourceRect, metadata } = payload;

      // Se usuário prefere movimento reduzido, navega direto sem animação pesada
      if (prefersReducedMotion) {
        router.push(href);
        return;
      }

      clearTimers();
      pendingHrefRef.current = href;
      setActiveTransition({ href, sourceRect, metadata });
      setPhase("expanding");

      // Inicia a navegação pelo Next router
      startTransition(() => {
        router.prefetch(href);
        router.push(href);
      });

      // Passa para fase 'loading' rapidamente para exibir feedback de carregamento
      timeoutRef.current = setTimeout(() => {
        setPhase((curr) => (curr === "expanding" ? "loading" : curr));
      }, 350);

      // Trava de segurança: se por algum motivo a rota demorar ou falhar, cancela após 3.5s
      const fallbackTimer = setTimeout(() => {
        cancelTransition();
      }, 3500);

      timeoutRef.current = fallbackTimer;
    },
    [cancelTransition, clearTimers, phase, prefersReducedMotion, router],
  );

  // Monitora a mudança de rota no Next.js para encerrar suavemente a transição
  useEffect(() => {
    if (!pendingHrefRef.current || phase === "idle") return;

    // Normaliza os caminhos para checar se o destino foi alcançado
    const currentPath = pathname.split("?")[0].replace(/\/$/, "");
    const targetPath = pendingHrefRef.current.split("?")[0].replace(/\/$/, "");

    if (currentPath === targetPath || (targetPath && currentPath.endsWith(targetPath))) {
      clearTimers();
      setPhase("completing");

      // Dá um tempo de 220ms para dissolver suavemente o overlay enquanto a nova página aparece
      completingTimeoutRef.current = setTimeout(() => {
        setPhase("idle");
        setActiveTransition(null);
        pendingHrefRef.current = null;
      }, 240);
    }
  }, [pathname, phase, clearTimers]);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return (
    <CardTransitionContext.Provider
      value={{
        phase,
        activeTransition,
        triggerTransition,
        cancelTransition,
      }}
    >
      {children}
    </CardTransitionContext.Provider>
  );
}

export function useCardTransition() {
  const context = useContext(CardTransitionContext);
  if (!context) {
    throw new Error("useCardTransition deve ser usado dentro de um CardTransitionProvider");
  }
  return context;
}
