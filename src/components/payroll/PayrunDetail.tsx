"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconArrowLeft,
  IconFileInvoice,
  IconPlayerPlay,
  IconReceiptRupee,
  IconWallet,
  type TablerIcon,
} from "@tabler/icons-react";

import { api, type RouterOutputs } from "~/trpc/react";

type Period = RouterOutputs["payroll"]["getPayrollEntry"];

const cardAnimation =
  "dash-fade-up opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none";

function money(value: unknown) {
  return Number(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PayrunDetail({ period }: { period: Period }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const entry = period.payrollEntries[0];

  const runPayroll = api.payroll.runPayroll.useMutation({
    onSuccess: () => {
      setError("");
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  return (
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="relative space-y-8">
        <header
          className={`${cardAnimation} flex flex-wrap items-start justify-between gap-4`}
          style={{ animationDelay: "40ms" }}
        >
          <div>
            <Link
              href="/dashboard/payroll"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
            >
              <IconArrowLeft size={16} stroke={2} aria-hidden="true" />
              Payroll
            </Link>
            <p className="mt-5 text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
              Payrun
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              {period.name}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {formatDate(period.startDate)} - {formatDate(period.endDate)}
            </p>
          </div>
          {!entry && (
            <button
              type="button"
              disabled={runPayroll.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Run payroll for this period? This will generate payslips.",
                  )
                ) {
                  runPayroll.mutate({ periodId: period.id });
                }
              }}
              className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
            >
              <IconPlayerPlay size={16} stroke={2} aria-hidden="true" />
              {runPayroll.isPending ? "Running..." : "Run payroll"}
            </button>
          )}
        </header>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={IconReceiptRupee}
            label="Gross"
            value={entry ? money(entry.totalGross) : "-"}
            detail={entry ? "Total gross payroll" : "Run payroll first"}
            delay="80ms"
          />
          <MetricCard
            icon={IconWallet}
            label="Deductions"
            value={entry ? money(entry.totalDeductions) : "-"}
            detail="Statutory and custom"
            delay="120ms"
          />
          <MetricCard
            icon={IconFileInvoice}
            label="Net"
            value={entry ? money(entry.totalNet) : "-"}
            detail={`${entry?.salarySlips.length ?? 0} payslips`}
            delay="160ms"
          />
        </section>

        <section
          className={`${cardAnimation} overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70`}
          style={{ animationDelay: "200ms" }}
        >
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-medium text-slate-900">
                  Generated payslips
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Employee-wise payroll output for this period.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70">
                {entry?.salarySlips.length ?? 0} slips
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-white text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Pay period</th>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Employer cost</th>
                  <th className="px-5 py-3">Basic wage</th>
                  <th className="px-5 py-3">Gross wage</th>
                  <th className="px-5 py-3">Net wage</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {entry?.salarySlips.map((slip) => (
                  <tr key={slip.id}>
                    <td className="px-5 py-3 text-slate-600">{period.name}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">
                        {slip.employee.firstName} {slip.employee.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {slip.employee.user.loginId} ·{" "}
                        {slip.employee.department.name}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {money(
                        Number(slip.grossSalary) + Number(slip.pfEmployer),
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {money(slip.basicSalary)}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {money(slip.grossSalary)}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {money(slip.netSalary)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                        Done
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/payroll/payslip/${slip.id}`}
                        className="font-semibold text-violet-700 hover:text-violet-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {!entry && (
                  <tr>
                    <td
                      className="px-5 py-10 text-center text-slate-500"
                      colSpan={8}
                    >
                      Payroll has not been run for this period yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
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
  value: string;
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
          <p className="font-display mt-1 truncate text-2xl font-semibold text-slate-900">
            {value}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}
