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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        role={session.user.role}
        userName={session.user.name ?? session.user.email ?? "EmPay User"}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
