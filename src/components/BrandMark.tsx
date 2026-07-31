import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string;
  compact?: boolean;
  className?: string;
  subtitle?: string;
};

export function BrandMark({ href = "/", compact = false, className, subtitle }: BrandMarkProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3 rounded-lg", className)} aria-label="Smart LMS">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[12px] bg-primary text-sm font-display font-extrabold text-on-primary shadow-sm">
        S
        <span className="absolute -bottom-2 -right-2 h-5 w-5 rounded-full bg-accent-orange/90" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="font-display text-[1.05rem] font-extrabold tracking-[-0.035em] text-ink">Smart LMS</span>
          {subtitle && <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-text-mute">{subtitle}</span>}
        </span>
      )}
    </Link>
  );
}
