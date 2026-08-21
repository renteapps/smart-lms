"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/contexts/AppearanceContext";

type BrandMarkProps = {
  href?: string;
  compact?: boolean;
  className?: string;
  subtitle?: string;
  logoUrl?: string | null;
  platformName?: string;
};

/**
 * Assinatura da marca da plataforma.
 *
 * Exibe a imagem de logotipo configurada ou, na ausência dela, o monograma
 * estilizado com a inicial da marca e o nome configurado em `app_settings.appearance`.
 */
export function BrandMark({
  href = "/",
  compact = false,
  className,
  subtitle,
  logoUrl: propLogoUrl,
  platformName: propPlatformName,
}: BrandMarkProps) {
  const appearance = useAppearance();
  const name = propPlatformName || appearance?.platformName || "Smart LMS";
  const logo = propLogoUrl !== undefined ? propLogoUrl : appearance?.logoUrl;
  const initial = name.trim().charAt(0).toUpperCase() || "S";

  return (
    <Link
      href={href}
      aria-label={name}
      className={cn("press group inline-flex items-center gap-3 rounded-xl", className)}
    >
      {logo ? (
        <div className="relative flex items-center justify-center">
          {compact ? (
            <span
              aria-hidden="true"
              className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface border border-border/60 shadow-elev-1 transition-transform duration-[var(--duration-md)] ease-[var(--ease-zen)] group-hover:scale-105"
            >
              <img
                src={logo}
                alt={name}
                className="size-full object-contain p-1 rounded-lg"
              />
            </span>
          ) : (
            <div className="flex items-center gap-2.5">
              <img
                src={logo}
                alt={name}
                className="h-9 max-h-9 w-auto max-w-[170px] object-contain transition-transform duration-[var(--duration-md)] ease-[var(--ease-zen)] group-hover:scale-105"
              />
              {subtitle && <span className="eyebrow mt-0.5 text-[0.65rem]">{subtitle}</span>}
            </div>
          )}
        </div>
      ) : (
        <>
          <span
            aria-hidden="true"
            className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-accent font-display text-sm font-extrabold text-accent-foreground shadow-elev-2 transition-shadow duration-[var(--duration-md)] ease-[var(--ease-zen)] group-hover:shadow-elev-3"
          >
            <span
              className="absolute -bottom-3 -right-3 size-6 rounded-full bg-warning transition-transform duration-[var(--duration-md)] ease-[var(--ease-zen)] group-hover:scale-125"
            />
            <span className="relative leading-none">{initial}</span>
          </span>

          {!compact && (
            <span className="flex min-w-0 flex-col leading-none">
              <span className="font-display text-[1.05rem] font-extrabold tracking-tight text-foreground truncate max-w-[180px]">
                {name}
              </span>
              {subtitle && <span className="eyebrow mt-1.5 text-[0.65rem]">{subtitle}</span>}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
