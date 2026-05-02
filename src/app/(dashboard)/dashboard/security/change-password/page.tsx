import { redirect } from "next/navigation";

// The security page now lives inside the dashboard.
export default function OldChangePasswordRedirect() {
  redirect("/dashboard/security");
}
