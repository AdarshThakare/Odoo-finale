import Link from "next/link";

import { api } from "~/trpc/server";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<{ departmentId?: string; q?: string }>;
}) {
  const params = await searchParams;
  const departmentId = params?.departmentId ?? undefined;
  const search = params?.q?.trim() ?? undefined;

  const [employees, departments] = await Promise.all([
    api.employee.list({ departmentId, search }),
    api.settings.listDepartments(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create accounts and share generated credentials with employees.
          </p>
        </div>
        <Link
          href="/dashboard/employees/new"
          className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800"
        >
          New
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <form className="flex flex-wrap gap-3">
            <input
              name="q"
              placeholder="Search by name or email"
              defaultValue={search}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-64"
            />
            <select
              name="departmentId"
              defaultValue={departmentId ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-56"
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800"
            >
              Filter
            </button>
            <Link
              href="/dashboard/employees"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Clear
            </Link>
          </form>
        </div>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Login ID</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/employees/${employee.id}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {employee.firstName} {employee.lastName}
                  </Link>
                  <p className="text-xs text-gray-500">{employee.user.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">
                  {employee.user.loginId}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {employee.user.role}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {employee.department.name}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {employee.user.mustChangePassword
                    ? "Password reset pending"
                    : "Active"}
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                  No employees yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
