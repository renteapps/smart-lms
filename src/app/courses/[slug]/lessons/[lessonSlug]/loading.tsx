import { Skeleton } from "@heroui/react/skeleton";

export default function LessonLoading() {
  return (
    <div
      className="min-h-screen pb-16 pt-4 sm:pt-6"
      aria-busy="true"
      aria-label="Carregando aula..."
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Topbar / Navigation skeleton */}
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>

        {/* Video Player / Stage skeleton */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-surface">
          <Skeleton className="aspect-video w-full" />
        </div>

        {/* Action bar skeleton */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        {/* Tabs skeleton */}
        <div className="mt-8 space-y-4">
          <div className="flex gap-2 border-b border-border pb-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-5/6 rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
