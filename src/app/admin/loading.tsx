export default function AdminLoading() {
  return (
    <div className="space-y-7" aria-busy="true" aria-label="Carregando área administrativa">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-secondary" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-surface-secondary" />)}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-surface-secondary" />
    </div>
  );
}
