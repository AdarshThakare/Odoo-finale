import Link from "next/link";
import { Manrope, Space_Grotesk } from "next/font/google";

import { AttendanceQuickCard } from "~/components/attendance/AttendanceQuickCard";
import { ProfileMenu } from "~/components/layout/ProfileMenu";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const WORK_DAY_HOURS = 8;

type AttendanceRecord = {
  checkIn: Date | null;
  checkOut: Date | null;
  workingHours: unknown;
  status: string;
};

type CardStatus = "PRESENT" | "IN_PROGRESS" | "HALF_DAY" | "ON_LEAVE" | "ABSENT";

const statusTokens: Record<
  CardStatus,
  { label: string; dot: string; ring: string }
> = {
  PRESENT: {
    label: "Present",
    dot: "bg-emerald-400",
    ring: "ring-emerald-200/60",
  },
  IN_PROGRESS: {
    label: "Checked in",
    dot: "bg-emerald-300 animate-pulse",
    ring: "ring-emerald-200/50",
  },
  HALF_DAY: {
    label: "Half day",
    dot: "bg-lime-300",
    ring: "ring-lime-200/60",
  },
  ON_LEAVE: {
    label: "On leave",
    dot: "bg-sky-400",
    ring: "ring-sky-200/60",
  },
  ABSENT: {
    label: "Absent",
    dot: "bg-amber-400",
    ring: "ring-amber-200/60",
  },
};

function getCardStatus(record?: AttendanceRecord | null): CardStatus {
  if (!record) return "ABSENT";
  if (!record.checkIn) {
    return record.status === "ON_LEAVE" ? "ON_LEAVE" : "ABSENT";
  }
  if (!record.checkOut) return "IN_PROGRESS";
  const hours = record.workingHours ? Number(record.workingHours) : 0;
  if (hours >= WORK_DAY_HOURS) return "PRESENT";
  if (hours >= 4) return "HALF_DAY";
  return "ABSENT";
}

function initials(firstName: string, lastName: string) {
  const safeFirst = firstName.trim()[0] ?? "U";
  const safeLast = lastName.trim()[0] ?? "";
  return `${safeFirst}${safeLast}`.toUpperCase();
}

function AirplaneIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2.5 10.75c0-.41.34-.75.75-.75h6.4L20.2 5.5c.2-.08.42-.12.63-.12.63 0 1.17.45 1.29 1.06.12.63-.22 1.26-.82 1.52l-7.62 3.24 7.62 3.24c.6.26.94.89.82 1.52-.12.61-.66 1.06-1.29 1.06-.21 0-.43-.04-.63-.12L9.65 13.5h-6.4a.75.75 0 0 1-.75-.75v-2z" />
    </svg>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<{ departmentId?: string; q?: string }>;
}) {
  const params = await searchParams;
  const departmentId = params?.departmentId ?? undefined;
  const search = params?.q?.trim() ?? "";
  const session = await auth();
  const userName = session?.user?.name ?? session?.user?.email ?? "EmPay";

  const [employees, departments] = await Promise.all([
    api.employee.list({ departmentId, search: search || undefined }),
    api.settings.listDepartments(),
  ]);

  const cards = employees.map((employee) => {
    const record = employee.attendanceRecords?.[0] ?? null;
    const status = getCardStatus(record);
    return { employee, status };
  });

  const summary = cards.reduce(
    (acc, item) => {
      if (item.status === "ON_LEAVE") {
        acc.leave += 1;
      } else if (item.status === "ABSENT") {
        acc.absent += 1;
      } else {
        acc.present += 1;
      }
      return acc;
    },
    { present: 0, leave: 0, absent: 0 },
  );

  return (
    <div className={`${bodyFont.className} space-y-8`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Employee directory
          </p>
          <h1
            className={`${headingFont.className} mt-2 text-3xl text-slate-900`}
          >
            Employees
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create accounts, track availability, and open profiles in view-only
            mode.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/employees/new"
            className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
          >
            New
          </Link>
          <ProfileMenu userName={userName} />
        </div>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 text-slate-100 shadow-2xl">
        <div className="pointer-events-none absolute -left-20 -top-32 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />

        <div className="relative z-10 grid gap-6 px-6 py-6 lg:px-8 lg:py-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <form className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.03 4.39l2.29 2.29a1 1 0 0 1-1.42 1.42l-2.29-2.29A7 7 0 0 1 2 9Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <input
                  name="q"
                  placeholder="Search by name, email, or login ID"
                  defaultValue={search}
                  className="w-full rounded-full border border-slate-800/70 bg-slate-900/70 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <select
                name="departmentId"
                defaultValue={departmentId ?? ""}
                className="min-w-[180px] rounded-full border border-slate-800/70 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100"
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
                className="rounded-full bg-emerald-400/90 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.3em] text-slate-950 transition hover:bg-emerald-300"
              >
                Search
              </button>
              <Link
                href="/dashboard/employees"
                className="rounded-full border border-slate-700 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:bg-slate-800"
              >
                Clear
              </Link>
            </form>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SummaryCard
                label="Present"
                value={summary.present}
                hint="Checked in or half day"
              />
              <SummaryCard
                label="On leave"
                value={summary.leave}
                hint="Approved time off"
              />
              <SummaryCard
                label="Absent"
                value={summary.absent}
                hint="No check-in yet"
              />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {cards.map(({ employee, status }) => {
                const token = statusTokens[status];
                const accountStatus = employee.user.mustChangePassword
                  ? "Reset pending"
                  : employee.user.isActive
                    ? "Active"
                    : "Inactive";
                return (
                  <Link
                    key={employee.id}
                    href={`/dashboard/employees/${employee.id}?mode=view`}
                    className="group relative rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 shadow-lg transition hover:-translate-y-1 hover:border-slate-600/80 hover:bg-slate-900/80"
                  >
                    <span
                      className={`absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full ring-1 ${token.ring}`}
                      title={token.label}
                    >
                      {status === "ON_LEAVE" ? (
                        <AirplaneIcon className="h-4 w-4 text-sky-200" />
                      ) : (
                        <span className={`h-3 w-3 rounded-full ${token.dot}`} />
                      )}
                    </span>

                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-sm font-semibold text-slate-200">
                        {employee.avatarUrl ? (
                          <img
                            src={employee.avatarUrl}
                            alt={`${employee.firstName} ${employee.lastName}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(employee.firstName, employee.lastName)
                        )}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-white">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {employee.department.name} · {employee.designation.name}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Login ID</span>
                        <span className="font-mono text-slate-200">
                          {employee.user.loginId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Role</span>
                        <span className="text-slate-200">
                          {employee.user.role.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Account</span>
                        <span className="text-slate-200">{accountStatus}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {cards.length === 0 && (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-700/70 bg-slate-900/50 px-6 py-10 text-center text-sm text-slate-400">
                No employees yet. Create your first profile to start building the
                directory.
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <AttendanceQuickCard />
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Status legend
              </p>
              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    <span>Present</span>
                  </div>
                  <span className="text-xs text-slate-400">In office</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 items-center justify-center rounded-full bg-sky-400">
                      <AirplaneIcon className="h-2.5 w-2.5 text-slate-900" />
                    </span>
                    <span>On leave</span>
                  </div>
                  <span className="text-xs text-slate-400">Approved</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span>Absent</span>
                  </div>
                  <span className="text-xs text-slate-400">No record</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
