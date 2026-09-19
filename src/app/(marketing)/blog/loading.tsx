export default function BlogLoading() {
  return (
    <div className="pb-24 pt-[76px]">
      <div className="editorial-container animate-pulse">
        {/* Header Skeleton */}
        <header className="mb-12 max-w-4xl pt-14 sm:pt-20">
          <div className="h-4 w-32 rounded bg-muted/20" />
          <div className="mt-4 h-12 w-3/4 max-w-lg rounded-xl bg-muted/20 md:h-14" />
          <div className="mt-5 h-6 w-full max-w-xl rounded-lg bg-muted/15" />
          <div className="mt-2 h-6 w-2/3 max-w-md rounded-lg bg-muted/15" />
        </header>

        {/* Featured Section Skeleton */}
        <section className="mb-20">
          <div className="h-80 w-full rounded-2xl border border-hairline bg-surface/50 sm:h-96 md:h-[420px]" />
        </section>

        {/* Grid Editorial Skeleton */}
        <section>
          <div className="mb-8 h-8 w-48 rounded-lg bg-muted/20" />
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface/30 p-4"
              >
                <div className="aspect-[16/10] w-full rounded-xl bg-muted/20" />
                <div className="mt-4 h-4 w-24 rounded bg-muted/20" />
                <div className="mt-2.5 h-6 w-full rounded-lg bg-muted/20" />
                <div className="mt-2 h-4 w-4/5 rounded bg-muted/15" />
                <div className="mt-6 flex items-center gap-3 border-t border-hairline pt-3">
                  <div className="size-7 rounded-full bg-muted/20" />
                  <div className="h-3.5 w-24 rounded bg-muted/20" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
