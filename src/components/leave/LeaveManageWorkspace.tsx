"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconArrowLeft,
  IconCalendarStats,
  IconCirclePlus,
  IconSettings,
  IconUsersGroup,
  type TablerIcon,
} from "@tabler/icons-react";

import { useToast } from "~/components/ui/Toaster";
import { api, type RouterOutputs } from "~/trpc/react";

type LeaveType = RouterOutputs["leave"]["listTypes"][number];
type Employee = RouterOutputs["employee"]["list"][number];

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];
const cardAnimation =
  "dash-fade-up opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none";

export function LeaveManageWorkspace({
  leaveTypes: initialLeaveTypes,
  employees,
}: {
  leaveTypes: LeaveType[];
  employees: Employee[];
}) {
  const utils = api.useUtils();
  const toast = useToast();
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

  const { data: leaveTypes = initialLeaveTypes } = api.leave.listTypes.useQuery(
    undefined,
    { initialData: initialLeaveTypes },
  );

  const paidTypes = leaveTypes.filter((leaveType) => leaveType.isPaid).length;
  const carryForwardTypes = leaveTypes.filter(
    (leaveType) => leaveType.carryForward,
  ).length;

  const createType = api.leave.createType.useMutation({
    onSuccess: () => {
      setTypeForm({
        name: "",
        maxDaysPerYear: 12,
        isPaid: true,
        carryForward: false,
      });
      setTypeError("");
      toast.success("Leave type created.");
      void utils.leave.listTypes.invalidate();
    },
    onError: (error) => {
      setTypeError(error.message);
      toast.error(error.message);
    },
  });

  const allocate = api.leave.allocate.useMutation({
    onSuccess: () => {
      setAllocationError("");
      setAllocationSuccess("Leave allocated successfully.");
      toast.success("Leave allocated successfully.");
      setTimeout(() => setAllocationSuccess(""), 3000);
    },
    onError: (error) => {
      setAllocationError(error.message);
      setAllocationSuccess("");
      toast.error(error.message);
    },
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
              href="/dashboard/leave"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
            >
              <IconArrowLeft size={16} stroke={2} aria-hidden="true" />
              Leave
            </Link>
            <p className="mt-5 text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
              Leave setup
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Manage leave
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Configure leave policies and allocate yearly quotas from one
              workspace.
            </p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={IconSettings}
            label="Leave types"
            value={String(leaveTypes.length)}
            detail={`${paidTypes} paid policies`}
            delay="80ms"
          />
          <MetricCard
            icon={IconCalendarStats}
            label="Carry forward"
            value={String(carryForwardTypes)}
            detail="Policies that roll over"
            delay="120ms"
          />
          <MetricCard
            icon={IconUsersGroup}
            label="Employees"
            value={String(employees.length)}
            detail="Available for allocation"
            delay="160ms"
          />
          <MetricCard
            icon={IconCirclePlus}
            label="Allocation year"
            value={String(allocationForm.year)}
            detail="Selected quota year"
            delay="200ms"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
          <section
            className={`${cardAnimation} rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6`}
            style={{ animationDelay: "240ms" }}
          >
            <PanelHeader
              title="Create leave type"
              helper="Define a policy once, then allocate it to employees."
            />

            {typeError && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                {typeError}
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <FieldLabel>Name</FieldLabel>
                <input
                  value={typeForm.name}
                  onChange={(event) =>
                    setTypeForm((form) => ({
                      ...form,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Casual Leave"
                  className="mt-1 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>

              <label className="block">
                <FieldLabel>Max days per year</FieldLabel>
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
                  className="mt-1 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2 md:pt-6">
                <Toggle
                  label="Paid"
                  checked={typeForm.isPaid}
                  onChange={(checked) =>
                    setTypeForm((form) => ({ ...form, isPaid: checked }))
                  }
                />
                <Toggle
                  label="Carry forward"
                  checked={typeForm.carryForward}
                  onChange={(checked) =>
                    setTypeForm((form) => ({
                      ...form,
                      carryForward: checked,
                    }))
                  }
                />
              </div>
            </div>

            <button
              type="button"
              disabled={createType.isPending || !typeForm.name.trim()}
              onClick={() => createType.mutate(typeForm)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
            >
              <IconCirclePlus size={17} stroke={2} aria-hidden="true" />
              {createType.isPending ? "Adding..." : "Add leave type"}
            </button>
          </section>

          <section
            className={`${cardAnimation} rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6`}
            style={{ animationDelay: "280ms" }}
          >
            <PanelHeader
              title="Allocate leave"
              helper="Assign yearly quota to an employee."
            />

            {allocationError && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                {allocationError}
              </div>
            )}
            {allocationSuccess && (
              <div className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-700 ring-1 ring-violet-100">
                {allocationSuccess}
              </div>
            )}

            <div className="mt-5 grid gap-4">
              <label className="block">
                <FieldLabel>Employee</FieldLabel>
                <select
                  value={allocationForm.employeeId}
                  onChange={(event) =>
                    setAllocationForm((form) => ({
                      ...form,
                      employeeId: event.target.value,
                    }))
                  }
                  className="mt-1 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <FieldLabel>Leave type</FieldLabel>
                  <select
                    value={allocationForm.leaveTypeId}
                    onChange={(event) =>
                      setAllocationForm((form) => ({
                        ...form,
                        leaveTypeId: event.target.value,
                      }))
                    }
                    className="mt-1 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
                  <FieldLabel>Year</FieldLabel>
                  <select
                    value={allocationForm.year}
                    onChange={(event) =>
                      setAllocationForm((form) => ({
                        ...form,
                        year: Number(event.target.value),
                      }))
                    }
                    className="mt-1 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <FieldLabel>Total days</FieldLabel>
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
                  className="mt-1 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
            >
              <IconCalendarStats size={17} stroke={2} aria-hidden="true" />
              {allocate.isPending ? "Allocating..." : "Allocate leave"}
            </button>
          </section>
        </section>

        <section
          className={`${cardAnimation} overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70`}
          style={{ animationDelay: "320ms" }}
        >
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PanelHeader
                title={`Existing types (${leaveTypes.length})`}
                helper="Configured leave policies available for allocation."
              />
              <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70">
                {paidTypes} paid
              </span>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {leaveTypes.map((leaveType) => (
              <div
                key={leaveType.id}
                className="rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-4 shadow-sm ring-1 ring-slate-200/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {leaveType.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {leaveType.maxDaysPerYear} days/year
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge>{leaveType.isPaid ? "Paid" : "Unpaid"}</Badge>
                    {leaveType.carryForward && <Badge>Carry</Badge>}
                  </div>
                </div>
              </div>
            ))}
            {leaveTypes.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                No leave types configured yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PanelHeader({ title, helper }: { title: string; helper: string }) {
  return (
    <div>
      <h2 className="font-display text-sm font-medium text-slate-900">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
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
          <p className="font-display mt-1 text-2xl font-semibold text-slate-900">
            {value}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
      {children}
    </span>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-violet-700"
      />
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-violet-700 ring-1 ring-violet-100">
      {children}
    </span>
  );
}
