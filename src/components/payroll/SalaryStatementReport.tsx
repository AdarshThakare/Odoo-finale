"use client";

import { useState } from "react";
import {
  IconPrinter,
  IconReportMoney,
  IconUserSearch,
  type TablerIcon,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";

type Employee = RouterOutputs["employee"]["list"][number];

interface Props {
  employees: Employee[];
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const cardAnimation =
  "dash-fade-up opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none";

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n);
}

function fmt(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SalaryStatementReport({ employees }: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const [year, setYear] = useState(currentYear);

  const {
    data: statement,
    isLoading,
    error,
  } = api.payroll.getSalaryStatement.useQuery(
    { employeeId, year },
    { enabled: !!employeeId },
  );

  return (
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="relative space-y-8">
        <header
          className={`${cardAnimation} flex flex-wrap items-start justify-between gap-4`}
          style={{ animationDelay: "40ms" }}
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
              Payroll reports
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Salary statement
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Generate and print annual salary statement reports.
            </p>
          </div>
          {statement && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700"
            >
              <IconPrinter size={16} stroke={2} aria-hidden="true" />
              Print
            </button>
          )}
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            icon={IconUserSearch}
            label="Employees"
            value={String(employees.length)}
            detail="Available for reporting"
            delay="80ms"
          />
          <MetricCard
            icon={IconReportMoney}
            label="Selected year"
            value={String(year)}
            detail="Statement period"
            delay="120ms"
          />
          <MetricCard
            icon={IconPrinter}
            label="Report"
            value={statement ? "Ready" : "Select"}
            detail={statement ? statement.employee.name : "Choose employee"}
            delay="160ms"
          />
        </section>

        {/* Controls */}
        <section
          className={`${cardAnimation} rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6`}
          style={{ animationDelay: "200ms" }}
        >
          <h2 className="font-display text-sm font-medium text-slate-900">
            Report controls
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Employee Name
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="block h-11 w-72 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="block h-11 w-28 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {statement && (
              <button
                onClick={() => window.print()}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
              >
                <IconPrinter size={17} stroke={2} aria-hidden="true" />
                Print
              </button>
            )}
          </div>
        </section>

        {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error.message}</p>}

        {/* Screen preview */}
        {statement && (
          <div
            className={`${cardAnimation} no-print overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70`}
            style={{ animationDelay: "240ms" }}
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <p className="font-display text-sm font-medium text-slate-900">
                Salary Statement Report — {year}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {statement.employee.name} · {statement.employee.designation} ·
                Effective from {fmt(statement.employee.salaryEffectiveFrom)}
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-white text-left">
                  <th className="px-6 py-3 font-semibold text-slate-600">
                    Salary Components
                  </th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-600">
                    Monthly Amount
                  </th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-600">
                    Yearly Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {statement.rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-50 ${
                      row.kind === "gross" || row.kind === "net"
                        ? "bg-violet-50 font-semibold"
                        : ""
                    }`}
                  >
                    <td
                      className={`px-6 py-2.5 ${
                        row.kind === "deduction"
                          ? "text-rose-700"
                          : "text-slate-900"
                      }`}
                    >
                      {row.name}
                    </td>
                    <td
                      className={`px-6 py-2.5 text-right ${
                        row.kind === "deduction"
                          ? "text-rose-700"
                          : "text-slate-700"
                      }`}
                    >
                      {row.kind === "deduction"
                        ? `- ${money(row.monthly)}`
                        : money(row.monthly)}
                    </td>
                    <td
                      className={`px-6 py-2.5 text-right ${
                        row.kind === "deduction"
                          ? "text-rose-700"
                          : "text-slate-700"
                      }`}
                    >
                      {row.kind === "deduction"
                        ? `- ${money(row.yearly)}`
                        : money(row.yearly)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Print layout */}
        {statement && (
          <div className="print-only hidden">
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: "11px",
                padding: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "2px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={statement.employee.company?.logoUrl ?? "/empay.png"}
                  alt="EMPAY logo"
                  style={{ height: "36px", objectFit: "contain" }}
                />
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                  {statement.employee.company?.name ?? "EMPAY"}
                </div>
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: "#7C3AED",
                  marginBottom: "12px",
                }}
              >
                Salary Statement Report
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "4px 24px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <span style={{ color: "#6b7280" }}>Employee Name: </span>
                  {statement.employee.name}
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Date of Joining: </span>
                  {fmt(statement.employee.dateOfJoining)}
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Designation: </span>
                  {statement.employee.designation}
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>
                    Salary Effective From:{" "}
                  </span>
                  {fmt(statement.employee.salaryEffectiveFrom)}
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3e8ff" }}>
                    <th style={{ textAlign: "left", padding: "6px 8px" }}>
                      Salary Components
                    </th>
                    <th style={{ textAlign: "right", padding: "6px 8px" }}>
                      Monthly Amount
                    </th>
                    <th style={{ textAlign: "right", padding: "6px 8px" }}>
                      Yearly Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {statement.rows.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        background:
                          row.kind === "gross" || row.kind === "net"
                            ? "#f5f3ff"
                            : "transparent",
                        fontWeight:
                          row.kind === "gross" || row.kind === "net"
                            ? "bold"
                            : "normal",
                      }}
                    >
                      <td
                        style={{
                          padding: "4px 8px",
                          color:
                            row.kind === "deduction" ? "#dc2626" : "inherit",
                        }}
                      >
                        {row.name}
                      </td>
                      <td
                        style={{
                          padding: "4px 8px",
                          textAlign: "right",
                          color:
                            row.kind === "deduction" ? "#dc2626" : "inherit",
                        }}
                      >
                        {row.kind === "deduction"
                          ? `- ₹${row.monthly.toFixed(2)}`
                          : `₹${row.monthly.toFixed(2)}`}
                      </td>
                      <td
                        style={{
                          padding: "4px 8px",
                          textAlign: "right",
                          color:
                            row.kind === "deduction" ? "#dc2626" : "inherit",
                        }}
                      >
                        {row.kind === "deduction"
                          ? `- ₹${row.yearly.toFixed(2)}`
                          : `₹${row.yearly.toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
      className={`${cardAnimation} rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-4 shadow-sm ring-1 ring-slate-200/70`}
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
