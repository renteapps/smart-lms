import { Skeleton } from "@heroui/react";

/**
 * Esqueleto com a mesma anatomia do `SearchResultCard` — cabeçalho, título,
 * duas linhas de texto e rodapé. Um esqueleto que não bate com o cartão real
 * produz exatamente o salto de layout que ele deveria evitar.
 */
export function SearchSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex h-52 flex-col rounded-2xl border border-hairline bg-surface p-5 shadow-elev-1"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-3 w-28 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-12 rounded-sm" />
          </div>

          <Skeleton className="mt-4 h-5 w-3/4 rounded-sm" />
          <Skeleton className="mt-3 h-3.5 w-full rounded-sm" />
          <Skeleton className="mt-1.5 h-3.5 w-5/6 rounded-sm" />

          <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3">
            <Skeleton className="h-3 w-24 rounded-sm" />
            <Skeleton className="h-3 w-20 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
