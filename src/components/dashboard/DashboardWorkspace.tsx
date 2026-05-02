"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { type RouterOutputs } from "~/trpc/react";

type Stats = RouterOutputs["dashboard"]["getStats"];
type AttendanceTrend = RouterOutputs["dashboard"]["getAttendanceTrend"];
type LeaveDistribution = RouterOutputs["dashboard"]["getLeaveDistribution"];
type PayrollTrend = RouterOutputs["dashboard"]["getPayrollTrend"];
type Headcount = RouterOutputs["dashboard"]["getHeadcountByDepartment"];
type Warnings = RouterOutputs["dashboard"]["getAdminWarnings"];
type RecentPayruns = RouterOutputs["dashboard"]["getRecentPayruns"];

type Tone = "teal" | "blue" | "amber" | "rose" | "slate";

const colors = ["#7c3aed", "#8b5cf6", "#a78bfa", "#6d28d9", "#c4b5fd"];
const dashboardTheme = {
  "--dash-bg": "#f8fafc",
  "--dash-surface": "#ffffff",
  "--dash-ink": "#0f172a",
  "--dash-muted": "#64748b",
  "--dash-primary": "#7c3aed",
  "--dash-primary-strong": "#6d28d9",
  "--dash-accent": "#8b5cf6",
  "--dash-warn": "#a78bfa",
  "--dash-danger": "#7c3aed",
} as CSSProperties;

const toneStyles: Record<
  Tone,
  {
    surface: string;
    miniGradient: string;
    ring: string;
    accent: string;
    badge: string;
    cta: string;
  }
> = {
  teal: {
    surface: "bg-white",
    miniGradient: "bg-linear-to-br from-white via-white to-violet-50/80",
    ring: "ring-slate-200/70",
    accent: "text-slate-900",
    badge: "bg-violet-100 text-violet-700",
    cta: "text-slate-400 hover:text-slate-700",
  },
  blue: {
    surface: "bg-white",
    miniGradient: "bg-linear-to-br from-white via-white to-indigo-50/80",
    ring: "ring-slate-200/70",
    accent: "text-slate-900",
    badge: "bg-indigo-100 text-indigo-700",
    cta: "text-slate-400 hover:text-slate-700",
  },
  amber: {
    surface: "bg-white",
    miniGradient: "bg-linear-to-br from-white via-white to-purple-50/80",
    ring: "ring-slate-200/70",
    accent: "text-slate-900",
    badge: "bg-purple-100 text-purple-700",
    cta: "text-slate-400 hover:text-slate-700",
  },
  rose: {
    surface: "bg-white",
    miniGradient: "bg-linear-to-br from-white via-white to-indigo-50/80",
    ring: "ring-slate-200/70",
    accent: "text-slate-900",
    badge: "bg-indigo-100 text-indigo-700",
    cta: "text-slate-400 hover:text-slate-700",
  },
  slate: {
    surface: "bg-white",
    miniGradient: "bg-linear-to-br from-white via-white to-slate-50/80",
    ring: "ring-slate-200/70",
    accent: "text-slate-900",
    badge: "bg-slate-100 text-slate-700",
    cta: "text-slate-400 hover:text-slate-700",
  },
};

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const cardAnimation =
  "dash-fade-up opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none";
const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
};

