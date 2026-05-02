import Link from "next/link";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconFilter,
  IconId,
  IconMail,
  IconPlus,
  IconSearch,
  IconUserCircle,
  IconUsersGroup,
  type TablerIcon,
} from "@tabler/icons-react";

import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<{ departmentId?: string; q?: string }>;
}) {
  const params = await searchParams;
  const departmentId = params?.departmentId ?? undefined;
  const search = params?.q?.trim() ?? undefined;

  const session = await auth();
  const canManageEmployees =
    session?.user?.role === "ADMIN" || session?.user?.role === "HR_OFFICER";

  const [employees, departments, todayAttendance] = await Promise.all([
    api.employee.list({ departmentId, search }),
    api.settings.listDepartments(),
    api.attendance.getTodaySummary().catch(() => []),
  ]);

  const presentEmployeeIds = new Set(todayAttendance);
  const presentCount = employees.filter((employee) =>
    presentEmployeeIds.has(employee.id),
  ).length;
  const absentCount = Math.max(employees.length - presentCount, 0);
  const activeCount = employees.filter(
    (employee) => employee.user.isActive,
  ).length;
  const pendingLoginCount = employees.filter(
    (employee) => employee.user.mustChangePassword,
  ).length;
  const filteredDepartment = departments.find(
    (department) => department.id === departmentId,
  );

  return (
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="relative space-y-8">
        <header
          className="dash-fade-up flex flex-wrap items-start justify-between gap-4 opacity-0 motion-reduce:animate-none motion-reduce:opacity-100"
          style={{ animationDelay: "40ms" }}
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
              People directory
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Employees
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Search, review, and open employee profiles from one visual
              directory.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200/70">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              {filteredDepartment?.name ?? "All departments"}
            </div>
            {canManageEmployees && (
              <Link
                href="/dashboard/employees/new"
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none"
              >
                <IconPlus size={16} stroke={2} aria-hidden="true" />
                New employee
              </Link>
            )}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Directory"
            value={employees.length}
            detail={`${activeCount} active profiles`}
            delay="80ms"
          />
          <SummaryCard
            label="Present today"
            value={presentCount}
            detail={`${absentCount} not marked present`}
            delay="120ms"
          />
          <SummaryCard
            label="Departments"
            value={departments.length}
            detail={filteredDepartment?.name ?? "All teams included"}
            delay="160ms"
          />
          <SummaryCard
            label="First login"
            value={pendingLoginCount}
            detail="Accounts awaiting setup"
            delay="200ms"
          />
        </section>

        <section
          className="dash-fade-up overflow-hidden rounded-2xl bg-white opacity-0 shadow-sm ring-1 ring-slate-200/70 motion-reduce:animate-none motion-reduce:opacity-100"
          style={{ animationDelay: "240ms" }}
        >
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
            <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_auto_auto]">
              <label className="relative block min-w-0">
                <IconSearch
                  size={19}
                  stroke={2}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="q"
                  placeholder="Search by name, email, or login ID"
                  defaultValue={search}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-11 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>
              <label className="relative block">
                <IconFilter
                  size={18}
                  stroke={2}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                />
                <select
                  name="departmentId"
                  defaultValue={departmentId ?? ""}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-11 text-sm font-medium text-slate-900 shadow-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="">All departments</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="h-12 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:ring-4 focus:ring-violet-100 focus:outline-none"
              >
                Search
              </button>
              <Link
                href="/dashboard/employees"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:ring-4 focus:ring-violet-100 focus:outline-none"
              >
                Clear
              </Link>
            </form>
          </div>

          <div className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-medium text-slate-900">
                  Employee cards
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {employees.length} profile{employees.length !== 1 ? "s" : ""}{" "}
                  in view
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                  Present
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  Not present
                </span>
              </div>
            </div>

            {employees.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {employees.map((employee, index) => {
                  const fullName = `${employee.firstName} ${employee.lastName}`;
                  const status = getEmployeeStatus(employee.user);
                  const isPresent = presentEmployeeIds.has(employee.id);

                  return (
                    <Link
                      key={employee.id}
                      href={`/dashboard/employees/${employee.id}`}
                      className="dash-fade-up group min-h-56 rounded-2xl bg-white p-5 opacity-0 shadow-sm ring-1 ring-slate-200/70 transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none motion-reduce:animate-none motion-reduce:opacity-100"
                      style={{ animationDelay: `${280 + index * 35}ms` }}
                      aria-label={`Open profile for ${fullName}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="relative">
                            <Avatar
                              avatarUrl={employee.avatarUrl}
                              name={fullName}
                            />
                            <span
                              className={`absolute -right-1 -bottom-1 block h-4 w-4 rounded-full border-2 border-white ${
                                isPresent ? "bg-violet-500" : "bg-slate-300"
                              }`}
                              aria-label={
                                isPresent
                                  ? "Present today"
                                  : "Not present today"
                              }
                              title={
                                isPresent
                                  ? "Present today"
                                  : "Not present today"
                              }
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold text-slate-900 transition group-hover:text-violet-700">
                              {fullName}
                            </p>
                            <p className="mt-1 truncate text-sm font-medium text-slate-500">
                              {employee.designation.name}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={status} />
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <InfoPill
                          label="Department"
                          value={employee.department.name}
                        />
                        <InfoPill
                          label="Role"
                          value={formatRole(employee.user.role)}
                        />
                      </div>

                      <div className="mt-4 space-y-2 rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-3">
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
              <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                  <IconUsersGroup size={26} stroke={1.8} aria-hidden="true" />
                </span>
                <h2 className="font-display mt-4 text-lg font-semibold text-slate-900">
                  No employees found
                </h2>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Try a different search or add your first employee account.
                </p>
                {canManageEmployees && (
                  <Link
                    href="/dashboard/employees/new"
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700"
                  >
                    Add employee
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  delay,
}: {
  label: string;
  value: number;
  detail: string;
  delay: string;
}) {
  return (
    <div
      className="dash-fade-up rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-4 opacity-0 shadow-sm ring-1 ring-slate-200/70 transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md motion-reduce:animate-none motion-reduce:opacity-100"
      style={{ animationDelay: delay }}
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="font-display mt-1 text-2xl font-semibold text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
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
        className="h-16 w-16 shrink-0 rounded-2xl border border-violet-100 bg-cover bg-center shadow-sm"
        style={{ backgroundImage: `url(${avatarUrl})` }}
        aria-label={`${name} avatar`}
        role="img"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-700 shadow-sm">
      {initials ? (
        <span className="text-lg font-semibold">{initials}</span>
      ) : (
        <IconUserCircle size={34} stroke={1.6} aria-hidden="true" />
      )}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/70 bg-white px-3 py-2.5">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-800">
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
    <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
      <Icon
        size={17}
        stroke={1.9}
        aria-hidden="true"
        className="shrink-0 text-slate-400"
      />
      <span
        className={`truncate ${
          mono ? "font-mono font-semibold text-slate-800" : "font-medium"
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
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.badgeClass}`}
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
      badgeClass: "bg-slate-100 text-slate-600",
      icon: IconCircleX,
    };
  }

  if (user.mustChangePassword) {
    return {
      label: "First login pending",
      badgeClass: "bg-violet-50 text-violet-700",
      icon: IconAlertTriangle,
    };
  }

  return {
    label: "Active",
    badgeClass: "bg-indigo-50 text-indigo-700",
    icon: IconCircleCheck,
  };
}
