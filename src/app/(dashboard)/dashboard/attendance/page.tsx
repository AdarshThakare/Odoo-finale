import Link from "next/link";
import { redirect } from "next/navigation";

import { AttendanceWorkspace } from "~/components/attendance/AttendanceWorkspace";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { api } from "~/trpc/server";

function getMonthKey(value?: string) {
  const now = new Date();
  if (!value) {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  const parsed = new Date(`${value}-01T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  return value;
}

function addMonths(value: string, offset: number) {
  const parsed = new Date(`${value}-01T00:00:00Z`);
  parsed.setUTCMonth(parsed.getUTCMonth() + offset);
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
}

function addDays(value: string, offset: number) {
  const parsed = new Date(`${value}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + offset);
  return parsed.toISOString().slice(0, 10);
}

function buildHref(
  basePath: string,
  params: Record<string, string | undefined>,
) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value.trim().length > 0) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    date?: string;
    search?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  const canSwitchView = session.user.role !== "EMPLOYEE";
  const defaultView = canSwitchView ? "team" : "mine";
  const requestedView = params?.view ?? defaultView;
  const view = canSwitchView ? requestedView : "mine";

  if (view === "mine") {
    const profile = await db.employee.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!profile && canSwitchView) {
      redirect(
        buildHref("/dashboard/attendance", {
          date: params?.date?.trim(),
          search: params?.search?.trim(),
          view: "team",
        }),
      );
    }

    if (!profile) {
      return <MissingEmployeeProfile />;
    }

    const monthKey = getMonthKey(params?.month);
    const data = await api.attendance.getMyAttendance({ month: monthKey });
    const prevHref = buildHref("/dashboard/attendance", {
      month: addMonths(monthKey, -1),
      view: canSwitchView ? "mine" : undefined,
    });
    const nextHref = buildHref("/dashboard/attendance", {
      month: addMonths(monthKey, 1),
      view: canSwitchView ? "mine" : undefined,
    });

    return (
      <AttendanceWorkspace
        mode="mine"
        data={data}
        basePath="/dashboard/attendance"
        prevHref={prevHref}
        nextHref={nextHref}
        canSwitchView={canSwitchView}
      />
    );
  }

  const dateKey = params?.date?.trim() ?? new Date().toISOString().slice(0, 10);
  const search = params?.search?.trim() ?? undefined;
  const data = await api.attendance.getAllAttendance({ date: dateKey, search });
  const prevHref = buildHref("/dashboard/attendance", {
    date: addDays(dateKey, -1),
    search,
    view: "team",
  });
  const nextHref = buildHref("/dashboard/attendance", {
    date: addDays(dateKey, 1),
    search,
    view: "team",
  });

  return (
    <AttendanceWorkspace
      mode="team"
      data={data}
      basePath="/dashboard/attendance"
      prevHref={prevHref}
      nextHref={nextHref}
      canSwitchView={canSwitchView}
    />
  );
}

function MissingEmployeeProfile() {
  return (
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
        <p className="text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
          Attendance
        </p>
        <h1 className="font-display mt-3 text-2xl font-semibold text-slate-900">
          Employee profile required
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Your account is active, but it is not linked to an employee profile
          yet. Attendance can start after HR creates your employee record.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