function money(value: unknown) {
  return Number(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function formatLongDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return longDateFormatter.format(date);
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getQuickAction(role: Stats["role"]) {
  if (role === "ADMIN" || role === "HR_OFFICER") {
    return { label: "Review approvals", href: "/dashboard/leave/approvals" };
  }
  if (role === "PAYROLL_OFFICER") {
    return { label: "Run payrun", href: "/dashboard/payroll" };
  }
  return { label: "Apply leave", href: "/dashboard/leave/apply" };
}

export function DashboardWorkspace({
  stats,
  attendanceTrend,
  leaveDistribution,
  payrollTrend,
  headcountByDepartment,
  warnings,
  recentPayruns,
}: {
  stats: Stats;
  attendanceTrend: AttendanceTrend;
  leaveDistribution: LeaveDistribution;
  payrollTrend: PayrollTrend;
  headcountByDepartment: Headcount;
  warnings: Warnings;
  recentPayruns: RecentPayruns;
}) {
  const canSeeHr = stats.role === "ADMIN" || stats.role === "HR_OFFICER";
  const canSeePayroll =
    stats.role === "ADMIN" || stats.role === "PAYROLL_OFFICER";
  const quickAction = getQuickAction(stats.role);
  const formattedDate = formatLongDate(stats.today);
  const attendanceLabel = toTitleCase(stats.personal.attendanceStatus);
  const attendanceTone: Tone =
    stats.personal.attendanceStatus === "ABSENT"
      ? "rose"
      : stats.personal.attendanceStatus === "ON_LEAVE" ||
          stats.personal.attendanceStatus === "HALF_DAY"
        ? "amber"
        : "teal";
  const showApprovals = Boolean(canSeeHr && stats.hr);
  const leaveTotalDays = leaveDistribution.reduce(
    (sum, entry) => sum + entry.days,
    0,
  );
  const showPersonalCards = stats.role !== "ADMIN";

  return (
    <div
      className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10"
      style={dashboardTheme}
    >

      <div className="relative space-y-8">
        <header
          className={`flex flex-wrap items-start justify-between gap-4 ${cardAnimation}`}
          style={{ animationDelay: "40ms" }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-(--dash-muted)">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-display font-semibold text-(--dash-ink) sm:text-4xl">
              Good morning, {stats.company.name}
            </h1>
            <p className="mt-2 text-sm text-(--dash-muted)">
              {toTitleCase(stats.role)} dashboard - {formattedDate}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              {formattedDate}
            </div>
            <Link
              href={quickAction.href}
              className="inline-flex items-center gap-2 rounded-full bg-(--dash-primary) px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-(--dash-primary-strong)"
            >
              {quickAction.label}
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </div>
        </header>

        {stats.role === "ADMIN" &&
        (warnings.withoutBank > 0 || warnings.withoutManager > 0) ? (
          <section
            className={`grid gap-3 sm:grid-cols-2 ${cardAnimation}`}
            style={{ animationDelay: "80ms" }}
          >
            {warnings.withoutBank > 0 && (
              <Link
                href="/dashboard/employees"
                className="group flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-100 text-sm font-semibold">
                  !
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {warnings.withoutBank} employee
                    {warnings.withoutBank !== 1 ? "s" : ""} without bank details
                  </p>
                  <p className="text-xs text-slate-500">
                    Add bank details to enable payroll
                  </p>
                </div>
                <span className="mt-1 text-xs font-semibold text-slate-400 transition group-hover:text-slate-600">
                  Employees -&gt;
                </span>
              </Link>
            )}
            {warnings.withoutManager > 0 && (
              <Link
                href="/dashboard/employees"
                className="group flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-100 text-sm font-semibold">
                  !
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {warnings.withoutManager} employee
                    {warnings.withoutManager !== 1 ? "s" : ""} without a manager
                  </p>
                  <p className="text-xs text-slate-500">
                    Assign managers in employee profiles
                  </p>
                </div>
                <span className="mt-1 text-xs font-semibold text-slate-400 transition group-hover:text-slate-600">
                  Employees -&gt;
                </span>
              </Link>
            )}
          </section>
        ) : null}

        {showPersonalCards ? (
          <section className="grid gap-4 lg:grid-cols-3">
            <StatCard
              label="Attendance status"
              value={attendanceLabel}
              ctaLabel="View"
              href="/dashboard/attendance"
              artSrc="/dashboard/dashboard-attendance-calendar.png"
              tone={attendanceTone}
              delay="120ms"
            />
            <StatCard
              label="Leave balance"
              value={`${stats.personal.leaveBalance} days`}
              ctaLabel="View"
              href="/dashboard/leave"
              artSrc="/dashboard/dashboard-leave-travel.png"
              tone="amber"
              delay="160ms"
            />
            <StatCard
              label="Latest payslip"
              value={
                stats.personal.latestPayslip
                  ? money(stats.personal.latestPayslip.netSalary)
                  : "Not generated"
              }
              ctaLabel="View"
              href="/dashboard/payroll/payslip"
              artSrc="/dashboard/dashboard-wallet-payslip.png"
              tone="blue"
              delay="200ms"
            />
          </section>
        ) : null}

        {canSeeHr && stats.hr ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStatCard
              label="Headcount"
              value={stats.hr.headcount}
              tone="blue"
              delay="240ms"
            />
            <MiniStatCard
              label="Present today"
              value={stats.hr.presentToday}
              tone="teal"
              delay="280ms"
            />
            <MiniStatCard
              label="On leave"
              value={stats.hr.onLeaveToday}
              tone="amber"
              delay="320ms"
            />
            <MiniStatCard
              label="Pending leave"
              value={stats.hr.pendingLeaves}
              tone="rose"
              delay="360ms"
            />
          </section>
        ) : null}

        {canSeePayroll ? (
          <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Last payrun"
              value={stats.payroll ? stats.payroll.periodName : "Not run"}
              ctaLabel="View"
              href="/dashboard/payroll"
              artSrc="/dashboard/dashboard-calendar-payrun.png"
              tone="blue"
              size="sm"
              delay="400ms"
            />
            <StatCard
              label="Net payout"
              value={stats.payroll ? money(stats.payroll.totalNet) : money(0)}
              ctaLabel="View"
              href="/dashboard/payroll"
              artSrc="/dashboard/dashboard-payroll-coins.png"
              tone="teal"
              size="sm"
              delay="440ms"
            />
            <StatCard
              label="Gross payroll"
              value={stats.payroll ? money(stats.payroll.totalGross) : money(0)}
              ctaLabel="View"
              href="/dashboard/payroll"
              artSrc="/dashboard/dashboard-wallet-gross-payroll.png"
              tone="amber"
              size="sm"
              delay="480ms"
            />
          </section>

          {recentPayruns.length > 0 && (
            <div
              className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 ${cardAnimation}`}
              style={{ animationDelay: "500ms" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-slate-900 font-display">
                  Recent Payruns
                </h2>
                <Link
                  href="/dashboard/payroll"
                  className="text-xs font-semibold text-slate-400 transition hover:text-slate-700"
                >
                  View all
                </Link>
              </div>
              <ul className="space-y-2">
                {recentPayruns.map((run) => (
                  <li key={run.entryId}>
                    <Link
                      href={`/dashboard/payroll/${run.periodId}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white px-4 py-2.5 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="text-sm font-medium text-slate-800">
                        Payrun - {run.name}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {run.slipCount} Payslip{run.slipCount !== 1 ? "s" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          </>
        ) : null}

        {canSeeHr && stats.hr ? (
          <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <ChartPanel
              title="Attendance Trend"
              helper="Last 14 days"
              className="lg:col-span-2 xl:col-span-2"
              delay="520ms"
            >
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={attendanceTrend}>
                  <defs>
                    <linearGradient
                      id="attendancePresentGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient
                      id="attendanceAbsentGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient
                      id="attendanceLeaveGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#6d28d9" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis allowDecimals={false} stroke="#94a3b8" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="present"
                    stackId="1"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    fill="url(#attendancePresentGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="absent"
                    stackId="1"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    fill="url(#attendanceAbsentGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="leave"
                    stackId="1"
                    stroke="#6d28d9"
                    strokeWidth={2}
                    fill="url(#attendanceLeaveGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title="Department headcount"
              helper={`${headcountByDepartment.length} departments`}
              delay="560ms"
            >
              {headcountByDepartment.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={headcountByDepartment}
                    margin={{ left: 6, right: 12, top: 8, bottom: 24 }}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="department"
                      stroke="#94a3b8"
                      tickMargin={10}
                      angle={-18}
                      textAnchor="end"
                      height={44}
                    />
                    <YAxis allowDecimals={false} stroke="#94a3b8" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="employees"
                      fill="#7c3aed"
                      radius={[6, 6, 0, 0]}
                      barSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No departments yet" />
              )}
            </ChartPanel>

            <ChartPanel
              title="Leave distribution"
              helper={`${leaveDistribution.length} types`}
              className="lg:col-span-2 xl:col-span-3"
              delay="600ms"
            >
              {leaveDistribution.length > 0 ? (
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="relative h-[240px] w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={leaveDistribution}
                          dataKey="days"
                          nameKey="name"
                          innerRadius={72}
                          outerRadius={110}
                          paddingAngle={3}
                        >
                          {leaveDistribution.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={colors[index % colors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Total
                      </p>
                      <p className="mt-2 text-2xl font-display font-semibold text-slate-900">
                        {leaveTotalDays}
                      </p>
                      <p className="text-xs text-slate-500">days</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    {leaveDistribution.map((entry, index) => {
                      const percent = leaveTotalDays
                        ? Math.round((entry.days / leaveTotalDays) * 100)
                        : 0;
                      return (
                        <div
                          key={entry.name}
                          className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: colors[index % colors.length],
                              }}
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {entry.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {entry.days} days
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-slate-600">
                            {percent}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <EmptyChart label="No approved leave yet" />
              )}
            </ChartPanel>
          </section>
        ) : null}

        {canSeePayroll ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <ChartPanel
              title="Payroll trend"
              helper="Last 6 months"
              delay="640ms"
            >
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={payrollTrend}>
                  <defs>
                    <linearGradient id="payrollGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => money(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    fill="url(#payrollGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ActionPanel
              showApprovals={showApprovals}
              pendingLeaves={stats.hr?.pendingLeaves ?? 0}
              delay="700ms"
            />
          </section>
        ) : (
          <section className="grid gap-6">
            <ActionPanel
              showApprovals={showApprovals}
              pendingLeaves={stats.hr?.pendingLeaves ?? 0}
              delay="640ms"
            />
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  ctaLabel,
  href,
  artSrc,
  tone = "teal",
  size = "lg",
  delay,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  ctaLabel?: string;
  href?: string;
  artSrc?: string;
  tone?: Tone;
  size?: "lg" | "sm";
  delay?: string;
}) {
  const toneStyle = toneStyles[tone];
  const sizeClass = size === "lg" ? "min-h-[170px]" : "min-h-[140px]";
  const content = (
    <div
      className={`relative overflow-hidden rounded-2xl ${toneStyle.surface} ${sizeClass} p-5 shadow-sm ring-1 ${toneStyle.ring} ${cardAnimation} transition-transform transition-shadow duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md`}
      style={{ animationDelay: delay }}
    >
      <div className="relative z-10 max-w-[70%]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <p
          className={`mt-2 text-2xl font-display font-semibold ${toneStyle.accent}`}
        >
          {value}
        </p>
        {detail ? <p className="mt-1 text-xs text-slate-600">{detail}</p> : null}
        {ctaLabel && href ? (
          <div
            className={`mt-3 inline-flex items-center gap-2 text-xs font-medium ${toneStyle.cta}`}
          >
            <span>Go to {ctaLabel}</span>
            <span aria-hidden="true">-&gt;</span>
          </div>
        ) : null}
      </div>
      {artSrc ? (
        <TransparentImage
          src={artSrc}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-3 h-28 w-auto opacity-90"
        />
      ) : null}
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="block rounded-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
    >
      {content}
    </Link>
  );
}

function MiniStatCard({
  label,
  value,
  detail,
  tone = "slate",
  href,
  delay,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: Tone;
  href?: string;
  delay?: string;
}) {
  const toneStyle = toneStyles[tone];
  const content = (
    <div
      className={`rounded-2xl ${toneStyle.miniGradient} p-4 shadow-sm ring-1 ring-slate-200/70 ${cardAnimation} transition-transform transition-shadow duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-3">
        
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-xl font-display font-semibold text-slate-900">
            {value}
          </p>
          {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function ChartPanel({
  title,
  helper,
  children,
  className,
  delay,
}: {
  title: string;
  helper?: string;
  children: ReactNode;
  className?: string;
  delay?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 ${cardAnimation} ${className ?? ""}`}
      style={{ animationDelay: delay }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-900 font-display">{title}</h2>
        {helper ? (
          <span className="text-xs font-semibold text-slate-500">{helper}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ActionPanel({
  showApprovals,
  pendingLeaves,
  delay,
}: {
  showApprovals: boolean;
  pendingLeaves: number;
  delay?: string;
}) {
  return (
    <aside
      className={`relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 ${cardAnimation}`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-900 font-display">
          {showApprovals ? "Pending approvals" : "Quick guide"}
        </h3>
        {showApprovals ? (
          <Link
            href="/dashboard/leave/approvals"
            className="text-xs font-semibold text-violet-700"
          >
            View all
          </Link>
        ) : null}
      </div>
      {showApprovals ? (
        <div className="mt-4 space-y-3">
          <ApprovalItem
            label="Leave requests"
            value={pendingLeaves}
            detail="Awaiting review"
            tone="teal"
          />
          <ApprovalItem
            label="Other approvals"
            value={0}
            detail="Nothing pending"
            tone="slate"
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p>Track attendance, review leave, and run payroll from one place.</p>
          <p className="text-xs text-slate-500">
            Use the navigation to jump into the workflows you need today.
          </p>
        </div>
      )}
      
    </aside>
  );
}

function ApprovalItem({
  label,
  value,
  detail,
  tone = "teal",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: Tone;
}) {
  const toneStyle = toneStyles[tone];
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2">
      <div>
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      <span className={`text-sm font-semibold ${toneStyle.accent}`}>{value}</span>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-65 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {label}
    </div>
  );
}

type TransparentImageProps = Omit<ComponentPropsWithoutRef<"img">, "src"> & {
  src: string;
  tolerance?: number;
};

function TransparentImage({
  src,
  alt,
  className,
  tolerance = 18,
  ...rest
}: TransparentImageProps) {
  const [cleanSrc, setCleanSrc] = useState<string>(src);

  useEffect(() => {
    if (!src) return;
    let canceled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.src = src;
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) return;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const bg = sampleBackgroundColor(data, width, height);
      const threshold = tolerance * tolerance;
      for (let i = 0; i < data.length; i += 4) {
        const dr = (data[i] ?? 0) - bg.r;
        const dg = (data[i + 1] ?? 0) - bg.g;
        const db = (data[i + 2] ?? 0) - bg.b;
        if (dr * dr + dg * dg + db * db <= threshold) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      const output = canvas.toDataURL("image/png");
      if (!canceled) setCleanSrc(output);
    };
    image.onerror = () => {
      if (!canceled) setCleanSrc(src);
    };

    return () => {
      canceled = true;
    };
  }, [src, tolerance]);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={cleanSrc}
      alt={alt}
      className={className}
      loading="lazy"
      {...rest}
    />
  );
}

function sampleBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  if (!width || !height) return { r: 255, g: 255, b: 255 };
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const index of corners) {
    r += data[index] ?? 255;
    g += data[index + 1] ?? 255;
    b += data[index + 2] ?? 255;
  }
  const count = corners.length;
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}
