import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { SalaryStatementReport } from "~/components/payroll/SalaryStatementReport";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");

  const allowed = ["ADMIN", "PAYROLL_OFFICER"] as string[];
  if (!allowed.includes(session.user.role)) redirect("/dashboard");

  const employees = await api.employee.list();

  return <SalaryStatementReport employees={employees} />;
}
