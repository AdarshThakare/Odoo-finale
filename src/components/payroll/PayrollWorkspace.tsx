"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { api, type RouterOutputs } from "~/trpc/react";

type Period = RouterOutputs["payroll"]["listPeriods"][number];
type MyPayslip = RouterOutputs["payroll"]["listMyPayslips"][number];

const periodSchema = z.object({
  name: z.string().min(2, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

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

export function PayrollWorkspace({
  mode,
  periods: initialPeriods,
  payslips,
}: {
  mode: "manager" | "employee";
  periods: Period[];
  payslips: MyPayslip[];
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");

  const { data: periods = initialPeriods } = api.payroll.listPeriods.useQuery(
    undefined,
    {
      enabled: mode === "manager",
      initialData: initialPeriods,
    },
  );

  const createPeriod = api.payroll.createPeriod.useMutation({
    onSuccess: async () => {
      setError("");
      setCreated("Payroll period created.");
      await utils.payroll.listPeriods.invalidate();
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  function handleCreatePeriod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreated("");
    const formData = new FormData(event.currentTarget);
    const result = periodSchema.safeParse({
      name: formData.get("name"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid period");
      return;
    }

    createPeriod.mutate(result.data);
  }

  if (mode === "employee") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My payslips</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your generated salary slips.
        </p>
        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Deductions</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payslips.map((slip) => (
                <tr key={slip.id}>
                  <td className="px-4 py-3 text-gray-900">
                    {formatDate(slip.createdAt)}
                  </td>
                  <td className="px-4 py-3">{money(slip.grossSalary)}</td>
                  <td className="px-4 py-3">{money(slip.totalDeductions)}</td>
                  <td className="px-4 py-3 font-semibold">
                    {money(slip.netSalary)}
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
              {payslips.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                    No payslips generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create monthly periods and run payroll for active employees.
        </p>
      </div>

      <form
        onSubmit={handleCreatePeriod}
        className="mt-6 grid gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 md:grid-cols-4"
      >
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Name</span>
          <input
            name="name"
            placeholder="May 2026"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Start</span>
          <input
            name="startDate"
            type="date"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">End</span>
          <input
            name="endDate"
            type="date"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={createPeriod.isPending}
            className="w-full rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
          >
            {createPeriod.isPending ? "Creating..." : "Create period"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {created && (
        <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {created}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Net total</th>
              <th className="px-4 py-3">Slips</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {periods.map((period) => {
              const entry = period.payrollEntries[0];
              return (
                <tr key={period.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {period.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(period.startDate)} - {formatDate(period.endDate)}
                  </td>
                  <td className="px-4 py-3">{period.status}</td>
                  <td className="px-4 py-3">
                    {entry ? money(entry.totalNet) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {entry?.salarySlips.length ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/payroll/${period.id}`}
                      className="font-semibold text-purple-700 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {periods.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
                  No payroll periods yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
