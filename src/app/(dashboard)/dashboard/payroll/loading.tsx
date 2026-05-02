export default function PayrollLoading() {
  return (
    <div className="relative rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="space-y-8">
        <div>
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-10 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        </div>
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}
