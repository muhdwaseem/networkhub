export default function ProductsLoading() {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="max-w-2xl">
        <div className="h-9 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-slate-200" />
      </div>

      <div className="mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 sm:w-56" />
          <div className="flex gap-2">
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 sm:w-56" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 sm:w-64" />
          </div>
        </div>

        <div className="mt-4 h-4 w-40 animate-pulse rounded bg-slate-200" />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="aspect-[4/3] animate-pulse bg-slate-200" />
              <div className="p-4">
                <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-4 w-full animate-pulse rounded bg-slate-200" />
                <div className="mt-1 h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="h-8 animate-pulse rounded bg-slate-200" />
                  <div className="h-8 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
