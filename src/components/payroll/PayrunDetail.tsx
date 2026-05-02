"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, type RouterOutputs } from "~/trpc/react";

type Period = RouterOutputs["payroll"]["getPayrollEntry"];

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
    <div>
      <Link
        href="/dashboard/payroll"
        className="text-sm font-semibold text-purple-700 hover:underline"
      >
        Back to payroll
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{period.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
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
            className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
          >
            {runPayroll.isPending ? "Running..." : "Run payroll"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {entry && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Summary label="Gross" value={money(entry.totalGross)} />
          <Summary label="Deductions" value={money(entry.totalDeductions)} />
          <Summary label="Net" value={money(entry.totalNet)} />
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Pay Period</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Employer Cost</th>
              <th className="px-4 py-3">Basic Wage</th>
              <th className="px-4 py-3">Gross Wage</th>
              <th className="px-4 py-3">Net Wage</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entry?.salarySlips.map((slip) => (
              <tr key={slip.id}>
                <td className="px-4 py-3 text-gray-600">{period.name}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">
                    {slip.employee.firstName} {slip.employee.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {slip.employee.user.loginId} · {slip.employee.department.name}
                  </p>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {money(slip.grossSalary + slip.pfEmployer)}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {money(slip.basicSalary)}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {money(slip.grossSalary)}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {money(slip.netSalary)}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    Done
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/payroll/payslip/${slip.id}`}
                    className="font-semibold text-purple-700 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!entry && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>
                  Payroll has not been run for this period yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
