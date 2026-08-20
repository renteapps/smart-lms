export default function CoursesLoading() {
  return (
    <div className="editorial-container pt-28" aria-busy="true" aria-label="Carregando cursos">
      <div className="h-12 w-80 animate-pulse rounded-lg bg-surface-secondary" />
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-surface-secondary" />)}
      </div>
    </div>
  );
}
