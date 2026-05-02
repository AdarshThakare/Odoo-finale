"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { api, type RouterOutputs } from "~/trpc/react";

type Balance = RouterOutputs["leave"]["getBalance"][number];

const applySchema = z
  .object({
    leaveTypeId: z.string().min(1, "Select a leave type"),
    fromDate: z.string().min(1, "Start date is required"),
    toDate: z.string().min(1, "End date is required"),
    isHalfDay: z.boolean(),
    halfDayDate: z.string().optional(),
    reason: z.string().min(5, "Please provide a reason"),
  })
  .refine((data) => !data.isHalfDay || !!data.halfDayDate, {
    message: "Half-day date is required",
    path: ["halfDayDate"],
  });

type FieldErrors = Partial<
  Record<keyof z.infer<typeof applySchema>, string>
>;

export function ApplyLeaveWorkspace({ balances }: { balances: Balance[] }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);

  const apply = api.leave.applyForLeave.useMutation({
    onSuccess: () => {
      router.push("/dashboard/leave");
      router.refresh();
    },
    onError: (error) => setServerError(error.message),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");

    const formData = new FormData(event.currentTarget);
    const halfDayDate = formData.get("halfDayDate");
    const result = applySchema.safeParse({
      leaveTypeId: formData.get("leaveTypeId"),
      fromDate: formData.get("fromDate"),
      toDate: formData.get("toDate"),
      isHalfDay,
      halfDayDate:
        typeof halfDayDate === "string" && halfDayDate.length > 0
          ? halfDayDate
          : undefined,
      reason: formData.get("reason"),
    });

    if (!result.success) {
      const nextErrors: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors;
        nextErrors[field] ??= issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    apply.mutate(result.data);
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/dashboard/leave"
        className="text-sm font-semibold text-purple-700 hover:underline"
      >
        Back to leave
      </Link>
      <div className="mt-3">
        <h1 className="text-2xl font-bold text-gray-900">Apply for leave</h1>
        <p className="mt-1 text-sm text-gray-500">
          Submit a request for payroll approval.
        </p>
      </div>

      {balances.length === 0 && (
        <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          You do not have any leave balance allocated yet.
        </div>
      )}

      {serverError && (
        <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <label
            htmlFor="leaveTypeId"
            className="block text-sm font-medium text-gray-700"
          >
            Leave type
          </label>
          <select
            id="leaveTypeId"
            name="leaveTypeId"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select leave type</option>
            {balances.map((balance) => (
              <option key={balance.leaveTypeId} value={balance.leaveTypeId}>
                {balance.leaveTypeName} ({balance.remainingDays} left)
              </option>
            ))}
          </select>
          {errors.leaveTypeId && (
            <p className="mt-1 text-xs text-red-600">{errors.leaveTypeId}</p>
          )}
        </div>

        <Field label="From date" id="fromDate" type="date" error={errors.fromDate} />
        <Field label="To date" id="toDate" type="date" error={errors.toDate} />

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={isHalfDay}
            onChange={(event) => setIsHalfDay(event.target.checked)}
            className="rounded border-gray-300 text-purple-700"
          />
          Half day
        </label>

        {isHalfDay && (
          <Field
            label="Half-day date"
            id="halfDayDate"
            type="date"
            error={errors.halfDayDate}
          />
        )}

        <div className="md:col-span-2">
          <label
            htmlFor="reason"
            className="block text-sm font-medium text-gray-700"
          >
            Reason
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={4}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
          />
          {errors.reason && (
            <p className="mt-1 text-xs text-red-600">{errors.reason}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={apply.isPending || balances.length === 0}
            className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
          >
            {apply.isPending ? "Submitting..." : "Submit request"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  error,
}: {
  id: string;
  label: string;
  type: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
