'use client';

import { CSSProperties } from 'react';
import { Check, MousePointer2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
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
};

const LAYOUT_SPRING = {
  type: 'spring' as const,
  stiffness: 175,
  damping: 22,
  mass: 0.78,
};

const BUBBLE_PALETTES = [
  { accent: '#3157B7', soft: '#E9EEFB' },
  { accent: '#527160', soft: '#EDF3EF' },
  { accent: '#A85F43', soft: '#F7EEE9' },
  { accent: '#667085', soft: '#F0F1F3' },
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
    <div className="relative w-full overflow-hidden rounded-[14px] border border-border bg-[linear-gradient(145deg,var(--surface),var(--canvas-soft))] px-4 py-5 shadow-[inset_0_1px_0_rgb(255,255,255,0.8)] sm:px-7 sm:py-6">
      <div className="pointer-events-none absolute -left-16 top-1/3 h-44 w-44 rounded-full bg-primary-pale/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-14 bottom-0 h-40 w-40 rounded-full bg-accent-orange/8 blur-3xl" />

      <div className="relative mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-text-soft">
          <MousePointer2 className="h-4 w-4 text-primary" />
          Toque nas bolhas que mais combinam com você
        </p>
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-primary-active shadow-sm ring-1 ring-border">
          {selectedLabels.length} {selectedLabels.length === 1 ? 'selecionada' : 'selecionadas'}
        </span>
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
            background: isSelected
              ? `linear-gradient(145deg, color-mix(in srgb, ${palette.accent} 82%, white), ${palette.accent})`
              : `radial-gradient(circle at 32% 24%, white 0%, ${palette.soft} 72%)`,
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
                  'relative isolate grid h-full w-full place-items-center rounded-full border px-4 text-center outline-none transition-[border-color,box-shadow,color] duration-[var(--duration-md)] focus-visible:ring-3 focus-visible:ring-primary/30',
                  isSelected
                    ? 'z-10 border-white/55 text-white shadow-[0_20px_42px_color-mix(in_srgb,var(--bubble-accent)_25%,transparent)]'
                    : 'border-[color-mix(in_srgb,var(--bubble-accent)_30%,white)] text-ink shadow-[0_8px_20px_rgb(23,32,51,0.07)] hover:border-[var(--bubble-accent)] hover:shadow-[0_13px_28px_rgb(23,32,51,0.11)]',
                )}
              >
                <motion.span
                  aria-hidden="true"
                  animate={{ opacity: isSelected ? 0.38 : 0, scale: isSelected ? 1 : 0.88 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute -inset-2 -z-10 rounded-full border border-[var(--bubble-accent)]"
                />
                <span aria-hidden="true" className="pointer-events-none absolute inset-[7%] rounded-full bg-[linear-gradient(145deg,rgba(255,255,255,0.42),transparent_48%)]" />
                <span aria-hidden="true" className="pointer-events-none absolute left-[20%] top-[15%] h-1.5 w-1.5 rounded-full bg-white/75 shadow-[0_0_8px_white]" />
                <span className="relative z-10 max-w-[11ch] text-sm font-extrabold leading-[1.18] tracking-[-0.02em] sm:text-[15px]">{option.label}</span>
                <motion.span
                  aria-hidden="true"
                  animate={{ opacity: isSelected ? 1 : 0, scale: isSelected ? 1 : 0.65 }}
                  transition={reduceMotion ? { duration: 0 } : LAYOUT_SPRING}
                  className="absolute bottom-[11%] right-[11%] grid h-7 w-7 place-items-center rounded-full border border-white/55 bg-white text-[var(--bubble-accent)] shadow-sm"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                </motion.span>
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>

      <p className="relative mt-5 text-center text-xs font-medium text-text-mute">
        Cada bolha representa exatamente uma opção cadastrada no questionário.
      </p>
    </div>
  );
}
