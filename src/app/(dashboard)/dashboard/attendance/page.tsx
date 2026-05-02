import { redirect } from "next/navigation";

import { AttendanceWorkspace } from "~/components/attendance/AttendanceWorkspace";
import { auth } from "~/server/auth";
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
  searchParams?: Promise<{ month?: string; date?: string; search?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.mustChangePassword) {
    redirect("/dashboard/security/change-password");
  }

  if (session.user.role === "EMPLOYEE") {
    const monthKey = getMonthKey(params?.month);
    const data = await api.attendance.getMyAttendance({ month: monthKey });
    const prevHref = buildHref("/dashboard/attendance", {
      month: addMonths(monthKey, -1),
    });
    const nextHref = buildHref("/dashboard/attendance", {
      month: addMonths(monthKey, 1),
    });

    return (
      <AttendanceWorkspace
        mode="mine"
        data={data}
        basePath="/dashboard/attendance"
        prevHref={prevHref}
        nextHref={nextHref}
      />
    );
  }

  const dateKey = params?.date?.trim() ?? new Date().toISOString().slice(0, 10);
  const search = params?.search?.trim() ?? undefined;
  const data = await api.attendance.getAllAttendance({ date: dateKey, search });
  const prevHref = buildHref("/dashboard/attendance", {
    date: addDays(dateKey, -1),
    search,
  });
  const nextHref = buildHref("/dashboard/attendance", {
    date: addDays(dateKey, 1),
    search,
  });

  return (
    <AttendanceWorkspace
      mode="team"
      data={data}
      basePath="/dashboard/attendance"
      prevHref={prevHref}
      nextHref={nextHref}
    />
  );
}
