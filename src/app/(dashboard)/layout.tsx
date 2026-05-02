import { redirect } from "next/navigation";

import { Sidebar } from "~/components/layout/Sidebar";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      avatarUrl: true,
      email: true,
      name: true,
      employee: { select: { avatarUrl: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        role={session.user.role}
        userAvatarUrl={user?.avatarUrl ?? user?.employee?.avatarUrl ?? null}
        userName={
          user?.name ??
          session.user.name ??
          user?.email ??
          session.user.email ??
          "EMPAY User"
        }
      />
      <main className="min-w-0 md:pl-60">
        <div className="px-4 pt-20 pb-24 sm:px-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
