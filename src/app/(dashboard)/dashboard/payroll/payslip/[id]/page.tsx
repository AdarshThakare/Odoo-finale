import { redirect } from "next/navigation";

import { PayslipDetail } from "~/components/payroll/PayslipDetail";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function PayslipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  const { id } = await params;
  const payslip = await api.payroll.getPayslip({ id });

  return <PayslipDetail payslip={payslip} />;
}
