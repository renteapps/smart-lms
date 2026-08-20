export default function CourseLoading() {
  return (
    <div className="editorial-container space-y-6 pt-28" aria-busy="true" aria-label="Carregando curso">
      <div className="h-72 animate-pulse rounded-2xl bg-surface-secondary" />
      <div className="h-40 animate-pulse rounded-xl bg-surface-secondary" />
      <div className="h-40 animate-pulse rounded-xl bg-surface-secondary" />
    </div>
  );
}
