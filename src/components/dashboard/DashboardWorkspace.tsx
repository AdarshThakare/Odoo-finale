"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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

const colors = ["#7c3aed", "#059669", "#d97706", "#dc2626", "#2563eb"];

function money(value: unknown) {
  return Number(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

export function DashboardWorkspace({
  stats,
  attendanceTrend,
  leaveDistribution,
  payrollTrend,
  headcountByDepartment,
}: {
  stats: Stats;
  attendanceTrend: AttendanceTrend;
  leaveDistribution: LeaveDistribution;
  payrollTrend: PayrollTrend;
  headcountByDepartment: Headcount;
}) {
  const canSeeHr = stats.role === "ADMIN" || stats.role === "HR_OFFICER";
  const canSeePayroll =
    stats.role === "ADMIN" || stats.role === "PAYROLL_OFFICER";

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {stats.company.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {stats.role.replace("_", " ")} dashboard for {stats.today}
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Today"
          value={stats.personal.attendanceStatus.replace("_", " ")}
          detail={stats.personal.checkedIn ? "Currently checked in" : "Attendance status"}
        />
        <MetricCard
          label="Leave balance"
          value={`${stats.personal.leaveBalance} days`}
          detail="Available from ledger"
        />
        <MetricCard
          label="Latest payslip"
          value={
            stats.personal.latestPayslip
              ? money(stats.personal.latestPayslip.netSalary)
              : "Not generated"
          }
          detail="Net salary"
          href={stats.personal.latestPayslip ? `/dashboard/payroll/payslip/${stats.personal.latestPayslip.id}` : undefined}
        />
      </div>

      {canSeeHr && stats.hr && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <MetricCard label="Headcount" value={stats.hr.headcount} detail="Active employees" />
            <MetricCard label="Present today" value={stats.hr.presentToday} detail="Present or half-day" />
            <MetricCard label="On leave" value={stats.hr.onLeaveToday} detail="Today" />
            <MetricCard label="Pending leave" value={stats.hr.pendingLeaves} detail="Needs approval" href="/dashboard/leave/approvals" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <ChartPanel title="Attendance Trend">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis allowDecimals={false} stroke="#6b7280" />
                  <Tooltip />
                  <Line type="monotone" dataKey="present" stroke="#059669" strokeWidth={2} />
                  <Line type="monotone" dataKey="absent" stroke="#dc2626" strokeWidth={2} />
                  <Line type="monotone" dataKey="leave" stroke="#7c3aed" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="Headcount By Department">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={headcountByDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="department" stroke="#6b7280" />
                  <YAxis allowDecimals={false} stroke="#6b7280" />
                  <Tooltip />
                  <Bar dataKey="employees" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="Leave Distribution">
              {leaveDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={leaveDistribution}
                      dataKey="days"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                    >
                      {leaveDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No approved leave yet" />
              )}
            </ChartPanel>
          </div>
        </>
      )}

      {canSeePayroll && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Last payrun"
              value={stats.payroll ? stats.payroll.periodName : "Not run"}
              detail="Most recent period"
              href="/dashboard/payroll"
            />
            <MetricCard
              label="Net payout"
              value={stats.payroll ? money(stats.payroll.totalNet) : money(0)}
              detail={`${stats.payroll?.employeeCount ?? 0} payslips`}
            />
            <MetricCard
              label="Gross payroll"
              value={stats.payroll ? money(stats.payroll.totalGross) : money(0)}
              detail="Before deductions"
            />
          </div>

          <div className="mt-6">
            <ChartPanel title="Payroll Cost Trend">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={payrollTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip formatter={(value) => money(value)} />
                  <Bar dataKey="net" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition hover:ring-purple-200">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-4 font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
      {label}
    </div>
  );
}
