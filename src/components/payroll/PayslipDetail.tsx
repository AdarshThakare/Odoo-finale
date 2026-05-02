"use client";

import { useState } from "react";
import Link from "next/link";
import { type RouterOutputs } from "~/trpc/react";

type Payslip = RouterOutputs["payroll"]["getPayslip"];

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
      <div className="no-print max-w-4xl">
        <Link
          href="/dashboard/payroll"
          className="text-sm font-semibold text-purple-700 hover:underline"
        >
          ← Back to payroll
        </Link>

        <div className="mt-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          {/* Header */}
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {payslip.employee.firstName} {payslip.employee.lastName}
                </h1>
                <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
                  <span>
                    <span className="font-medium text-gray-700">Payrun</span>{" "}
                    {periodName}
                  </span>
                  <span>
                    <span className="font-medium text-gray-700">Salary Structure</span>{" "}
                    Regular Pay
                  </span>
                  {periodStart && periodEnd && (
                    <span>
                      <span className="font-medium text-gray-700">Period</span>{" "}
                      {fmt(periodStart)} To {fmt(periodEnd)}
                    </span>
                  )}
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-lg bg-purple-700 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-purple-800"
                >
                  Print
                </button>
                <span className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-500">
                  {payslip.status}
                </span>
              </div>
            </div>
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
                    <th className="pb-3 text-right font-semibold text-gray-600">Days</th>
                    <th className="pb-3 text-right font-semibold text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-50">
                    <td className="py-3 text-gray-700">
                      Attendance
                      <span className="ml-2 text-xs text-gray-400">(5 working days in week)</span>
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
                      {(payslip.workingDays + Number(payslip.paidLeaveDays)).toFixed(2)}
                    </td>
                    <td className="pt-3 text-right text-gray-900">
                      {money(payslip.grossSalary)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">
                Salary is calculated based on the employee&apos;s monthly attendance. Paid
                leaves are included in the total payable days, while unpaid leaves are
                deducted from the salary.
              </p>
            </div>
          )}

          {/* Tab: Salary Computation */}
          {tab === "computation" && (
            <div className="px-6 py-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="pb-3 font-semibold text-gray-600">Rule Name</th>
                    <th className="pb-3 text-right font-semibold text-gray-600">Rate %</th>
                    <th className="pb-3 text-right font-semibold text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <Row label="Basic Salary" amount={payslip.basicSalary} />
                  <Row label="House Rent Allowance" amount={payslip.hra} />
                  {earnings.map((d) => (
                    <Row key={d.id} label={d.salaryComponent.name} amount={d.amount} />
                  ))}
                  <tr className="border-y-2 border-gray-200 bg-gray-50 font-bold">
                    <td className="py-2.5 pl-1 text-gray-900">Gross</td>
                    <td className="py-2.5 text-right text-gray-900">100</td>
                    <td className="py-2.5 text-right text-gray-900">
                      {money(payslip.grossSalary)}
                    </td>
                  </tr>
                  <Row label="PF Employee" amount={-payslip.pfEmployee} isDeduction />
                  <Row
                    label="PF Employer"
                    amount={-payslip.pfEmployer}
                    isDeduction
                    note="(informational)"
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
                    />
                  ))}
                  <tr className="border-t-2 border-gray-200 font-bold">
                    <td className="pt-3 text-gray-900">Net Amount</td>
                    <td className="pt-3 text-right text-gray-900">100</td>
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

function Row({
  label,
  amount,
  isDeduction = false,
  note,
}: {
  label: string;
  amount: number;
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
      <td className="py-2.5 text-right text-gray-500">100</td>
      <td className={`py-2.5 text-right ${isDeduction ? "text-red-600" : "text-gray-700"}`}>
        {isDeduction
          ? `-${fmt.format(Math.abs(amount))}`
          : fmt.format(amount)}
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
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen",
    ];
    const tensArr = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    function w(n: number): string {
      if (n === 0) return "";
      if (n < 20) return ones[n]!;
      if (n < 100) return tensArr[Math.floor(n / 10)]! + (n % 10 ? " " + ones[n % 10]! : "");
      if (n < 1000) return ones[Math.floor(n / 100)]! + " Hundred" + (n % 100 ? " " + w(n % 100) : "");
      if (n < 100000) return w(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + w(n % 1000) : "");
      if (n < 10000000) return w(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + w(n % 100000) : "");
      return w(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + w(n % 10000000) : "");
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
          <div
            style={{
              width: "48px",
              height: "48px",
              background: "#7C3AED",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "20px",
            }}
          >
            {(company?.name ?? "E").charAt(0)}
          </div>
        )}
        <div>
          <div style={{ fontWeight: "bold", fontSize: "16px" }}>
            {company?.name ?? "EmPay"}
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
        <InfoRow label="Designation" value={payslip.employee.designation.name} />
        <InfoRow
          label="Pay date"
          value={dateStr(payslip.createdAt)}
        />
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
                <th style={{ textAlign: "left", padding: "5px 8px", fontWeight: "600" }}>
                  Earnings
                </th>
                <th style={{ textAlign: "right", padding: "5px 8px", fontWeight: "600" }}>
                  Amounts
                </th>
              </tr>
            </thead>
            <tbody>
              <PrintRow label="Basic Salary" amount={payslip.basicSalary} />
              <PrintRow label="House Rent Allowance" amount={payslip.hra} />
              {earnings.map((d) => (
                <PrintRow key={d.id} label={d.salaryComponent.name} amount={d.amount} />
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
                <th style={{ textAlign: "left", padding: "5px 8px", fontWeight: "600" }}>
                  Deductions
                </th>
                <th style={{ textAlign: "right", padding: "5px 8px", fontWeight: "600" }}>
                  Amounts
                </th>
              </tr>
            </thead>
            <tbody>
              <PrintRow label="PF Employee" amount={payslip.pfEmployee} deduction />
              <PrintRow label="PF Employer" amount={payslip.pfEmployer} deduction />
              <PrintRow label="Professional Tax" amount={payslip.professionalTax} deduction />
              {deductions.map((d) => (
                <PrintRow
                  key={d.id}
                  label={d.salaryComponent.name}
                  amount={d.amount}
                  deduction
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
          <div style={{ fontWeight: "bold", fontSize: "18px", color: "#7C3AED" }}>
            {m(payslip.netSalary)}
          </div>
          <div style={{ fontSize: "10px", color: "#374151", fontStyle: "italic" }}>
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
  bold = false,
  deduction = false,
}: {
  label: string;
  amount: number;
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
          fontWeight: bold ? "bold" : "normal",
          color: deduction ? "#dc2626" : "inherit",
        }}
      >
        {deduction ? `- ₹${amount.toFixed(2)}` : `₹${amount.toFixed(2)}`}
      </td>
    </tr>
  );
}
