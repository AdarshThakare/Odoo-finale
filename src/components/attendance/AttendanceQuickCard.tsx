"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "~/trpc/react";

type AttendanceQuickCardProps = {
  className?: string;
};

type DayStatus = "ABSENT" | "PRESENT" | "HALF_DAY" | "ON_LEAVE" | "IN_PROGRESS";

const statusStyles: Record<
  "PRESENT" | "ON_LEAVE" | "ABSENT" | "IN_PROGRESS" | "HALF_DAY",
  { label: string; dot: string }
> = {
  PRESENT: { label: "Present", dot: "bg-emerald-400" },
  IN_PROGRESS: { label: "Checked in", dot: "bg-emerald-300" },
  HALF_DAY: { label: "Half day", dot: "bg-lime-300" },
  ON_LEAVE: { label: "On leave", dot: "bg-sky-400" },
  ABSENT: { label: "Absent", dot: "bg-amber-400" },
};

export function AttendanceQuickCard({ className = "" }: AttendanceQuickCardProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const attendanceQuery = api.attendance.getMyAttendance.useQuery();
  const checkIn = api.attendance.checkIn.useMutation({
    onSuccess: () => {
      setMessage("Check-in recorded.");
      setErrorMessage(null);
      router.refresh();
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(error.message);
    },
  });

  const checkOut = api.attendance.checkOut.useMutation({
    onSuccess: () => {
      setMessage("Check-out recorded.");
      setErrorMessage(null);
      router.refresh();
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(error.message);
    },
  });

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayRecord = attendanceQuery.data?.days.find(
    (day) => day.date === todayKey,
  );
  const status: DayStatus | null = attendanceQuery.data
    ? attendanceQuery.data.stats.currentlyCheckedIn
      ? "IN_PROGRESS"
      : todayRecord?.status ?? "ABSENT"
    : null;
  const statusToken = status ? statusStyles[status] : null;
  const checkInLabel = todayRecord?.checkIn
    ? `Since ${todayRecord.checkIn}`
    : "Not checked in";
  const isCheckedIn = attendanceQuery.data?.stats.currentlyCheckedIn ?? false;

  if (attendanceQuery.isLoading) {
    return (
      <div
        className={`rounded-2xl border border-slate-800/60 bg-slate-900/70 p-5 text-sm text-slate-200 ${className}`}
      >
        Loading attendance...
      </div>
    );
  }

  if (attendanceQuery.error || !attendanceQuery.data) {
    return (
      <div
        className={`rounded-2xl border border-slate-800/60 bg-slate-900/70 p-5 text-sm text-slate-200 ${className}`}
      >
        Attendance widget unavailable.
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-slate-800/60 bg-slate-900/70 p-5 text-slate-100 shadow-lg ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Attendance
          </p>
          <h3 className="text-lg font-semibold">Quick check-in</h3>
        </div>
        {statusToken && (
          <span
            className={`h-3 w-3 rounded-full ${statusToken.dot}`}
            title={statusToken.label}
          />
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
        <p className="text-xs text-slate-400">Status</p>
        <p className="mt-1 text-sm font-semibold text-slate-100">
          {statusToken?.label ?? "Unknown"}
        </p>
        <p className="mt-2 text-xs text-slate-300">{checkInLabel}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => checkIn.mutate()}
          disabled={checkIn.isPending || isCheckedIn}
          className="rounded-lg bg-emerald-400/90 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
        >
          {checkIn.isPending ? "Recording..." : "Check in"}
        </button>
        <button
          type="button"
          onClick={() => checkOut.mutate()}
          disabled={checkOut.isPending || !isCheckedIn}
          className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-800 disabled:opacity-60"
        >
          {checkOut.isPending ? "Recording..." : "Check out"}
        </button>
      </div>

      {(message || errorMessage) && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-xs ${
            errorMessage
              ? "bg-red-500/10 text-red-200"
              : "bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {errorMessage ?? message}
        </div>
      )}
    </div>
  );
}
