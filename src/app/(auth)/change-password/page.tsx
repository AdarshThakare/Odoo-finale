import { redirect } from "next/navigation";

import { BrandLogo } from "~/components/BrandLogo";
import { auth } from "~/server/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();

  // Not logged in → go to login
  if (!session?.user) redirect("/login");

  // Already changed password → go to dashboard
  if (!session.user.mustChangePassword) redirect("/dashboard");

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex justify-center">
        <BrandLogo size="md" />
      </div>
      <ChangePasswordForm />
    </div>
  );
}
