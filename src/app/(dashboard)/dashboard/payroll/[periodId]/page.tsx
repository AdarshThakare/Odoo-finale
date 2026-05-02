import { redirect } from "next/navigation";

import { PayrunDetail } from "~/components/payroll/PayrunDetail";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function PayrollPeriodPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) {
    redirect("/dashboard/security/change-password");
  }

  if (!["ADMIN", "PAYROLL_OFFICER"].includes(session.user.role)) {
    redirect("/dashboard/payroll");
  }

  const { periodId } = await params;
  const period = await api.payroll.getPayrollEntry({ periodId });

  return <PayrunDetail period={period} />;
}
