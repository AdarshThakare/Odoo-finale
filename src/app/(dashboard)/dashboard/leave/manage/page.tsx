import { redirect } from "next/navigation";

import { LeaveManageWorkspace } from "~/components/leave/LeaveManageWorkspace";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function LeaveManagePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  if (!["ADMIN", "HR_OFFICER"].includes(session.user.role)) {
    redirect("/dashboard/leave");
  }

  const [leaveTypes, employees] = await Promise.all([
    api.leave.listTypes(),
    api.employee.list(),
  ]);

  return <LeaveManageWorkspace leaveTypes={leaveTypes} employees={employees} />;
}
