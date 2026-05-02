import { redirect } from "next/navigation";

import { AttendanceWorkspace } from "~/components/attendance/AttendanceWorkspace";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

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

export default async function AttendanceAllPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string; search?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  const dateKey = params?.date?.trim() ?? new Date().toISOString().slice(0, 10);
  const search = params?.search?.trim() ?? undefined;
  const data = await api.attendance.getAllAttendance({ date: dateKey, search });
  const prevHref = buildHref("/dashboard/attendance/all", {
    date: addDays(dateKey, -1),
    search,
  });
  const nextHref = buildHref("/dashboard/attendance/all", {
    date: addDays(dateKey, 1),
    search,
  });

  return (
    <AttendanceWorkspace
      mode="team"
      data={data}
      basePath="/dashboard/attendance/all"
      prevHref={prevHref}
      nextHref={nextHref}
    />
  );
}
