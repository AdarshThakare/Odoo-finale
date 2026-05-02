import Link from "next/link";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconId,
  IconMail,
  IconPlus,
  IconSearch,
  IconUserCircle,
  IconUsersGroup,
  type TablerIcon,
} from "@tabler/icons-react";

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-purple-700 uppercase">
            People directory
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">
            Search, review, and open employee profiles from one visual directory.
          </p>
        </div>
        <Link
          href="/dashboard/employees/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800 focus:ring-4 focus:ring-purple-100 focus:outline-none"
        >
          <IconPlus size={18} stroke={2} aria-hidden="true" />
          New
        </Link>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-4">
          <form className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-1">
            <label className="relative block min-w-80 flex-1">
              <IconSearch
                size={20}
                stroke={2}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
              />
              <input
                name="q"
                placeholder="Search by name, email, or login ID"
                defaultValue={search}
                className="h-12 w-full rounded-xl border border-gray-300 bg-white pr-4 pl-11 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              />
            </label>
            <select
              name="departmentId"
              defaultValue={departmentId ?? ""}
              className="h-12 w-56 shrink-0 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 shadow-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
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
              className="h-12 w-28 shrink-0 rounded-xl bg-purple-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800 focus:ring-4 focus:ring-purple-100 focus:outline-none"
            >
              Search
            </button>
            <Link
              href="/dashboard/employees"
              className="inline-flex h-12 w-24 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:ring-4 focus:ring-purple-100 focus:outline-none"
            >
              Clear
            </Link>
          </form>
        </div>

        <div className="p-4 sm:p-5">
          {employees.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {employees.map((employee) => {
                const fullName = `${employee.firstName} ${employee.lastName}`;
                const status = getEmployeeStatus(employee.user);

                return (
                  <Link
                    key={employee.id}
                    href={`/dashboard/employees/${employee.id}`}
                    className="group min-h-56 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md focus:ring-4 focus:ring-purple-100 focus:outline-none"
                    aria-label={`Open profile for ${fullName}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <Avatar
                          avatarUrl={employee.avatarUrl}
                          name={fullName}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-lg font-bold text-gray-950 group-hover:text-purple-700">
                            {fullName}
                          </p>
                          <p className="mt-1 truncate text-sm font-medium text-gray-500">
                            {employee.designation.name}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={status} />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <InfoPill label="Department" value={employee.department.name} />
                      <InfoPill label="Role" value={formatRole(employee.user.role)} />
                    </div>

                    <div className="mt-4 space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-3">
                      <ContactLine
                        icon={IconMail}
                        value={employee.user.email}
                      />
                      <ContactLine
                        icon={IconId}
                        value={employee.user.loginId ?? employee.employeeCode}
                        mono
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
              <IconUsersGroup
                size={44}
                stroke={1.7}
                aria-hidden="true"
                className="text-gray-400"
              />
              <h2 className="mt-4 text-lg font-bold text-gray-950">
                No employees found
              </h2>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                Try a different search or add your first employee account.
              </p>
              <Link
                href="/dashboard/employees/new"
                className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-purple-700 px-4 text-sm font-semibold text-white transition hover:bg-purple-800"
              >
                Add employee
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Avatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (avatarUrl) {
    return (
      <div
        className="h-16 w-16 shrink-0 rounded-lg border border-purple-100 bg-cover bg-center shadow-sm"
        style={{ backgroundImage: `url(${avatarUrl})` }}
        aria-label={`${name} avatar`}
        role="img"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-purple-100 bg-purple-50 text-purple-700 shadow-sm">
      {initials ? (
        <span className="text-lg font-bold">{initials}</span>
      ) : (
        <IconUserCircle size={34} stroke={1.6} aria-hidden="true" />
      )}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-gray-400 uppercase">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-gray-800">
        {value}
      </p>
    </div>
  );
}

function ContactLine({
  icon: Icon,
  value,
  mono = false,
}: {
  icon: TablerIcon;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-gray-600">
      <Icon
        size={17}
        stroke={1.9}
        aria-hidden="true"
        className="shrink-0 text-gray-400"
      />
      <span
        className={`truncate ${
          mono ? "font-mono font-semibold text-gray-800" : "font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ReturnType<typeof getEmployeeStatus>;
}) {
  const StatusIcon = status.icon;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${status.badgeClass}`}
    >
      <StatusIcon size={14} stroke={2.2} aria-hidden="true" />
      {status.label}
    </span>
  );
}

function formatRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function getEmployeeStatus(user: {
  isActive: boolean;
  mustChangePassword: boolean;
}) {
  if (!user.isActive) {
    return {
      label: "Inactive",
      badgeClass: "bg-gray-100 text-gray-600",
      icon: IconCircleX,
    };
  }

  if (user.mustChangePassword) {
    return {
      label: "First login pending",
      badgeClass: "bg-amber-50 text-amber-700",
      icon: IconAlertTriangle,
    };
  }

  return {
    label: "Active",
    badgeClass: "bg-emerald-50 text-emerald-700",
    icon: IconCircleCheck,
  };
}
