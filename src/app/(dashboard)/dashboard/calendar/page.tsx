import { redirect } from "next/navigation";

import { CalendarWorkspace } from "~/components/calendar/CalendarWorkspace";
import { getDashboardCalendar } from "~/server/modules/calendar/calendar.service";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");

  const params = await searchParams;
  const data = await getDashboardCalendar(
    db,
    session.user.id,
    params.month,
  ).catch((error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "NOT_FOUND"
    ) {
      return null;
    }
    throw error;
  });

  if (!data) {
    return (
      <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
        <p className="text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
          Calendar
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
          Employee profile required
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Your account needs an employee profile before personal attendance and
          leave can appear on the calendar.
        </p>
      </div>
    );
  }

  return <CalendarWorkspace data={data} />;
}
