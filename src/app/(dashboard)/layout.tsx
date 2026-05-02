import { redirect } from "next/navigation";

import { Sidebar } from "~/components/layout/Sidebar";
import { auth } from "~/server/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) {
    redirect("/dashboard/security/change-password");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role={session.user.role}
        userName={session.user.name ?? session.user.email ?? "EMPAY User"}
      />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="px-4 pt-20 pb-24 sm:px-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
