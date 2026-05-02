import { redirect } from "next/navigation";

import { ApprovalsWorkspace } from "~/components/leave/ApprovalsWorkspace";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function LeaveApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  if (!["ADMIN", "HR_OFFICER"].includes(session.user.role)) {
    redirect("/dashboard/leave");
  }

  const [pending, all] = await Promise.all([
    api.leave.getPendingApprovals(),
    api.leave.getAllApprovals(),
  ]);

  const canApprove = ["ADMIN", "HR_OFFICER"].includes(session.user.role);

  return <ApprovalsWorkspace pending={pending} all={all} canApprove={canApprove} />;
}
