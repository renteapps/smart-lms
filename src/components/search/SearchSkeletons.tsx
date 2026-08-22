import { Skeleton } from "@heroui/react";

export function SearchSkeletons() {
  // Retorna um grid com 6 skeletons simulando os cards
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex h-56 flex-col justify-between rounded-2xl border border-border/50 bg-surface/50 p-5 shadow-sm sm:p-6"
        >
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-xl" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>

            <Skeleton className="mb-2 h-6 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="mt-1 h-4 w-5/6 rounded-md" />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
