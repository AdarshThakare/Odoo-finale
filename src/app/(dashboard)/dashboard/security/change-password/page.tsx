import { redirect } from "next/navigation";

// The change-password flow is now at /change-password (outside the dashboard
// layout) to avoid an infinite redirect loop for users with mustChangePassword.
export default function OldChangePasswordRedirect() {
  redirect("/change-password");
}
