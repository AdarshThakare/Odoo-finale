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
  const canApprove = ["ADMIN", "PAYROLL_OFFICER"].includes(session.user.role);
  const hasPersonalLeaveProfile = session.user.role !== "ADMIN";

  const [balances, applications] = hasPersonalLeaveProfile
    ? await Promise.all([
        api.leave.getBalance(),
        api.leave.getMyApplications(),
      ])
    : [[], []];

  return (
    <MyLeaveWorkspace
      balances={balances}
      applications={applications}
      role={session.user.role}
      canManage={canManage}
      canApprove={canApprove}
      hasPersonalLeaveProfile={hasPersonalLeaveProfile}
    />
  );
}
