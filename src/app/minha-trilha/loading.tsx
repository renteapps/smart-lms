import { Skeleton } from "@heroui/react/skeleton";

export default function MinhaTrilhaLoading() {
  return (
    <div
      className="editorial-container min-h-dvh px-4 pb-24 pt-8 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Carregando sua trilha..."
    >
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>

      {/* Tabs / Segment control skeleton */}
      <div className="mt-8 flex gap-3 border-b border-border pb-3">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Hero / Next Step Card skeleton */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-surface lg:col-span-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <Skeleton className="h-7 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <div className="flex items-center gap-4 pt-4">
            <Skeleton className="h-11 w-44 rounded-xl" />
            <Skeleton className="h-11 w-32 rounded-xl" />
          </div>
        </div>

        {/* Progress sidebar skeleton */}
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-surface">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-5/6 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
