"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "~/trpc/react";

type AttendanceStatus =
  | "ABSENT"
  | "PRESENT"
  | "HALF_DAY"
  | "ON_LEAVE"
  | "IN_PROGRESS";

type EmployeeAttendanceDay = {
  date: string;
  weekday: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: string | null;
  extraHours: string | null;
  status: AttendanceStatus;
};

type EmployeeAttendanceData = {
  company: {
    name: string;
    code: string;
    logoUrl: string | null;
  };
  employee: {
    name: string;
    employeeCode: string;
    department: string;
    designation: string;
  };
  month: {
    key: string;
    label: string;
    startDate: string;
    endDate: string;
    totalWorkingDays: number;
  };
  stats: {
    daysPresent: number;
    leaveCount: number;
    totalWorkingDays: number;
    currentlyCheckedIn: boolean;
  };
  days: EmployeeAttendanceDay[];
};

type TeamAttendanceRow = {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: string;
  designation: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: string | null;
  extraHours: string | null;
  status: AttendanceStatus;
};

type TeamAttendanceData = {
  company: {
    name: string;
    code: string;
    logoUrl: string | null;
  };
  date: {
    key: string;
    label: string;
    weekday: string;
  };
  search: string;
  stats: {
    totalEmployees: number;
    presentCount: number;
    inProgressCount: number;
    leaveCount: number;
    absentCount: number;
  };
  rows: TeamAttendanceRow[];
};

type AttendanceWorkspaceProps =
  | {
      mode: "mine";
      data: EmployeeAttendanceData;
      basePath: string;
      prevHref: string;
      nextHref: string;
    }
  | {
      mode: "team";
      data: TeamAttendanceData;
      basePath: string;
      prevHref: string;
      nextHref: string;
    };

const noteLines = {
  mine: [
    "This view follows your day-wise attendance for the selected month.",
    "Check-out finalizes working hours and feeds payroll calculations.",
    "Missing attendance or unpaid leave reduces payable days automatically.",
  ],
  team: [
    "Managers see the current day by default and can search across company staff.",
    "Attendance entries are the source of truth for payroll and leave deduction.",
    "Only employees with a record for the selected date are listed here.",
  ],
} as const;

export function AttendanceWorkspace(props: AttendanceWorkspaceProps) {
  if (props.mode === "mine") {
    return <EmployeeAttendanceWorkspace {...props} />;
  }

  return <TeamAttendanceWorkspace {...props} />;
}

