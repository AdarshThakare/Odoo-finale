import { redirect } from "next/navigation";

import { ApplyLeaveWorkspace } from "~/components/leave/ApplyLeaveWorkspace";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function ApplyLeavePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) {
    redirect("/dashboard/security/change-password");
  }

  if (session.user.role === "ADMIN") {
    redirect("/dashboard/leave");
  }

  const balances = await api.leave.getBalance();

  return <ApplyLeaveWorkspace balances={balances} />;
}
