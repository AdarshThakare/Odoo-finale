"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { useToast } from "~/components/ui/Toaster";
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

type FieldErrors = Partial<Record<keyof z.infer<typeof applySchema>, string>>;

function toUtcDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateLeaveDaysClient(
  fromDate: string,
  toDate: string,
  isHalfDay: boolean,
  halfDayDate?: string,
) {
  const from = toUtcDate(fromDate);
  const to = toUtcDate(toDate);
  if (!from || !to || from > to) return 0;
  let count = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (!isHalfDay || !halfDayDate) return count;

  const halfDay = toUtcDate(halfDayDate);
  if (!halfDay) return count;
  const halfDayWeekday = halfDay.getUTCDay();
  if (halfDayWeekday === 0 || halfDayWeekday === 6) return count;

  const inRange = halfDay >= from && halfDay <= to;
  return inRange ? Math.max(0, count - 0.5) : count + 0.5;
}

export function ApplyLeaveWorkspace({ balances }: { balances: Balance[] }) {
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [formState, setFormState] = useState({
    leaveTypeId: "",
    fromDate: "",
    toDate: "",
    halfDayDate: "",
  });

  const apply = api.leave.applyForLeave.useMutation({
    onSuccess: () => {
      toast.success("Leave request submitted.");
      router.push("/dashboard/leave");
      router.refresh();
    },
    onError: (error) => {
      setServerError(error.message);
      toast.error(error.message);
    },
  });

  const selectedBalance = balances.find(
    (balance) => balance.leaveTypeId === formState.leaveTypeId,
  );
  const requestedDays = calculateLeaveDaysClient(
    formState.fromDate,
    formState.toDate,
    isHalfDay,
    formState.halfDayDate,
  );
  const remainingDays = selectedBalance?.remainingDays ?? 0;
  const showRequested =
    formState.leaveTypeId.length > 0 &&
    formState.fromDate.length > 0 &&
    formState.toDate.length > 0;
  const isOverLimit = showRequested && requestedDays > remainingDays;

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
      toast.error(
        result.error.issues[0]?.message ?? "Check the highlighted fields.",
      );
      return;
    }

    setErrors({});

    const selected = balances.find(
      (balance) => balance.leaveTypeId === result.data.leaveTypeId,
    );
    if (!selected) {
      const message = "No allocation found for this leave type";
      setErrors({ leaveTypeId: message });
      toast.error(message);
      return;
    }
    const requested = calculateLeaveDaysClient(
      result.data.fromDate,
      result.data.toDate,
      result.data.isHalfDay,
      result.data.halfDayDate,
    );
    if (requested > selected.remainingDays) {
      const message = `Requested ${requested} days exceeds remaining ${selected.remainingDays} days`;
      setErrors({
        toDate: message,
      });
      toast.error(message);
      return;
    }

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
            value={formState.leaveTypeId}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                leaveTypeId: event.target.value,
              }))
            }
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

        <Field
          label="From date"
          id="fromDate"
          type="date"
          error={errors.fromDate}
          value={formState.fromDate}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, fromDate: event.target.value }))
          }
        />
        <Field
          label="To date"
          id="toDate"
          type="date"
          error={errors.toDate}
          value={formState.toDate}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, toDate: event.target.value }))
          }
        />

        {showRequested ? (
          <div
            className={`text-xs md:col-span-2 ${
              isOverLimit ? "text-red-600" : "text-gray-500"
            }`}
          >
            Requested {requestedDays} days. {remainingDays} remaining.
          </div>
        ) : null}

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
            value={formState.halfDayDate}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                halfDayDate: event.target.value,
              }))
            }
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
            disabled={apply.isPending || balances.length === 0 || isOverLimit}
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
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  error?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
        value={value}
        onChange={onChange}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
