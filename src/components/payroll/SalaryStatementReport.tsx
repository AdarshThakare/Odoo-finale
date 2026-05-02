"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";

type Employee = RouterOutputs["employee"]["list"][number];

interface Props {
  employees: Employee[];
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate and print salary statement reports
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-4 font-semibold text-gray-900">
          Salary Statement Report
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Employee Name
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="block w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
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
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="block w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
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
              className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800"
            >
              Print
            </button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {/* Screen preview */}
      {statement && (
        <div className="no-print rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-100 px-6 py-4">
            <p className="font-semibold text-gray-900">
              Salary Statement Report — {year}
            </p>
            <p className="text-sm text-gray-500">
              {statement.employee.name} · {statement.employee.designation} ·
              Effective from {fmt(statement.employee.salaryEffectiveFrom)}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-6 py-3 font-semibold text-gray-600">
                  Salary Components
                </th>
                <th className="px-6 py-3 text-right font-semibold text-gray-600">
                  Monthly Amount
                </th>
                <th className="px-6 py-3 text-right font-semibold text-gray-600">
                  Yearly Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {statement.rows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-50 ${
                    row.kind === "gross" || row.kind === "net"
                      ? "bg-purple-50 font-semibold"
                      : ""
                  }`}
                >
                  <td
                    className={`px-6 py-2.5 ${
                      row.kind === "deduction"
                        ? "text-red-700"
                        : "text-gray-900"
                    }`}
                  >
                    {row.name}
                  </td>
                  <td
                    className={`px-6 py-2.5 text-right ${
                      row.kind === "deduction"
                        ? "text-red-700"
                        : "text-gray-700"
                    }`}
                  >
                    {row.kind === "deduction"
                      ? `- ${money(row.monthly)}`
                      : money(row.monthly)}
                  </td>
                  <td
                    className={`px-6 py-2.5 text-right ${
                      row.kind === "deduction"
                        ? "text-red-700"
                        : "text-gray-700"
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
            style={{ fontFamily: "Arial, sans-serif", fontSize: "11px", padding: "24px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "2px" }}>
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
                <span style={{ color: "#6b7280" }}>Salary Effective From: </span>
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
                        color: row.kind === "deduction" ? "#dc2626" : "inherit",
                      }}
                    >
                      {row.name}
                    </td>
                    <td
                      style={{
                        padding: "4px 8px",
                        textAlign: "right",
                        color: row.kind === "deduction" ? "#dc2626" : "inherit",
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
                        color: row.kind === "deduction" ? "#dc2626" : "inherit",
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
  );
}
