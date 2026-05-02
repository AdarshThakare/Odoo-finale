import { ChangePasswordForm } from "~/app/(auth)/change-password/ChangePasswordForm";

export default function SecurityPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <ChangePasswordForm
        title="Update password"
        description="Keep your account secure with a new password."
        submitLabel="Update password"
        currentPasswordLabel="Current password"
        successRedirect="/dashboard/security"
      />
    </div>
  );
}
