import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingSummaryProps = {
  averageRating: number | null | undefined;
  ratingsCount: number | null | undefined;
  className?: string;
};

function formatAverage(value: number) {
  return value.toFixed(1).replace(".", ",");
}

export function RatingSummary({
  averageRating,
  ratingsCount,
  className,
}: RatingSummaryProps) {
  const count = ratingsCount ?? 0;
  const hasRatings = count > 0 && averageRating != null;
  const accessibleLabel = hasRatings
    ? `Média de ${formatAverage(averageRating)} estrelas em ${count} ${count === 1 ? "avaliação" : "avaliações"}`
    : "Sem avaliações";

  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      <Star
        className={cn(
          "size-3.5",
          hasRatings ? "fill-warning text-warning" : "text-muted/60",
        )}
        aria-hidden="true"
      />
      {hasRatings ? (
        <>
          <span className="font-semibold text-foreground">{formatAverage(averageRating)}</span>
          <span className="text-muted">({count})</span>
        </>
      ) : (
        <span className="text-muted">Sem avaliações</span>
      )}
    </span>
  );
}
