"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "~/trpc/react";

type EmployeeAttendanceDay = {
  date: string;
  weekday: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: string | null;
  extraHours: string | null;
  status: "ABSENT" | "PRESENT" | "HALF_DAY" | "ON_LEAVE" | "IN_PROGRESS";
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
  status: "ABSENT" | "PRESENT" | "HALF_DAY" | "ON_LEAVE" | "IN_PROGRESS";
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
    onSuccess: async () => {
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
    onSuccess: async () => {
      setMessage("Check-out recorded.");
      setError(null);
      router.refresh();
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(mutationError.message);
    },
  });

  const currentStatus = data.stats.currentlyCheckedIn ? "Checked in" : "Ready";
  const currentMonthLabel = data.month.label;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#090909] px-4 py-6 text-[#f5f1e8] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <header className="grid gap-4 rounded-[28px] border border-white/20 bg-white/5 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] md:p-6">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#9cb3b0] uppercase">
              Attendance / My view
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#faf7ef] sm:text-4xl">
              Attendance List view
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c9c2b4]">
              {data.company.name} • {data.employee.department} •{" "}
              {data.employee.designation}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Present" value={String(data.stats.daysPresent)} />
            <StatCard label="Leaves" value={String(data.stats.leaveCount)} />
            <StatCard
              label="Working days"
              value={String(data.stats.totalWorkingDays)}
            />
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <aside className="space-y-6">
            <section className="rounded-[28px] border border-white/20 bg-[#0f0f0f] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-4">
                <div>
                  <p className="text-xs tracking-[0.3em] text-[#8ca3a0] uppercase">
                    Note
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[#fbf7ee]">
                    Attendance rules
                  </h2>
                </div>
                <div className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-[#d9d2c6]">
                  {currentStatus}
                </div>
              </div>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#d0cabf]">
                {noteLines.mine.map((line) => (
                  <li key={line} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8ac6a2]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[28px] border border-white/20 bg-[#111111] p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs tracking-[0.3em] text-[#8ca3a0] uppercase">
                    Actions
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[#faf7ef]">
                    Punch clock
                  </h2>
                </div>
                <div className="rounded-full border border-white/15 px-3 py-1 text-xs text-[#d5cfbf]">
                  {currentMonthLabel}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => checkIn.mutate()}
                  disabled={checkIn.isPending}
                  className="rounded-2xl border border-[#8ac6a2]/40 bg-[#102018] px-4 py-3 text-sm font-semibold text-[#e4f5e9] transition hover:bg-[#13261c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkIn.isPending ? "Recording..." : "Check in"}
                </button>
                <button
                  type="button"
                  onClick={() => checkOut.mutate()}
                  disabled={checkOut.isPending}
                  className="rounded-2xl border border-[#f1c27d]/40 bg-[#221a10] px-4 py-3 text-sm font-semibold text-[#f8edd8] transition hover:bg-[#2b2114] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkOut.isPending ? "Recording..." : "Check out"}
                </button>
              </div>

              {message && (
                <p className="mt-4 rounded-2xl border border-[#8ac6a2]/30 bg-[#102018] px-4 py-3 text-sm text-[#cde6d3]">
                  {message}
                </p>
              )}
              {error && (
                <p className="mt-4 rounded-2xl border border-[#f3a6a6]/30 bg-[#221111] px-4 py-3 text-sm text-[#f0c5c5]">
                  {error}
                </p>
              )}
            </section>
          </aside>

          <section className="overflow-hidden rounded-[28px] border border-white/20 bg-[#0f0f0f] shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col gap-4 border-b border-white/15 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-[#f4efe4]">
                  {data.company.name}
                </div>
                <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-[#d7d0c3]">
                  {data.employee.employeeCode}
                </div>
                <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-[#d7d0c3]">
                  {data.employee.name}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Link
                    href={prevHref}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#f5f1e8] transition hover:bg-white/10"
                  >
                    ←
                  </Link>
                  <Link
                    href={nextHref}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#f5f1e8] transition hover:bg-white/10"
                  >
                    →
                  </Link>
                  <form
                    action={basePath}
                    method="get"
                    className="flex items-center gap-2"
                  >
                    <input
                      name="month"
                      type="month"
                      defaultValue={data.month.key}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#f5f1e8] outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-[#f5f1e8] transition hover:bg-white/15"
                    >
                      Go
                    </button>
                  </form>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs tracking-[0.24em] text-[#a9a49a] uppercase">
                      <th className="border-r border-b border-white/10 px-4 py-3">
                        Date
                      </th>
                      <th className="border-r border-b border-white/10 px-4 py-3">
                        Check in
                      </th>
                      <th className="border-r border-b border-white/10 px-4 py-3">
                        Check out
                      </th>
                      <th className="border-r border-b border-white/10 px-4 py-3">
                        Work hours
                      </th>
                      <th className="border-r border-b border-white/10 px-4 py-3">
                        Extra hours
                      </th>
                      <th className="border-b border-white/10 px-4 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.days.map((day) => (
                      <tr key={day.date} className="text-[#efe8db]">
                        <td className="border-r border-b border-white/10 px-4 py-3 align-top">
                          <div className="font-medium text-[#fbf7ee]">
                            {day.date}
                          </div>
                          <div className="text-xs text-[#a9a49a]">
                            {day.weekday}
                          </div>
                        </td>
                        <td className="border-r border-b border-white/10 px-4 py-3 font-mono">
                          {day.checkIn ?? "—"}
                        </td>
                        <td className="border-r border-b border-white/10 px-4 py-3 font-mono">
                          {day.checkOut ?? "—"}
                        </td>
                        <td className="border-r border-b border-white/10 px-4 py-3 font-mono">
                          {day.workingHours ?? "—"}
                        </td>
                        <td className="border-r border-b border-white/10 px-4 py-3 font-mono">
                          {day.extraHours ?? "—"}
                        </td>
                        <td className="border-b border-white/10 px-4 py-3">
                          <StatusBadge status={day.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
}: Extract<AttendanceWorkspaceProps, { mode: "team" }>) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#090909] px-4 py-6 text-[#f5f1e8] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <header className="grid gap-4 rounded-[28px] border border-white/20 bg-white/5 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] md:p-6">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#9cb3b0] uppercase">
              Attendance / Team view
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#faf7ef] sm:text-4xl">
              Attendances List view
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c9c2b4]">
              For Admin / HR Officer / Payroll Officer • {data.company.name}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="Present" value={String(data.stats.presentCount)} />
            <StatCard
              label="In progress"
              value={String(data.stats.inProgressCount)}
            />
            <StatCard label="Absent" value={String(data.stats.absentCount)} />
            <StatCard
              label="Employees"
              value={String(data.stats.totalEmployees)}
            />
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <aside className="space-y-6">
            <section className="rounded-[28px] border border-white/20 bg-[#0f0f0f] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-4">
                <div>
                  <p className="text-xs tracking-[0.3em] text-[#8ca3a0] uppercase">
                    Note
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[#fbf7ee]">
                    Attendance rules
                  </h2>
                </div>
                <div className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-[#d9d2c6]">
                  {data.date.weekday}
                </div>
              </div>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#d0cabf]">
                {noteLines.team.map((line) => (
                  <li key={line} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8ac6a2]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[28px] border border-white/20 bg-[#111111] p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniStat
                  label="Present today"
                  value={String(data.stats.presentCount)}
                />
                <MiniStat
                  label="Leaves"
                  value={String(data.stats.leaveCount)}
                />
                <MiniStat label="Selected date" value={data.date.label} />
                <MiniStat
                  label="Employees scanned"
                  value={String(data.stats.totalEmployees)}
                />
              </div>
            </section>
          </aside>

          <section className="overflow-hidden rounded-[28px] border border-white/20 bg-[#0f0f0f] shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col gap-4 border-b border-white/15 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-[#f4efe4]">
                  {data.company.name}
                </div>
                <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-[#d7d0c3]">
                  {data.date.label}
                </div>
                <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-[#d7d0c3]">
                  {data.date.weekday}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Link
                    href={prevHref}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#f5f1e8] transition hover:bg-white/10"
                  >
                    ←
                  </Link>
                  <Link
                    href={nextHref}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#f5f1e8] transition hover:bg-white/10"
                  >
                    →
                  </Link>
                  <form
                    action={basePath}
                    method="get"
                    className="flex items-center gap-2"
                  >
                    <input
                      name="search"
                      defaultValue={data.search}
                      placeholder="Searchbar"
                      className="w-44 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#f5f1e8] outline-none placeholder:text-[#8e8a80]"
                    />
                    <input type="hidden" name="date" value={data.date.key} />
                    <button
                      type="submit"
                      className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-[#f5f1e8] transition hover:bg-white/15"
                    >
                      Search
                    </button>
                  </form>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs tracking-[0.24em] text-[#a9a49a] uppercase">
                      <th className="border-r border-b border-white/10 px-4 py-3">
                        Emp
                      </th>
                      <th className="border-r border-b border-white/10 px-4 py-3">
                        Check in
                      </th>
                      <th className="border-r border-b border-white/10 px-4 py-3">
                        Check out
                      </th>
                      <th className="border-r border-b border-white/10 px-4 py-3">
                        Work hours
                      </th>
                      <th className="border-r border-b border-white/10 px-4 py-3">
                        Extra hours
                      </th>
                      <th className="border-b border-white/10 px-4 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-[#b7b0a3]"
                        >
                          No attendance records for this date.
                        </td>
                      </tr>
                    ) : (
                      data.rows.map((row) => (
                        <tr key={row.employeeId} className="text-[#efe8db]">
                          <td className="border-r border-b border-white/10 px-4 py-3 align-top">
                            <div className="font-medium text-[#fbf7ee]">
                              {row.name}
                            </div>
                            <div className="text-xs text-[#a9a49a]">
                              {row.employeeCode} · {row.department}
                            </div>
                          </td>
                          <td className="border-r border-b border-white/10 px-4 py-3 font-mono">
                            {row.checkIn ?? "—"}
                          </td>
                          <td className="border-r border-b border-white/10 px-4 py-3 font-mono">
                            {row.checkOut ?? "—"}
                          </td>
                          <td className="border-r border-b border-white/10 px-4 py-3 font-mono">
                            {row.workingHours ?? "—"}
                          </td>
                          <td className="border-r border-b border-white/10 px-4 py-3 font-mono">
                            {row.extraHours ?? "—"}
                          </td>
                          <td className="border-b border-white/10 px-4 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
      <p className="text-[11px] tracking-[0.32em] text-[#8ca3a0] uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[#faf7ef]">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/20 px-4 py-3">
      <p className="text-[11px] tracking-[0.28em] text-[#8ca3a0] uppercase">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-[#faf7ef]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: EmployeeAttendanceDay["status"] }) {
  const styles: Record<typeof status, string> = {
    ABSENT: "border-[#e58c8c]/30 bg-[#231313] text-[#f5b2b2]",
    PRESENT: "border-[#82c29b]/30 bg-[#132316] text-[#b8e8c8]",
    HALF_DAY: "border-[#e2b36b]/30 bg-[#241d10] text-[#f1d29b]",
    ON_LEAVE: "border-[#7ca3f6]/30 bg-[#101a2c] text-[#bfd2ff]",
    IN_PROGRESS: "border-[#d9d9d9]/30 bg-[#1c1c1c] text-[#efefef]",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase ${styles[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
