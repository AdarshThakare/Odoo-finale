"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconCalendarPlus,
  IconFileInvoice,
  IconReportMoney,
  IconWallet,
  type TablerIcon,
} from "@tabler/icons-react";
import { z } from "zod";

import { useToast } from "~/components/ui/Toaster";
import { api, type RouterOutputs } from "~/trpc/react";

type Period = RouterOutputs["payroll"]["listPeriods"][number];
type MyPayslip = RouterOutputs["payroll"]["listMyPayslips"][number];

const periodSchema = z.object({
  name: z.string().min(2, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

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
  const toast = useToast();
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
      toast.success("Payroll period created.");
      await utils.payroll.listPeriods.invalidate();
      router.refresh();
    },
    onError: (mutationError) => {
      setError(mutationError.message);
      toast.error(mutationError.message);
    },
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
      const message = result.error.issues[0]?.message ?? "Invalid period";
      setError(message);
      toast.error(message);
      return;
    }

    createPeriod.mutate(result.data);
  }

  if (mode === "employee") {
    const totalNet = payslips.reduce(
      (sum, slip) => sum + Number(slip.netSalary),
      0,
    );

    return (
      <PayrollShell
        eyebrow="Payroll"
        title="My payslips"
        description="View generated salary slips and net payouts."
      >
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            icon={IconFileInvoice}
            label="Payslips"
            value={String(payslips.length)}
            detail="Available slips"
            delay="80ms"
          />
          <MetricCard
            icon={IconWallet}
            label="Net payout"
            value={money(totalNet)}
            detail="Across visible slips"
            delay="120ms"
          />
          <MetricCard
            icon={IconReportMoney}
            label="Latest"
            value={payslips[0] ? money(payslips[0].netSalary) : "-"}
            detail={
              payslips[0] ? formatDate(payslips[0].createdAt) : "No slip yet"
            }
            delay="160ms"
          />
        </section>

        <PayrollTable
          title="Payslip history"
          helper={`${payslips.length} generated slip${
            payslips.length !== 1 ? "s" : ""
          }`}
          headers={["Period", "Gross", "Deductions", "Net", "Action"]}
          empty="No payslips generated yet."
          delay="200ms"
        >
          {payslips.map((slip) => (
            <tr key={slip.id}>
              <td className="px-5 py-3 text-slate-900">
                {formatDate(slip.createdAt)}
              </td>
              <td className="px-5 py-3 text-slate-700">
                {money(slip.grossSalary)}
              </td>
              <td className="px-5 py-3 text-slate-700">
                {money(slip.totalDeductions)}
              </td>
              <td className="px-5 py-3 font-semibold text-slate-900">
                {money(slip.netSalary)}
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
        </PayrollTable>
      </PayrollShell>
    );
  }

  const completedPeriods = periods.filter((period) => period.payrollEntries[0]);
  const totalNet = periods.reduce(
    (sum, period) => sum + Number(period.payrollEntries[0]?.totalNet ?? 0),
    0,
  );
  const totalSlips = periods.reduce(
    (sum, period) => sum + (period.payrollEntries[0]?.salarySlips.length ?? 0),
    0,
  );

  return (
    <PayrollShell
      eyebrow="Payroll"
      title="Payroll workspace"
      description="Create monthly periods and run payroll for active employees."
      action={
        <Link
          href="/dashboard/payroll/reports"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <IconReportMoney size={16} stroke={2} aria-hidden="true" />
          Reports
        </Link>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={IconCalendarPlus}
          label="Periods"
          value={String(periods.length)}
          detail={`${completedPeriods.length} completed`}
          delay="80ms"
        />
        <MetricCard
          icon={IconWallet}
          label="Net payroll"
          value={money(totalNet)}
          detail="Across completed runs"
          delay="120ms"
        />
        <MetricCard
          icon={IconFileInvoice}
          label="Payslips"
          value={String(totalSlips)}
          detail="Generated slips"
          delay="160ms"
        />
        <MetricCard
          icon={IconReportMoney}
          label="Latest run"
          value={completedPeriods[0]?.name ?? "-"}
          detail="Most recent completed period"
          delay="200ms"
        />
      </section>

      <section
        className={`${cardAnimation} rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6`}
        style={{ animationDelay: "240ms" }}
      >
        <PanelHeader
          title="Create period"
          helper="Set the date range before generating payslips."
        />
        <form
          onSubmit={handleCreatePeriod}
          className="mt-4 grid gap-4 md:grid-cols-4"
        >
          <Field name="name" label="Name" placeholder="May 2026" />
          <Field name="startDate" label="Start" type="date" />
          <Field name="endDate" label="End" type="date" />
          <div className="flex items-end">
            <button
              type="submit"
              disabled={createPeriod.isPending}
              className="h-11 w-full rounded-full bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
            >
              {createPeriod.isPending ? "Creating..." : "Create period"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}
        {created && (
          <div className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-700 ring-1 ring-violet-100">
            {created}
          </div>
        )}
      </section>

      <PayrollTable
        title="Payroll periods"
        helper={`${periods.length} period${periods.length !== 1 ? "s" : ""}`}
        headers={["Period", "Dates", "Status", "Net total", "Slips", "Action"]}
        empty="No payroll periods yet."
        delay="280ms"
        colSpan={6}
      >
        {periods.map((period) => {
          const entry = period.payrollEntries[0];
          return (
            <tr key={period.id}>
              <td className="px-5 py-3 font-medium text-slate-900">
                {period.name}
              </td>
              <td className="px-5 py-3 text-slate-700">
                {formatDate(period.startDate)} - {formatDate(period.endDate)}
              </td>
              <td className="px-5 py-3">
                <StatusBadge label={period.status} />
              </td>
              <td className="px-5 py-3 text-slate-700">
                {entry ? money(entry.totalNet) : "-"}
              </td>
              <td className="px-5 py-3 text-slate-700">
                {entry?.salarySlips.length ?? 0}
              </td>
              <td className="px-5 py-3">
                <Link
                  href={`/dashboard/payroll/${period.id}`}
                  className="font-semibold text-violet-700 hover:text-violet-800"
                >
                  Open
                </Link>
              </td>
            </tr>
          );
        })}
      </PayrollTable>
    </PayrollShell>
  );
}

function PayrollShell({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="relative space-y-8">
        <header
          className={`${cardAnimation} flex flex-wrap items-start justify-between gap-4`}
          style={{ animationDelay: "40ms" }}
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
              {eyebrow}
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>
          {action}
        </header>
        {children}
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

function Field({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-1 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function PayrollTable({
  title,
  helper,
  headers,
  empty,
  delay,
  children,
  colSpan = 5,
}: {
  title: string;
  helper: string;
  headers: string[];
  empty: string;
  delay: string;
  children: React.ReactNode;
  colSpan?: number;
}) {
  const hasRows = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  return (
    <section
      className={`${cardAnimation} overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70`}
      style={{ animationDelay: delay }}
    >
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PanelHeader title={title} helper={helper} />
          <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70">
            {helper}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-white text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-5 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {hasRows ? (
              children
            ) : (
              <tr>
                <td
                  className="px-5 py-10 text-center text-slate-500"
                  colSpan={colSpan}
                >
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-violet-700 ring-1 ring-violet-100">
      {label}
    </span>
  );
}
