export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="h-40 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-200" />
      <div className="h-12 w-full max-w-xl animate-pulse rounded-lg bg-gray-200" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-96 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-200" />
        <div className="h-96 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-200" />
      </div>
    </div>
  );
}
