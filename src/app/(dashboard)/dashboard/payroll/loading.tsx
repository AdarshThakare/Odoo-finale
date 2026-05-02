export default function PayrollLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="h-32 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-200" />
      <div className="h-80 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-200" />
    </div>
  );
}
