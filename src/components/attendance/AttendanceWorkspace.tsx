"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconLogin2,
  IconLogout2,
  IconSearch,
  IconUsersGroup,
  type TablerIcon,
} from "@tabler/icons-react";

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
      canSwitchView?: boolean;
    }
  | {
      mode: "team";
      data: TeamAttendanceData;
      basePath: string;
      prevHref: string;
      nextHref: string;
      canSwitchView?: boolean;
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

const cardAnimation =
  "dash-fade-up opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none";

function EmployeeAttendanceWorkspace({
  data,
  basePath,
  prevHref,
  nextHref,
  canSwitchView,
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
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="relative space-y-8">
        <PageHeader
          eyebrow="Attendance / My view"
          title="My attendance"
          description={`${data.company.name} - ${data.employee.department} - ${data.employee.designation}`}
          delay="40ms"
          actions={
            <div className="flex flex-wrap items-center gap-4">
              {canSwitchView && <ViewSwitch active="mine" />}
              <div className="flex flex-wrap gap-2">
                <LinkButton href={prevHref} icon={IconChevronLeft}>
                  Previous
                </LinkButton>
                <LinkButton href={nextHref} icon={IconChevronRight} iconAfter>
                  Next
                </LinkButton>
              </div>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={IconCalendar}
            label="Present"
            value={data.stats.daysPresent}
            detail={data.month.label}
            delay="80ms"
          />
          <MetricCard
            icon={IconClock}
            label="Leaves"
            value={data.stats.leaveCount}
            detail="Approved leave days"
            delay="120ms"
          />
          <MetricCard
            icon={IconUsersGroup}
            label="Working days"
            value={data.stats.totalWorkingDays}
            detail="For selected month"
            delay="160ms"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <InfoPanel
              title="Attendance rules"
              badge={data.stats.currentlyCheckedIn ? "Checked in" : "Ready"}
              lines={noteLines.mine}
              delay="200ms"
            />

            <section
              className={`${cardAnimation} rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70`}
              style={{ animationDelay: "240ms" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-sm font-medium text-slate-900">
                    Punch clock
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {data.month.label}
                  </p>
                </div>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                  {data.stats.currentlyCheckedIn ? "Active" : "Idle"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => checkIn.mutate()}
                  disabled={checkIn.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
                >
                  <IconLogin2 size={17} stroke={2} aria-hidden="true" />
                  {checkIn.isPending ? "Recording..." : "Check in"}
                </button>
                <button
                  type="button"
                  onClick={() => checkOut.mutate()}
                  disabled={checkOut.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-60"
                >
                  <IconLogout2 size={17} stroke={2} aria-hidden="true" />
                  {checkOut.isPending ? "Recording..." : "Check out"}
                </button>
              </div>

              {message && (
                <p className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-700 ring-1 ring-violet-100">
                  {message}
                </p>
              )}
              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                  {error}
                </p>
              )}
            </section>
          </aside>

          <section
            className={`${cardAnimation} overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70`}
            style={{ animationDelay: "280ms" }}
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4">
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
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
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
    </div>
  );
}

function TeamAttendanceWorkspace({
  data,
  basePath,
  prevHref,
  nextHref,
  canSwitchView,
}: Extract<AttendanceWorkspaceProps, { mode: "team" }>) {
  return (
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="relative space-y-8">
        <PageHeader
          eyebrow="Attendance / Team view"
          title="Team attendance"
          description={`For Admin / HR Officer / Payroll Officer - ${data.company.name}`}
          delay="40ms"
          actions={
            <div className="flex flex-wrap items-center gap-4">
              {canSwitchView && <ViewSwitch active="team" />}
              <div className="flex flex-wrap gap-2">
                <LinkButton href={prevHref} icon={IconChevronLeft}>
                  Previous
                </LinkButton>
                <LinkButton href={nextHref} icon={IconChevronRight} iconAfter>
                  Next
                </LinkButton>
              </div>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            icon={IconCalendar}
            label="Present"
            value={data.stats.presentCount}
            detail={data.date.label}
            delay="80ms"
          />
          <MetricCard
            icon={IconClock}
            label="In progress"
            value={data.stats.inProgressCount}
            detail="Currently checked in"
            delay="120ms"
          />
          <MetricCard
            icon={IconLogout2}
            label="Absent"
            value={data.stats.absentCount}
            detail="No present record"
            delay="160ms"
          />
          <MetricCard
            icon={IconUsersGroup}
            label="Employees"
            value={data.stats.totalEmployees}
            detail="In attendance scope"
            delay="200ms"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <InfoPanel
              title="Attendance rules"
              badge={data.date.weekday}
              lines={noteLines.team}
              delay="240ms"
            />
            <section
              className={`${cardAnimation} grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:grid-cols-2`}
              style={{ animationDelay: "280ms" }}
            >
              <MiniStat label="Present today" value={data.stats.presentCount} />
              <MiniStat label="Leaves" value={data.stats.leaveCount} />
              <MiniStat label="Selected date" value={data.date.label} />
              <MiniStat
                label="Employees scanned"
                value={data.stats.totalEmployees}
              />
            </section>
          </aside>

          <section
            className={`${cardAnimation} overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70`}
            style={{ animationDelay: "320ms" }}
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4">
              <form
                action={basePath}
                method="get"
                className="flex flex-wrap items-center gap-3"
              >
                <Pill>{data.date.label}</Pill>
                <Pill>{data.date.weekday}</Pill>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <label className="relative block w-full sm:w-56">
                    <IconSearch
                      size={17}
                      stroke={2}
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      name="search"
                      defaultValue={data.search}
                      placeholder="Search employees"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </label>
                  <input type="hidden" name="date" value={data.date.key} />
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
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
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  delay,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions: React.ReactNode;
  delay: string;
}) {
  return (
    <header
      className={`${cardAnimation} flex flex-wrap items-start justify-between gap-4`}
      style={{ animationDelay: delay }}
    >
      <div>
        <p className="text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
          {eyebrow}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
      {actions}
    </header>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  delay,
}: {
  icon: TablerIcon;
  label: string;
  value: number;
  detail: string;
  delay: string;
}) {
  return (
    <div
      className={`${cardAnimation} rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-4 shadow-sm ring-1 ring-slate-200/70 transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-100">
          <Icon size={19} stroke={1.9} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            {label}
          </p>
          <p className="font-display mt-1 text-2xl font-semibold text-slate-900">
            {value}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-4">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoPanel({
  title,
  badge,
  lines,
  delay,
}: {
  title: string;
  badge: string;
  lines: readonly string[];
  delay: string;
}) {
  return (
    <section
      className={`${cardAnimation} rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-sm font-medium text-slate-900">
          {title}
        </h2>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
          {badge}
        </span>
      </div>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
        {lines.map((line) => (
          <li key={line} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ViewSwitch({ active }: { active: "mine" | "team" }) {
  return (
    <div className="flex rounded-full bg-slate-100 p-1 ring-1 ring-slate-200/70">
      <Link
        href="?view=mine"
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          active === "mine"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        My Attendance
      </Link>
      <Link
        href="?view=team"
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          active === "team"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Team Attendance
      </Link>
    </div>
  );
}

function LinkButton({
  href,
  children,
  icon: Icon,
  iconAfter = false,
}: {
  href: string;
  children: React.ReactNode;
  icon?: TablerIcon;
  iconAfter?: boolean;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      {Icon && !iconAfter ? (
        <Icon size={15} stroke={2} aria-hidden="true" />
      ) : null}
      {children}
      {Icon && iconAfter ? (
        <Icon size={15} stroke={2} aria-hidden="true" />
      ) : null}
    </Link>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70">
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
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-white text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-5 py-3">Employee / Date</th>
            <th className="px-5 py-3">Check in</th>
            <th className="px-5 py-3">Check out</th>
            <th className="px-5 py-3">Work hours</th>
            <th className="px-5 py-3">Extra hours</th>
            <th className="px-5 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-5 py-3">
                <p className="font-medium text-slate-900">{row.primary}</p>
                <p className="text-xs text-slate-500">{row.secondary}</p>
              </td>
              <td className="px-5 py-3 font-mono text-slate-700">
                {row.checkIn ?? "-"}
              </td>
              <td className="px-5 py-3 font-mono text-slate-700">
                {row.checkOut ?? "-"}
              </td>
              <td className="px-5 py-3 font-mono text-slate-700">
                {row.workingHours ?? "-"}
              </td>
              <td className="px-5 py-3 font-mono text-slate-700">
                {row.extraHours ?? "-"}
              </td>
              <td className="px-5 py-3">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-5 py-10 text-center text-slate-500" colSpan={6}>
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
    ABSENT: "bg-rose-50 text-rose-700 ring-rose-100",
    PRESENT: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    HALF_DAY: "bg-violet-50 text-violet-700 ring-violet-100",
    ON_LEAVE: "bg-slate-100 text-slate-700 ring-slate-200",
    IN_PROGRESS: "bg-violet-50 text-violet-700 ring-violet-100",
  };

  return (
    <span
      className={`inline-flex min-w-20 justify-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