function EmployeeAttendanceWorkspace({
  data,
  basePath,
  prevHref,
  nextHref,
}: Extract<AttendanceWorkspaceProps, { mode: "mine" }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkIn = api.attendance.checkIn.useMutation({
    onSuccess: () => {
      setMessage("Check-in recorded.");
      setError(null);
      router.refresh();
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(mutationError.message);
    },
  });

  const checkOut = api.attendance.checkOut.useMutation({
    onSuccess: () => {
      setMessage("Check-out recorded.");
      setError(null);
      router.refresh();
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(mutationError.message);
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Attendance / My view"
        title="My attendance"
        description={`${data.company.name} - ${data.employee.department} - ${data.employee.designation}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={prevHref}>Previous</LinkButton>
            <LinkButton href={nextHref}>Next</LinkButton>
          </div>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Present" value={data.stats.daysPresent} />
        <MetricCard label="Leaves" value={data.stats.leaveCount} />
        <MetricCard label="Working days" value={data.stats.totalWorkingDays} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <InfoPanel
            title="Attendance rules"
            badge={data.stats.currentlyCheckedIn ? "Checked in" : "Ready"}
            lines={noteLines.mine}
          />

          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900">Punch clock</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {data.month.label}
                </p>
              </div>
              <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">
                {data.stats.currentlyCheckedIn ? "Active" : "Idle"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => checkIn.mutate()}
                disabled={checkIn.isPending}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
              >
                {checkIn.isPending ? "Recording..." : "Check in"}
              </button>
              <button
                type="button"
                onClick={() => checkOut.mutate()}
                disabled={checkOut.isPending}
                className="rounded-lg border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60"
              >
                {checkOut.isPending ? "Recording..." : "Check out"}
              </button>
            </div>

            {message && (
              <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 ring-1 ring-green-200">
                {message}
              </p>
            )}
            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}
          </section>
        </aside>

        <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <form
              action={basePath}
              method="get"
              className="flex flex-wrap items-center gap-3"
            >
              <Pill>{data.employee.employeeCode}</Pill>
              <Pill>{data.employee.name}</Pill>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <input
                  name="month"
                  type="month"
                  defaultValue={data.month.key}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800"
                >
                  Go
                </button>
              </div>
            </form>
          </div>
          <AttendanceTable
            rows={data.days.map((day) => ({
              key: day.date,
              primary: day.date,
              secondary: day.weekday,
              checkIn: day.checkIn,
              checkOut: day.checkOut,
              workingHours: day.workingHours,
              extraHours: day.extraHours,
              status: day.status,
            }))}
            empty="No attendance records for this month."
          />
        </section>
      </div>
    </div>
  );
}

function TeamAttendanceWorkspace({
  data,
  basePath,
  prevHref,
  nextHref,
}: Extract<AttendanceWorkspaceProps, { mode: "team" }>) {
  return (
    <div>
      <PageHeader
        eyebrow="Attendance / Team view"
        title="Team attendance"
        description={`For Admin / HR Officer / Payroll Officer - ${data.company.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={prevHref}>Previous</LinkButton>
            <LinkButton href={nextHref}>Next</LinkButton>
          </div>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Present" value={data.stats.presentCount} />
        <MetricCard label="In progress" value={data.stats.inProgressCount} />
        <MetricCard label="Absent" value={data.stats.absentCount} />
        <MetricCard label="Employees" value={data.stats.totalEmployees} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <InfoPanel
            title="Attendance rules"
            badge={data.date.weekday}
            lines={noteLines.team}
          />
          <section className="grid gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:grid-cols-2">
            <MiniStat label="Present today" value={data.stats.presentCount} />
            <MiniStat label="Leaves" value={data.stats.leaveCount} />
            <MiniStat label="Selected date" value={data.date.label} />
            <MiniStat label="Employees scanned" value={data.stats.totalEmployees} />
          </section>
        </aside>

        <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <form
              action={basePath}
              method="get"
              className="flex flex-wrap items-center gap-3"
            >
              <Pill>{data.date.label}</Pill>
              <Pill>{data.date.weekday}</Pill>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <input
                  name="search"
                  defaultValue={data.search}
                  placeholder="Search employees"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500 sm:w-48"
                />
                <input type="hidden" name="date" value={data.date.key} />
                <button
                  type="submit"
                  className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
          <AttendanceTable
            rows={data.rows.map((row) => ({
              key: row.employeeId,
              primary: row.name,
              secondary: `${row.employeeCode} - ${row.department}`,
              checkIn: row.checkIn,
              checkOut: row.checkOut,
              workingHours: row.workingHours,
              extraHours: row.extraHours,
              status: row.status,
            }))}
            empty="No attendance records for this date."
          />
        </section>
      </div>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold tracking-wide text-purple-700 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {actions}
    </header>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function InfoPanel({
  title,
  badge,
  lines,
}: {
  title: string;
  badge: string;
  lines: readonly string[];
}) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">
          {badge}
        </span>
      </div>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
        {lines.map((line) => (
          <li key={line} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-600" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
    >
      {children}
    </Link>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200">
      {children}
    </span>
  );
}

function AttendanceTable({
  rows,
  empty,
}: {
  rows: Array<{
    key: string;
    primary: string;
    secondary: string;
    checkIn: string | null;
    checkOut: string | null;
    workingHours: string | null;
    extraHours: string | null;
    status: AttendanceStatus;
  }>;
  empty: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-3">Employee / Date</th>
            <th className="px-4 py-3">Check in</th>
            <th className="px-4 py-3">Check out</th>
            <th className="px-4 py-3">Work hours</th>
            <th className="px-4 py-3">Extra hours</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{row.primary}</p>
                <p className="text-xs text-gray-500">{row.secondary}</p>
              </td>
              <td className="px-4 py-3 font-mono text-gray-700">
                {row.checkIn ?? "-"}
              </td>
              <td className="px-4 py-3 font-mono text-gray-700">
                {row.checkOut ?? "-"}
              </td>
              <td className="px-4 py-3 font-mono text-gray-700">
                {row.workingHours ?? "-"}
              </td>
              <td className="px-4 py-3 font-mono text-gray-700">
                {row.extraHours ?? "-"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const styles: Record<AttendanceStatus, string> = {
    ABSENT: "bg-red-50 text-red-700 ring-red-200",
    PRESENT: "bg-green-50 text-green-700 ring-green-200",
    HALF_DAY: "bg-amber-50 text-amber-700 ring-amber-200",
    ON_LEAVE: "bg-blue-50 text-blue-700 ring-blue-200",
    IN_PROGRESS: "bg-purple-50 text-purple-700 ring-purple-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ${styles[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
