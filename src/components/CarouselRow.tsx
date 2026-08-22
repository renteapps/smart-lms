"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@heroui/react";
import { cn } from "@/lib/utils";

type CarouselRowProps = {
  title?: string;
  /** Ícone antes do título — ex.: distinguir a fileira de um curso específico. */
  titleIcon?: React.ReactNode;
  /** Ação à direita do título, alinhada com ele — ex.: link "Acessar". */
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Rótulo acessível da região de rolagem. Cai para o título quando ausente. */
  label?: string;
  className?: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 1, 0.5, 1] as [number, number, number, number],
    },
  },
};

/**
 * Linha de conteúdo rolável horizontalmente.
 *
 * A mecânica é nativa com snap e entrada escalonada pelo framer-motion.
 * O esmaecimento das bordas (gradiente) acompanha fluidamente a rolagem usando CSS mask-image 
 * sincronizado via manipulação direta de variáveis CSS no evento onScroll para máxima performance.
 */
export default function CarouselRow({ title, titleIcon, action, children, label, className }: CarouselRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<"none" | "left" | "right" | "both">("none");
  const reduceMotion = useReducedMotion();

  const canScrollStart = edges === "left" || edges === "both";
  const canScrollEnd = edges === "right" || edges === "both";

  const scrollByPage = useCallback(
    (direction: 1 | -1) => {
      const node = scrollerRef.current;
      if (!node) return;
      node.scrollBy({
        left: direction * node.clientWidth * 0.82,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    },
    [reduceMotion],
  );

  const handleScroll = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const { scrollLeft, scrollWidth, clientWidth } = node;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);

    // O gradiente vai de 0 até no máximo 56px de tamanho nas extremidades
    const MAX_MASK_SIZE = 56;
    const left = Math.min(Math.max(0, scrollLeft), MAX_MASK_SIZE);
    const right = Math.min(Math.max(0, maxScroll - scrollLeft), MAX_MASK_SIZE);

    // Atualiza o CSS diretamente para 60fps sem engasgos do React
    node.style.setProperty("--left-mask", `${left}px`);
    node.style.setProperty("--right-mask", `${right}px`);

    // Atualiza estado das setas de navegação usando 1px de tolerância para arredondamentos
    const hasLeftEdge = scrollLeft > 1;
    const hasRightEdge = scrollLeft < maxScroll - 1;

    let newEdges: "none" | "left" | "right" | "both" = "none";
    if (hasLeftEdge && hasRightEdge) newEdges = "both";
    else if (hasLeftEdge) newEdges = "left";
    else if (hasRightEdge) newEdges = "right";

    setEdges((prev) => (prev !== newEdges ? newEdges : prev));
  }, []);

  // Garante inicialização correta quando o componente monta e quando o layout ajusta
  useEffect(() => {
    handleScroll();
    window.addEventListener("resize", handleScroll);
    return () => window.removeEventListener("resize", handleScroll);
  }, [handleScroll]);

  return (
    <section className={cn("group/row relative py-6", className)}>
      {title && (
        <div className="editorial-container mb-5 flex items-center justify-between gap-4">
          <h2 className="display-3 flex items-center gap-2.5 text-foreground">
            {titleIcon}
            {title}
          </h2>
          {action}
        </div>
      )}

      <div className="relative">
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          aria-label={label ?? title ?? "Conteúdos"}
          className="editorial-container -my-6 py-6 overflow-y-hidden overflow-x-auto hide-scrollbar"
          role="region"
          tabIndex={0}
          style={{
            maskImage: `linear-gradient(to right, transparent 0, black var(--left-mask, 0px), black calc(100% - var(--right-mask, 0px)), transparent 100%)`,
            WebkitMaskImage: `linear-gradient(to right, transparent 0, black var(--left-mask, 0px), black calc(100% - var(--right-mask, 0px)), transparent 100%)`,
          }}
        >
          {/*
           * O respiro vertical devolve espaço para a sombra de hover
           * dos cards: sem ele o contêiner de rolagem corta o levantamento.
           */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="flex snap-x snap-mandatory gap-5 md:gap-6"
          >
            {React.Children.map(children, (child) => (
              <motion.div variants={itemVariants} className="shrink-0 snap-start">
                {child}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/*
         * As setas são um atalho para ponteiro fino — em toque a rolagem já é
         * direta. Ficam fora do fluxo e não substituem o gesto nativo.
         */}
        <div className="pointer-events-none absolute inset-0 hidden items-center md:flex">
          <div className="editorial-container flex items-center justify-between">
            <Button
              isIconOnly
              aria-label="Ver conteúdos anteriores"
              variant="secondary"
              isDisabled={!canScrollStart}
              onClick={() => scrollByPage(-1)}
              className={cn(
                "pointer-events-auto size-11 rounded-full opacity-0 shadow-elev-3 transition-opacity duration-[var(--duration-md)]",
                canScrollStart && "focus-visible:opacity-100 group-hover/row:opacity-100",
              )}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </Button>

            <Button
              isIconOnly
              aria-label="Ver próximos conteúdos"
              variant="secondary"
              isDisabled={!canScrollEnd}
              onClick={() => scrollByPage(1)}
              className={cn(
                "pointer-events-auto size-11 rounded-full opacity-0 shadow-elev-3 transition-opacity duration-[var(--duration-md)]",
                canScrollEnd && "focus-visible:opacity-100 group-hover/row:opacity-100",
              )}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
