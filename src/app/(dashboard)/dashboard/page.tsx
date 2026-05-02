import { redirect } from "next/navigation";

import { DashboardWorkspace } from "~/components/dashboard/DashboardWorkspace";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session?.user.mustChangePassword) {
    redirect("/change-password");
  }

  const canSeeHr = ["ADMIN", "HR_OFFICER"].includes(session.user.role);
  const canSeePayroll = ["ADMIN", "PAYROLL_OFFICER"].includes(
    session.user.role,
  );

  const isAdmin = session.user.role === "ADMIN";

  const [stats, attendanceTrend, leaveDistribution, payrollTrend, headcount, warnings, recentPayruns] =
    await Promise.all([
      api.dashboard.getStats(),
      canSeeHr ? api.dashboard.getAttendanceTrend() : Promise.resolve([]),
      canSeeHr ? api.dashboard.getLeaveDistribution() : Promise.resolve([]),
      canSeePayroll ? api.dashboard.getPayrollTrend() : Promise.resolve([]),
      canSeeHr ? api.dashboard.getHeadcountByDepartment() : Promise.resolve([]),
      isAdmin ? api.dashboard.getAdminWarnings() : Promise.resolve({ withoutBank: 0, withoutManager: 0 }),
      canSeePayroll ? api.dashboard.getRecentPayruns() : Promise.resolve([]),
    ]);

  return (
    <DashboardWorkspace
      stats={stats}
      attendanceTrend={attendanceTrend}
      leaveDistribution={leaveDistribution}
      payrollTrend={payrollTrend}
      headcountByDepartment={headcount}
      warnings={warnings}
      recentPayruns={recentPayruns}
    />
  );
}
