import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string;
  compact?: boolean;
  className?: string;
  subtitle?: string;
};

/**
 * Assinatura da marca.
 *
 * O monograma é um bloco sólido de accent com uma faísca recortada no canto —
 * o recorte vem do `overflow-hidden`, não de um desenho, o que mantém a forma
 * nítida em qualquer tamanho. A única reação ao ponteiro é a faísca crescendo:
 * um gesto, não três.
 */
export function BrandMark({ href = "/", compact = false, className, subtitle }: BrandMarkProps) {
  return (
    <Link
      href={href}
      aria-label="Smart LMS"
      className={cn("press group inline-flex items-center gap-3 rounded-xl", className)}
    >
      <span
        aria-hidden="true"
        className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-accent font-display text-sm font-extrabold text-accent-foreground shadow-elev-2 transition-shadow duration-[var(--duration-md)] ease-[var(--ease-zen)] group-hover:shadow-elev-3"
      >
        <span
          className="absolute -bottom-3 -right-3 size-6 rounded-full bg-warning transition-transform duration-[var(--duration-md)] ease-[var(--ease-zen)] group-hover:scale-125"
        />
        <span className="relative leading-none">S</span>
      </span>

      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="font-display text-[1.05rem] font-extrabold tracking-tight text-foreground">
            Smart LMS
          </span>
          {subtitle && <span className="eyebrow mt-1.5 text-[0.65rem]">{subtitle}</span>}
        </span>
      )}
    </Link>
  );
}
