export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-4 w-40 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-200"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="h-80 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-200"
          />
        ))}
      </div>
    </div>
  );
}
