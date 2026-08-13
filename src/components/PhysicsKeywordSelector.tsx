'use client';

import { CSSProperties } from 'react';
import { Check, MousePointer2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Chip } from '@heroui/react';
import { QuestionOption } from '@/types/trilha';
import { cn } from '@/lib/utils';

type PhysicsKeywordSelectorProps = {
  options: QuestionOption[];
  selectedLabels: string[];
  onToggleSelect: (label: string) => void;
};

type BubbleStyle = CSSProperties & {
  '--bubble-accent': string;
  '--bubble-soft': string;
  '--bubble-on': string;
};

const LAYOUT_SPRING = {
  type: 'spring' as const,
  stiffness: 175,
  damping: 22,
  mass: 0.78,
};

/**
 * Identidades das bolhas.
 *
 * Vêm dos papéis semânticos do tema — nada de hex — e a quarta é a tinta do
 * texto, que dá uma bolha "sólida" no meio das coloridas e quebra a monotonia
 * sem inventar cor nova. Todas trazem o par `-foreground` correspondente, então
 * o contraste do rótulo selecionado é garantido em qualquer tema.
 */
const BUBBLE_PALETTES = [
  { accent: 'var(--accent)', soft: 'var(--accent-soft)', on: 'var(--accent-foreground)' },
  { accent: 'var(--success)', soft: 'var(--success-soft)', on: 'var(--success-foreground)' },
  { accent: 'var(--warning)', soft: 'var(--warning-soft)', on: 'var(--warning-foreground)' },
  { accent: 'var(--foreground)', soft: 'var(--background-secondary)', on: 'var(--background)' },
];

function getBubbleSize(label: string) {
  if (label.length > 20) return 138;
  if (label.length > 13) return 126;
  return 114;
}

export default function PhysicsKeywordSelector({
  options,
  selectedLabels,
  onToggleSelect,
}: PhysicsKeywordSelectorProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-surface to-background-secondary px-4 py-5 shadow-elev-1 sm:px-7 sm:py-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 top-1/3 size-44 rounded-full bg-accent-soft/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-14 bottom-0 size-40 rounded-full bg-warning-soft/60 blur-3xl" />

      <div className="relative mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-separator pb-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-muted">
          <MousePointer2 className="size-4 text-accent" aria-hidden="true" />
          Toque nas bolhas que mais combinam com você
        </p>
        <Chip color={selectedLabels.length > 0 ? 'accent' : 'default'} variant="soft" size="sm">
          <span data-numeric>{selectedLabels.length}</span>{' '}
          {selectedLabels.length === 1 ? 'selecionada' : 'selecionadas'}
        </Chip>
      </div>

      <motion.div layout className="relative flex min-h-[380px] flex-wrap content-center items-center justify-center gap-x-3 gap-y-5 sm:min-h-[410px] sm:gap-x-5 sm:gap-y-6">
        {options.map((option, index) => {
          const isSelected = selectedLabels.includes(option.label);
          const palette = BUBBLE_PALETTES[index % BUBBLE_PALETTES.length];
          const size = getBubbleSize(option.label);
          const targetSize = size + (isSelected ? 24 : 0);
          const style: BubbleStyle = {
            '--bubble-accent': palette.accent,
            '--bubble-soft': palette.soft,
            '--bubble-on': palette.on,
            background: isSelected
              ? `linear-gradient(145deg, color-mix(in oklab, ${palette.accent} 84%, white), ${palette.accent})`
              : `radial-gradient(circle at 32% 24%, var(--surface) 0%, ${palette.soft} 72%)`,
          };

          return (
            <motion.div
              key={option.label}
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 14, width: size, height: size }}
              animate={{
                opacity: 1,
                y: 0,
                width: targetSize,
                height: targetSize,
              }}
              transition={{
                layout: reduceMotion ? { duration: 0 } : LAYOUT_SPRING,
                width: reduceMotion ? { duration: 0 } : LAYOUT_SPRING,
                height: reduceMotion ? { duration: 0 } : LAYOUT_SPRING,
                opacity: { duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : index * 0.045 },
                y: { duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : index * 0.045 },
              }}
              className="relative shrink-0"
            >
              <motion.button
                type="button"
                aria-pressed={isSelected}
                aria-label={`${option.label}${isSelected ? ', selecionada' : ''}`}
                onClick={() => onToggleSelect(option.label)}
                animate={{
                  scale: isSelected ? 1.012 : 1,
                  y: reduceMotion ? 0 : [0, index % 2 === 0 ? -3 : 3, 0],
                }}
                whileHover={reduceMotion ? undefined : { scale: isSelected ? 1.025 : 1.018, y: -4 }}
                whileTap={reduceMotion ? undefined : { scale: 0.975 }}
                transition={{
                  scale: reduceMotion ? { duration: 0 } : LAYOUT_SPRING,
                  y: reduceMotion
                    ? { duration: 0 }
                    : { duration: 5.2 + (index % 3) * 0.55, repeat: Infinity, ease: 'easeInOut', delay: index * 0.18 },
                }}
                style={style}
                className={cn(
                  'relative isolate grid size-full place-items-center rounded-full border px-4 text-center outline-none transition-[border-color,box-shadow,color] duration-[var(--duration-md)] focus-visible:ring-3 focus-visible:ring-focus',
                  isSelected
                    ? 'z-10 border-[color-mix(in_oklab,white_45%,transparent)] text-[var(--bubble-on)] shadow-elev-3'
                    : 'border-[color-mix(in_oklab,var(--bubble-accent)_26%,var(--surface))] text-foreground shadow-elev-1 hover:border-[var(--bubble-accent)] hover:shadow-elev-2',
                )}
              >
                <motion.span
                  aria-hidden="true"
                  animate={{ opacity: isSelected ? 0.38 : 0, scale: isSelected ? 1 : 0.88 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute -inset-2 -z-10 rounded-full border border-[var(--bubble-accent)]"
                />
                <span aria-hidden="true" className="pointer-events-none absolute inset-[7%] rounded-full bg-linear-[145deg,color-mix(in_oklab,white_42%,transparent),transparent_48%]" />
                <span aria-hidden="true" className="pointer-events-none absolute left-[20%] top-[15%] size-1.5 rounded-full bg-white/75" />
                <span className="relative z-10 max-w-[11ch] text-sm font-extrabold leading-[1.18] tracking-[-0.02em] sm:text-[0.9375rem]">
                  {option.label}
                </span>
                <motion.span
                  aria-hidden="true"
                  animate={{ opacity: isSelected ? 1 : 0, scale: isSelected ? 1 : 0.65 }}
                  transition={reduceMotion ? { duration: 0 } : LAYOUT_SPRING}
                  className="absolute bottom-[11%] right-[11%] grid size-7 place-items-center rounded-full border border-hairline bg-surface text-[var(--bubble-accent)] shadow-elev-1"
                >
                  <Check className="size-4 stroke-[3]" />
                </motion.span>
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>

      <p className="relative mt-5 text-center text-xs font-medium text-muted">
        Cada bolha representa exatamente uma opção cadastrada no questionário.
      </p>
    </div>
  );
}
