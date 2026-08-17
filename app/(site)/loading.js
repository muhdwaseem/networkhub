export default function SiteLoading() {
  return (
    <div className="container-page py-14 sm:py-20">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-10 w-3/4 max-w-xl animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-4 w-2/3 max-w-md animate-pulse rounded bg-slate-200" />

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
