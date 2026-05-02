import Link from "next/link";

import { type RouterOutputs } from "~/trpc/react";

type Payslip = RouterOutputs["payroll"]["getPayslip"];

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

export function PayslipDetail({ payslip }: { payslip: Payslip }) {
  const earnings = payslip.slipDetails.filter((detail) => detail.type === "EARNING");
  const deductions = payslip.slipDetails.filter(
    (detail) => detail.type === "DEDUCTION",
  );

  return (
    <div className="max-w-5xl">
      <Link
        href="/dashboard/payroll"
        className="text-sm font-semibold text-purple-700 hover:underline"
      >
        Back to payroll
      </Link>

      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payslip</h1>
            <p className="mt-1 text-sm text-gray-500">
              Generated on {formatDate(payslip.createdAt)}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-gray-900">
              {payslip.employee.firstName} {payslip.employee.lastName}
            </p>
            <p className="text-gray-500">{payslip.employee.user.loginId}</p>
            <p className="text-gray-500">
              {payslip.employee.department.name} -{" "}
              {payslip.employee.designation.name}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Summary label="Gross" value={money(payslip.grossSalary)} />
          <Summary label="Deductions" value={money(payslip.totalDeductions)} />
          <Summary label="Net salary" value={money(payslip.netSalary)} />
          <Summary
            label="Attendance"
            value={`${payslip.workingDays}/${payslip.totalWorkingDays}`}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="font-semibold text-gray-900">Earnings</h2>
            <Line label="Basic salary" value={money(payslip.basicSalary)} />
            <Line label="HRA" value={money(payslip.hra)} />
            {earnings.map((detail) => (
              <Line
                key={detail.id}
                label={detail.salaryComponent.name}
                value={money(detail.amount)}
              />
            ))}
            <Line
              label="Total earnings"
              value={money(
                Number(payslip.basicSalary) +
                  Number(payslip.hra) +
                  Number(payslip.totalEarnings),
              )}
              strong
            />
          </section>

          <section>
            <h2 className="font-semibold text-gray-900">Deductions</h2>
            <Line label="PF employee" value={money(payslip.pfEmployee)} />
            <Line
              label="Professional tax"
              value={money(payslip.professionalTax)}
            />
            {deductions.map((detail) => (
              <Line
                key={detail.id}
                label={detail.salaryComponent.name}
                value={money(detail.amount)}
              />
            ))}
            <Line
              label="Total deductions"
              value={money(payslip.totalDeductions)}
              strong
            />
          </section>
        </div>

        <div className="mt-8 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          Employer PF contribution:{" "}
          <span className="font-semibold text-gray-900">
            {money(payslip.pfEmployer)}
          </span>
          . Paid leave counted: {Number(payslip.paidLeaveDays)} days.
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Line({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`mt-3 flex items-center justify-between border-b border-gray-100 pb-2 text-sm ${
        strong ? "font-semibold text-gray-900" : "text-gray-700"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
