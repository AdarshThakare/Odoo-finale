import { redirect } from "next/navigation";

import { PayrollWorkspace } from "~/components/payroll/PayrollWorkspace";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function PayrollPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) {
    redirect("/dashboard/security/change-password");
  }

  const canRunPayroll = ["ADMIN", "PAYROLL_OFFICER"].includes(
    session.user.role,
  );

  if (canRunPayroll) {
    const periods = await api.payroll.listPeriods();
    return <PayrollWorkspace mode="manager" periods={periods} payslips={[]} />;
  }

  const payslips = await api.payroll.listMyPayslips();
  return <PayrollWorkspace mode="employee" periods={[]} payslips={payslips} />;
}
