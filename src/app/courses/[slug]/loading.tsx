export default function CourseLoading() {
  return (
    <div className="editorial-container space-y-6 pt-20 sm:pt-[76px] py-5 sm:py-8 lg:py-10 pb-16 sm:pb-24" aria-busy="true" aria-label="Carregando curso">
      <div className="h-60 sm:h-72 lg:h-80 animate-pulse rounded-xl sm:rounded-2xl bg-surface-secondary" />
      <div className="grid gap-6 sm:gap-8 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 lg:order-1 space-y-3.5 sm:space-y-4">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-surface-secondary" />
          <div className="h-20 animate-pulse rounded-xl sm:rounded-2xl bg-surface-secondary" />
          <div className="h-20 animate-pulse rounded-xl sm:rounded-2xl bg-surface-secondary" />
          <div className="h-20 animate-pulse rounded-xl sm:rounded-2xl bg-surface-secondary" />
        </div>
        <div className="order-1 lg:order-2 h-64 animate-pulse rounded-xl sm:rounded-2xl bg-surface-secondary" />
      </div>
    </div>
  );
}
