export default function EmployeesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-44 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="h-10 w-20 animate-pulse rounded-lg bg-gray-200" />
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-200" />
    </div>
  );
}
