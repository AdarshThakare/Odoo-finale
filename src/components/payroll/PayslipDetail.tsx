"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconPrinter,
  IconReceiptRupee,
  IconWallet,
} from "@tabler/icons-react";
import { type RouterOutputs } from "~/trpc/react";

type Payslip = RouterOutputs["payroll"]["getPayslip"];
const cardAnimation =
  "dash-fade-up opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

function fmt(date: Date | string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PayslipDetail({ payslip }: { payslip: Payslip }) {
  const [tab, setTab] = useState<"worked" | "computation">("worked");

  const earnings = payslip.slipDetails.filter((d) => d.type === "EARNING");
  const deductions = payslip.slipDetails.filter((d) => d.type === "DEDUCTION");

  type PayrollEntryWithPeriod = typeof payslip.payrollEntry & {
    payrollPeriod?: { name: string; startDate: Date; endDate: Date };
  };
  type EmployeeWithCompany = typeof payslip.employee & {
    company?: { name: string; logoUrl?: string | null; code?: string | null };
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    dateOfJoining?: Date | null;
  };

  const entry = payslip.payrollEntry as PayrollEntryWithPeriod;
  const emp = payslip.employee as EmployeeWithCompany;

  const periodName = entry.payrollPeriod?.name ?? "—";
  const periodStart = entry.payrollPeriod?.startDate;
  const periodEnd = entry.payrollPeriod?.endDate;
  const company = emp.company;

  const attendanceAmount =
    payslip.totalWorkingDays > 0
      ? (payslip.basicSalary + payslip.hra + payslip.totalEarnings) *
        (payslip.workingDays / payslip.totalWorkingDays)
      : 0;
  const leaveAmount =
    payslip.totalWorkingDays > 0
      ? (payslip.basicSalary + payslip.hra + payslip.totalEarnings) *
        (Number(payslip.paidLeaveDays) / payslip.totalWorkingDays)
      : 0;

  return (
    <>
      {/* ── Screen view ───────────────────────────────────────────── */}
      <div className="no-print relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
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
                Payslip
              </p>
              <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
                {payslip.employee.firstName} {payslip.employee.lastName}
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                <span>Payrun {periodName}</span>
                <span>Salary Structure Regular Pay</span>
                {periodStart && periodEnd && (
                  <span>
                    {fmt(periodStart)} to {fmt(periodEnd)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700"
              >
                <IconPrinter size={16} stroke={2} aria-hidden="true" />
                Print
              </button>
              <span className="rounded-full bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                {payslip.status}
              </span>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              icon={IconReceiptRupee}
              label="Gross"
              value={money(payslip.grossSalary)}
              delay="80ms"
            />
            <SummaryCard
              icon={IconWallet}
              label="Deductions"
              value={money(payslip.totalDeductions)}
              delay="120ms"
            />
            <SummaryCard
              icon={IconReceiptRupee}
              label="Net"
              value={money(payslip.netSalary)}
              delay="160ms"
            />
          </section>

          <div
            className={`${cardAnimation} overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70`}
            style={{ animationDelay: "200ms" }}
          >
            {/* Header */}
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
              <h2 className="font-display text-sm font-medium text-slate-900">
                Payroll breakdown
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Worked days and salary computation.
              </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100 px-6">
              <div className="flex gap-0">
                {(["worked", "computation"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                      tab === t
                        ? "border-purple-700 text-purple-700"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t === "worked" ? "Worked Days" : "Salary Computation"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab: Worked Days */}
            {tab === "worked" && (
              <div className="px-6 py-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-3 font-semibold text-gray-600">Type</th>
                      <th className="pb-3 text-right font-semibold text-gray-600">
                        Days
                      </th>
                      <th className="pb-3 text-right font-semibold text-gray-600">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50">
                      <td className="py-3 text-gray-700">
                        Attendance
                        <span className="ml-2 text-xs text-gray-400">
                          (5 working days in week)
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-700">
                        {payslip.workingDays.toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-gray-700">
                        {money(attendanceAmount)}
                      </td>
                    </tr>
                    {Number(payslip.paidLeaveDays) > 0 && (
                      <tr className="border-b border-gray-50">
                        <td className="py-3 text-gray-700">
                          Paid Time off
                          <span className="ml-2 text-xs text-gray-400">
                            ({Number(payslip.paidLeaveDays)} Paid leaves)
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-700">
                          {Number(payslip.paidLeaveDays).toFixed(2)}
                        </td>
                        <td className="py-3 text-right text-gray-700">
                          {money(leaveAmount)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-gray-200 font-semibold">
                      <td className="pt-3 text-gray-900">Total</td>
                      <td className="pt-3 text-right text-gray-900">
                        {(
                          payslip.workingDays + Number(payslip.paidLeaveDays)
                        ).toFixed(2)}
                      </td>
                      <td className="pt-3 text-right text-gray-900">
                        {money(payslip.grossSalary)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">
                  Salary is calculated based on the employee&apos;s monthly
                  attendance. Paid leaves are included in the total payable
                  days, while unpaid leaves are deducted from the salary.
                </p>
              </div>
            )}

            {/* Tab: Salary Computation */}
            {tab === "computation" && (
              <div className="px-6 py-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-3 font-semibold text-gray-600">
                        Rule Name
                      </th>
                      <th className="pb-3 text-right font-semibold text-gray-600">
                        Rate %
                      </th>
                      <th className="pb-3 text-right font-semibold text-gray-600">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <Row label="Basic Salary" amount={payslip.basicSalary} rate={(payslip.basicSalary / (payslip.grossSalary + payslip.pfEmployer)) * 100} />
                    <Row label="House Rent Allowance" amount={payslip.hra} rate={(payslip.hra / payslip.basicSalary) * 100} />
                    {earnings.map((d) => (
                      <Row
                        key={d.id}
                        label={d.salaryComponent.name}
                        amount={d.amount}
                        rate={(d.amount / payslip.basicSalary) * 100}
                      />
                    ))}
                    <tr className="border-y-2 border-gray-200 bg-gray-50 font-bold">
                      <td className="py-2.5 pl-1 text-gray-900">Gross</td>
                      <td className="py-2.5 text-right text-gray-900"></td>
                      <td className="py-2.5 text-right text-gray-900">
                        {money(payslip.grossSalary)}
                      </td>
                    </tr>
                    <Row
                      label="PF Employee"
                      amount={-payslip.pfEmployee}
                      isDeduction
                      rate={(payslip.pfEmployee / payslip.basicSalary) * 100}
                    />
                    <Row
                      label="PF Employer"
                      amount={-payslip.pfEmployer}
                      isDeduction
                      note="(informational)"
                      rate={(payslip.pfEmployer / payslip.basicSalary) * 100}
                    />
                    <Row
                      label="Professional Tax"
                      amount={-payslip.professionalTax}
                      isDeduction
                    />
                    {deductions.map((d) => (
                      <Row
                        key={d.id}
                        label={d.salaryComponent.name}
                        amount={-d.amount}
                        isDeduction
                        rate={(d.amount / payslip.basicSalary) * 100}
                      />
                    ))}
                    <tr className="border-t-2 border-gray-200 font-bold">
                      <td className="pt-3 text-gray-900">Net Amount</td>
                      <td className="pt-3 text-right text-gray-900"></td>
                      <td className="pt-3 text-right text-purple-700">
                        {money(payslip.netSalary)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Print view (hidden on screen, shown when printing) ───────── */}
      <div className="print-only hidden">
        <PrintPayslip
          payslip={payslip}
          periodName={periodName}
          periodStart={periodStart}
          periodEnd={periodEnd}
          company={company}
          earnings={earnings}
          deductions={deductions}
        />
      </div>
    </>
  );
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: typeof IconReceiptRupee;
  label: string;
  value: string;
  delay: string;
}) {
  return (
    <div
      className={`${cardAnimation} rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-4 shadow-sm ring-1 ring-slate-200/70`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-100">
          <Icon size={19} stroke={1.9} aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            {label}
          </p>
          <p className="font-display mt-1 text-2xl font-semibold text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  amount,
  rate,
  isDeduction = false,
  note,
}: {
  label: string;
  amount: number;
  rate?: number;
  isDeduction?: boolean;
  note?: string;
}) {
  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });
  return (
    <tr className="border-b border-gray-50">
      <td className="py-2.5 text-gray-700">
        {label}
        {note && <span className="ml-2 text-xs text-gray-400">{note}</span>}
      </td>
      <td className="py-2.5 text-right text-gray-500">
        {rate !== undefined ? `${rate.toFixed(2)} %` : ""}
      </td>
      <td
        className={`py-2.5 text-right ${isDeduction ? "text-red-600" : "text-gray-700"}`}
      >
        {isDeduction ? `-${fmt.format(Math.abs(amount))}` : fmt.format(amount)}
      </td>
    </tr>
  );
}

// ─── Print layout ─────────────────────────────────────────────────────────────

function PrintPayslip({
  payslip,
  periodName,
  periodStart,
  periodEnd,
  company,
  earnings,
  deductions,
}: {
  payslip: Payslip;
  periodName: string;
  periodStart?: Date;
  periodEnd?: Date;
  company?: { name: string; logoUrl?: string | null } | null;
  earnings: Payslip["slipDetails"];
  deductions: Payslip["slipDetails"];
}) {
  function m(n: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(n);
  }

  function toWords(amount: number): string {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tensArr = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    function w(n: number): string {
      if (n === 0) return "";
      if (n < 20) return ones[n]!;
      if (n < 100)
        return (
          tensArr[Math.floor(n / 10)]! + (n % 10 ? " " + ones[n % 10]! : "")
        );
      if (n < 1000)
        return (
          ones[Math.floor(n / 100)]! +
          " Hundred" +
          (n % 100 ? " " + w(n % 100) : "")
        );
      if (n < 100000)
        return (
          w(Math.floor(n / 1000)) +
          " Thousand" +
          (n % 1000 ? " " + w(n % 1000) : "")
        );
      if (n < 10000000)
        return (
          w(Math.floor(n / 100000)) +
          " Lakh" +
          (n % 100000 ? " " + w(n % 100000) : "")
        );
      return (
        w(Math.floor(n / 10000000)) +
        " Crore" +
        (n % 10000000 ? " " + w(n % 10000000) : "")
      );
    }
    if (amount === 0) return "Zero only";
    return w(Math.floor(Math.abs(amount))) + " only";
  }

  type EmployeeExt = typeof payslip.employee & {
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    dateOfJoining?: Date | null;
  };
  const emp = payslip.employee as EmployeeExt;

  const dateStr = (d: Date | string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        color: "#111",
        padding: "24px",
        maxWidth: "800px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "4px",
        }}
      >
        {company?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt="Company Logo"
            style={{ height: "48px", objectFit: "contain" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/empay.png"
            alt="EMPAY logo"
            style={{ height: "48px", objectFit: "contain" }}
          />
        )}
        <div>
          <div style={{ fontWeight: "bold", fontSize: "16px" }}>
            {company?.name ?? "EMPAY"}
          </div>
        </div>
      </div>
      <div
        style={{
          fontSize: "15px",
          fontWeight: "bold",
          color: "#7C3AED",
          marginBottom: "12px",
        }}
      >
        Salary slip for month of {periodName}
      </div>
      <hr style={{ marginBottom: "12px" }} />

      {/* Employee Info Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px 24px",
          marginBottom: "16px",
          border: "1px solid #e5e7eb",
          padding: "10px",
          borderRadius: "6px",
        }}
      >
        <InfoRow
          label="Employee name"
          value={`${payslip.employee.firstName} ${payslip.employee.lastName}`}
        />
        <InfoRow label="Bank A/c No." value={emp.bankAccountNumber ?? "—"} />
        <InfoRow label="Employee Code" value={payslip.employee.employeeCode} />
        <InfoRow label="IFSC" value={emp.bankIfsc ?? "—"} />
        <InfoRow label="Department" value={payslip.employee.department.name} />
        <InfoRow
          label="Pay period"
          value={
            periodStart && periodEnd
              ? `${dateStr(periodStart)} to ${dateStr(periodEnd)}`
              : "—"
          }
        />
        <InfoRow
          label="Designation"
          value={payslip.employee.designation.name}
        />
        <InfoRow label="Pay date" value={dateStr(payslip.createdAt)} />
        <InfoRow
          label="Date of Joining"
          value={emp.dateOfJoining ? dateStr(emp.dateOfJoining) : "—"}
        />
        <InfoRow
          label="Login ID"
          value={payslip.employee.user.loginId ?? payslip.employee.user.email}
        />
      </div>

      {/* Worked Days */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          padding: "8px 12px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{ fontWeight: "bold", marginBottom: "6px", color: "#7C3AED" }}
        >
          Worked Days
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Attendance</span>
          <span>{payslip.workingDays} Days</span>
        </div>
        {Number(payslip.paidLeaveDays) > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Paid Time Off</span>
            <span>{Number(payslip.paidLeaveDays)} Days</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
            borderTop: "1px solid #e5e7eb",
            marginTop: "4px",
            paddingTop: "4px",
          }}
        >
          <span>Total</span>
          <span>
            {payslip.workingDays + Number(payslip.paidLeaveDays)} Days
          </span>
        </div>
      </div>

      {/* Earnings + Deductions two-column table */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        {/* Earnings */}
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3e8ff" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "5px 8px",
                    fontWeight: "600",
                  }}
                >
                  Earnings
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "5px 8px",
                    fontWeight: "600",
                  }}
                >
                  Rate
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "5px 8px",
                    fontWeight: "600",
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <PrintRow label="Basic Salary" amount={payslip.basicSalary} rate={(payslip.basicSalary / (payslip.grossSalary + payslip.pfEmployer)) * 100} />
              <PrintRow label="House Rent Allowance" amount={payslip.hra} rate={(payslip.hra / payslip.basicSalary) * 100} />
              {earnings.map((d) => (
                <PrintRow
                  key={d.id}
                  label={d.salaryComponent.name}
                  amount={d.amount}
                  rate={(d.amount / payslip.basicSalary) * 100}
                />
              ))}
              <PrintRow label="Gross" amount={payslip.grossSalary} bold />
            </tbody>
          </table>
        </div>
        {/* Deductions */}
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fee2e2" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "5px 8px",
                    fontWeight: "600",
                  }}
                >
                  Deductions
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "5px 8px",
                    fontWeight: "600",
                  }}
                >
                  Rate
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "5px 8px",
                    fontWeight: "600",
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <PrintRow
                label="PF Employee"
                amount={payslip.pfEmployee}
                deduction
                rate={(payslip.pfEmployee / payslip.basicSalary) * 100}
              />
              <PrintRow
                label="PF Employer"
                amount={payslip.pfEmployer}
                deduction
                rate={(payslip.pfEmployer / payslip.basicSalary) * 100}
              />
              <PrintRow
                label="Professional Tax"
                amount={payslip.professionalTax}
                deduction
              />
              {deductions.map((d) => (
                <PrintRow
                  key={d.id}
                  label={d.salaryComponent.name}
                  amount={d.amount}
                  deduction
                  rate={(d.amount / payslip.basicSalary) * 100}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Net Payable */}
      <div
        style={{
          background: "#f3e8ff",
          border: "2px solid #7C3AED",
          borderRadius: "8px",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: "bold", fontSize: "13px" }}>
            Total Net Payable
          </div>
          <div style={{ fontSize: "10px", color: "#6b7280" }}>
            (Gross Earning - Total deductions)
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{ fontWeight: "bold", fontSize: "18px", color: "#7C3AED" }}
          >
            {m(payslip.netSalary)}
          </div>
          <div
            style={{ fontSize: "10px", color: "#374151", fontStyle: "italic" }}
          >
            {toWords(payslip.netSalary)}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      <span style={{ color: "#6b7280", minWidth: "120px" }}>{label}</span>
      <span style={{ color: "#111827", fontWeight: "500" }}>: {value}</span>
    </div>
  );
}

function PrintRow({
  label,
  amount,
  rate,
  bold = false,
  deduction = false,
}: {
  label: string;
  amount: number;
  rate?: number;
  bold?: boolean;
  deduction?: boolean;
}) {
  return (
    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
      <td style={{ padding: "3px 8px", fontWeight: bold ? "bold" : "normal" }}>
        {label}
      </td>
      <td
        style={{
          padding: "3px 8px",
          textAlign: "right",
          color: "#6b7280",
        }}
      >
        {rate !== undefined ? `${rate.toFixed(2)} %` : ""}
      </td>
      <td
        style={{
          padding: "3px 8px",
          textAlign: "right",
          fontWeight: bold ? "bold" : "normal",
          color: deduction ? "#dc2626" : "inherit",
        }}
      >
        {deduction ? `- ₹${amount.toFixed(2)}` : `₹${amount.toFixed(2)}`}
      </td>
    </tr>
  );
}
