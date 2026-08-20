"use client";

import React, { useEffect, useMemo } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Sparkles, X, BookOpen, Clock } from "lucide-react";
import { useCardTransition } from "@/contexts/CardTransitionContext";
import { cn } from "@/lib/utils";

export function CardExpandOverlay() {
  const { phase, activeTransition, cancelTransition } = useCardTransition();

  // Fecha com tecla Escape
  useEffect(() => {
    if (phase === "idle") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelTransition();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, cancelTransition]);

  const isVisible = phase !== "idle" && Boolean(activeTransition);

  // Calcula posição e dimensões de destino centralizadas
  const targetGeometry = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        top: "50%",
        left: "50%",
        width: 800,
        height: 480,
        x: "-50%",
        y: "-50%",
      };
    }
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    // Destino responsivo estilo Netflix / Cinema modal
    const targetWidth = Math.min(winWidth * 0.92, 860);
    // Aspect ratio 16:10 ou 16:9
    const targetHeight = Math.min(targetWidth * 0.58, winHeight * 0.78);

    const targetTop = (winHeight - targetHeight) / 2;
    const targetLeft = (winWidth - targetWidth) / 2;

    return {
      top: targetTop,
      left: targetLeft,
      width: targetWidth,
      height: targetHeight,
    };
  }, []);

  if (!isVisible || !activeTransition) return null;

  const { sourceRect, metadata } = activeTransition;
  const isLesson = metadata.type === "lesson" || activeTransition.href.includes("/lessons/");

  return (
    <AnimatePresence>
      {isVisible && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={metadata.title}
          className="fixed inset-0 z-[9999] pointer-events-auto flex items-center justify-center select-none"
        >
          {/* Fundo escurecido com desfoque cinematográfico */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "completing" ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            onClick={cancelTransition}
            className="absolute inset-0 bg-black/65 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Card em expansão física (Shared Element Morphing) */}
          <motion.div
            initial={{
              position: "fixed",
              top: sourceRect.top,
              left: sourceRect.left,
              width: sourceRect.width,
              height: sourceRect.height,
              borderRadius: sourceRect.borderRadius ?? 16,
              scale: 1,
              opacity: 1,
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
            animate={{
              position: "fixed",
              top: targetGeometry.top,
              left: targetGeometry.left,
              width: targetGeometry.width,
              height: targetGeometry.height,
              borderRadius: 20,
              scale: phase === "completing" ? 1.02 : 1,
              opacity: phase === "completing" ? 0 : 1,
              boxShadow:
                "0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.12)",
            }}
            exit={{
              opacity: 0,
              scale: 0.96,
              transition: { duration: 0.2 },
            }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 28,
              mass: 0.85,
              opacity: { duration: phase === "completing" ? 0.22 : 0.15 },
            }}
            className="relative overflow-hidden bg-surface-secondary flex flex-col justify-end"
            style={{ willChange: "transform, top, left, width, height, opacity" }}
          >
            {/* Imagem de Capa com Zoom Contínuo Estilo Cinema */}
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 1.06 }}
              transition={{ duration: 3.5, ease: "easeOut" }}
              className="absolute inset-0"
            >
              {metadata.cover ? (
                <Image
                  src={metadata.cover}
                  alt=""
                  fill
                  unoptimized
                  priority
                  sizes="860px"
                  className="object-cover"
                />
              ) : (
                <div className="size-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950" />
              )}
            </motion.div>

            {/* Máscara de gradiente ambiente para realce das informações */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/20"
            />

            {/* Botão de Fechar / Abortar Transição */}
            <button
              onClick={cancelTransition}
              aria-label="Cancelar navegação"
              className="absolute top-4 right-4 z-20 grid size-9 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur-md transition-all hover:bg-black/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="size-4" />
            </button>

            {/* Ícone de Play central pulsante enquanto expande */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
            >
              <div className="relative grid size-16 place-items-center rounded-full bg-white/20 text-white backdrop-blur-xl border border-white/30 shadow-2xl">
                <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-40" />
                {isLesson ? (
                  <Play className="ml-1 size-7 fill-white text-white drop-shadow-md" />
                ) : (
                  <BookOpen className="size-7 text-white drop-shadow-md" />
                )}
              </div>
            </motion.div>

            {/* Conteúdo Informativo & Rodapé do Card */}
            <div className="relative z-10 p-6 md:p-8 flex flex-col gap-3">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="flex flex-wrap items-center gap-2"
              >
                {metadata.category && (
                  <span className="rounded-md bg-white/20 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-white backdrop-blur-md border border-white/20">
                    {metadata.category}
                  </span>
                )}
                {metadata.duration && (
                  <span className="flex items-center gap-1.5 rounded-md bg-black/40 px-2.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
                    <Clock className="size-3.5" />
                    {metadata.duration}
                  </span>
                )}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold leading-snug tracking-tight text-white drop-shadow-md line-clamp-2"
              >
                {metadata.title}
              </motion.h2>

              {/* Status de Carregamento Netflix-style */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="flex items-center gap-2 pt-1 text-xs font-medium text-white/80"
              >
                <Sparkles className="size-3.5 text-accent animate-pulse" />
                <span>{isLesson ? "Carregando aula..." : "Acessando curso..."}</span>
              </motion.div>
            </div>

            {/* Barra de Progresso / Glowing Shimmer Line na borda inferior */}
            <div className="relative h-1 w-full overflow-hidden bg-white/10 z-20">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                className="h-full w-full bg-gradient-to-r from-transparent via-accent to-accent-hover shadow-[0_0_12px_var(--color-accent)]"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
