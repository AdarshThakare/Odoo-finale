import { redirect } from "next/navigation";

import { MyLeaveWorkspace } from "~/components/leave/MyLeaveWorkspace";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function LeavePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  const canManage = ["ADMIN", "HR_OFFICER"].includes(session.user.role);
  const canApprove = ["ADMIN", "HR_OFFICER"].includes(session.user.role);
  const hasPersonalLeaveProfile = session.user.role !== "ADMIN";

  const [balances, applications, pendingApprovals, leaveTypes, employees] =
    await Promise.all([
      hasPersonalLeaveProfile ? api.leave.getBalance() : Promise.resolve([]),
      hasPersonalLeaveProfile
        ? api.leave.getMyApplications()
        : Promise.resolve([]),
      canApprove ? api.leave.getPendingApprovals() : Promise.resolve([]),
      canManage ? api.leave.listTypes() : Promise.resolve([]),
      canManage ? api.employee.list() : Promise.resolve([]),
    ]);

  return (
    <MyLeaveWorkspace
      balances={balances}
      applications={applications}
      role={session.user.role}
      canManage={canManage}
      canApprove={canApprove}
      hasPersonalLeaveProfile={hasPersonalLeaveProfile}
      pendingApprovals={pendingApprovals}
      pendingApprovalCount={pendingApprovals.length}
      leaveTypeCount={leaveTypes.length}
      employeeCount={employees.length}
    />
  );
}
