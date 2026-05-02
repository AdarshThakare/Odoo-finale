"use client";

import { useState } from "react";

import { api, type RouterOutputs } from "~/trpc/react";

type LeaveType = RouterOutputs["leave"]["listTypes"][number];
type Employee = RouterOutputs["employee"]["list"][number];

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

export function LeaveManageWorkspace({
  leaveTypes: initialLeaveTypes,
  employees,
}: {
  leaveTypes: LeaveType[];
  employees: Employee[];
}) {
  const utils = api.useUtils();
  const [tab, setTab] = useState<"types" | "allocations">("types");
  const [typeError, setTypeError] = useState("");
  const [allocationError, setAllocationError] = useState("");
  const [allocationSuccess, setAllocationSuccess] = useState("");
  const [typeForm, setTypeForm] = useState({
    name: "",
    maxDaysPerYear: 12,
    isPaid: true,
    carryForward: false,
  });
  const [allocationForm, setAllocationForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    year: currentYear,
    totalDays: 12,
  });

  const { data: leaveTypes = initialLeaveTypes } =
    api.leave.listTypes.useQuery(undefined, { initialData: initialLeaveTypes });

  const createType = api.leave.createType.useMutation({
    onSuccess: () => {
      setTypeForm({
        name: "",
        maxDaysPerYear: 12,
        isPaid: true,
        carryForward: false,
      });
      setTypeError("");
      void utils.leave.listTypes.invalidate();
    },
    onError: (error) => setTypeError(error.message),
  });

  const allocate = api.leave.allocate.useMutation({
    onSuccess: () => {
      setAllocationError("");
      setAllocationSuccess("Leave allocated successfully.");
      setTimeout(() => setAllocationSuccess(""), 3000);
    },
    onError: (error) => {
      setAllocationError(error.message);
      setAllocationSuccess("");
    },
  });

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure leave types and allocate yearly quotas.
        </p>
      </div>

      <div className="mt-6 flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
        <TabButton active={tab === "types"} onClick={() => setTab("types")}>
          Leave types
        </TabButton>
        <TabButton
          active={tab === "allocations"}
          onClick={() => setTab("allocations")}
        >
          Allocations
        </TabButton>
      </div>

      {tab === "types" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="font-semibold text-gray-900">Add leave type</h2>
            {typeError && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {typeError}
              </div>
            )}
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Name</span>
                <input
                  value={typeForm.name}
                  onChange={(event) =>
                    setTypeForm((form) => ({
                      ...form,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Casual Leave"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Max days per year
                </span>
                <input
                  type="number"
                  min={1}
                  value={typeForm.maxDaysPerYear}
                  onChange={(event) =>
                    setTypeForm((form) => ({
                      ...form,
                      maxDaysPerYear: Number(event.target.value),
                    }))
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={typeForm.isPaid}
                    onChange={(event) =>
                      setTypeForm((form) => ({
                        ...form,
                        isPaid: event.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-purple-700"
                  />
                  Paid leave
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={typeForm.carryForward}
                    onChange={(event) =>
                      setTypeForm((form) => ({
                        ...form,
                        carryForward: event.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-purple-700"
                  />
                  Carry forward
                </label>
              </div>
              <button
                type="button"
                disabled={createType.isPending || !typeForm.name.trim()}
                onClick={() => createType.mutate(typeForm)}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
              >
                {createType.isPending ? "Adding..." : "Add type"}
              </button>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="font-semibold text-gray-900">
              Existing types ({leaveTypes.length})
            </h2>
            <div className="mt-4 space-y-3">
              {leaveTypes.map((leaveType) => (
                <div
                  key={leaveType.id}
                  className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {leaveType.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {leaveType.maxDaysPerYear} days/year
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge>{leaveType.isPaid ? "Paid" : "Unpaid"}</Badge>
                    {leaveType.carryForward && <Badge>Carry</Badge>}
                  </div>
                </div>
              ))}
              {leaveTypes.length === 0 && (
                <p className="text-sm text-gray-500">
                  No leave types configured yet.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "allocations" && (
        <section className="mt-6 max-w-2xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="font-semibold text-gray-900">Allocate leave</h2>
          {allocationError && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {allocationError}
            </div>
          )}
          {allocationSuccess && (
            <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              {allocationSuccess}
            </div>
          )}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-gray-700">
                Employee
              </span>
              <select
                value={allocationForm.employeeId}
                onChange={(event) =>
                  setAllocationForm((form) => ({
                    ...form,
                    employeeId: event.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} -{" "}
                    {employee.user.loginId}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Leave type
              </span>
              <select
                value={allocationForm.leaveTypeId}
                onChange={(event) =>
                  setAllocationForm((form) => ({
                    ...form,
                    leaveTypeId: event.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select type</option>
                {leaveTypes.map((leaveType) => (
                  <option key={leaveType.id} value={leaveType.id}>
                    {leaveType.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Year</span>
              <select
                value={allocationForm.year}
                onChange={(event) =>
                  setAllocationForm((form) => ({
                    ...form,
                    year: Number(event.target.value),
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Total days
              </span>
              <input
                type="number"
                min={1}
                value={allocationForm.totalDays}
                onChange={(event) =>
                  setAllocationForm((form) => ({
                    ...form,
                    totalDays: Number(event.target.value),
                  }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={
              allocate.isPending ||
              !allocationForm.employeeId ||
              !allocationForm.leaveTypeId
            }
            onClick={() => allocate.mutate(allocationForm)}
            className="mt-5 rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
          >
            {allocate.isPending ? "Allocating..." : "Allocate leave"}
          </button>
        </section>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-white text-purple-700 shadow-sm"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">
      {children}
    </span>
  );
}
