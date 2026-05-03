"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { useToast } from "~/components/ui/Toaster";
import { api } from "~/trpc/react";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FieldErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmPassword", string>
>;

type ChangePasswordFormProps = {
  title?: string;
  description?: string;
  submitLabel?: string;
  currentPasswordLabel?: string;
  successRedirect?: string;
};

export function ChangePasswordForm({
  title = "Set your password",
  description = "Your account requires a new password before you can continue.",
  submitLabel = "Set new password",
  currentPasswordLabel = "Current (temporary) password",
  successRedirect = "/dashboard",
}: ChangePasswordFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");

  const changePassword = api.auth.changePassword.useMutation({
    onSuccess: async (result, variables) => {
      setSuccess("Password updated! Signing you in...");
      setServerError("");
      toast.success("Password updated. Refreshing your secure session.");

      // Re-sign in with the new password so the session token is refreshed
      // and mustChangePassword is cleared.
      const signInResult = await signIn("credentials", {
        identifier: result.identifier,
        password: variables.newPassword,
        redirect: false,
      });

      if (signInResult?.error) {
        setSuccess("");
        setServerError(
          "Password updated but auto sign-in failed. Please log in manually.",
        );
        toast.error("Password updated, but auto sign-in failed.");
        router.push("/login");
        return;
      }

      setSuccess("Done! Redirecting...");
      // Brief pause so the new session cookie is fully written before navigation
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push(successRedirect);
      router.refresh();
    },
    onError: (error) => {
      setServerError(error.message);
      toast.error(error.message);
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);
    const result = passwordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors;
        fieldErrors[field] ??= issue.message;
      });
      setErrors(fieldErrors);
      toast.error(
        result.error.issues[0]?.message ?? "Check the highlighted fields.",
      );
      return;
    }

    setErrors({});
    changePassword.mutate(result.data);
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8">
      <h1 className="font-display text-2xl font-semibold text-slate-900">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

      {serverError && (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {serverError}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <PasswordField
          id="currentPassword"
          label={currentPasswordLabel}
          error={errors.currentPassword}
          autoComplete="current-password"
        />
        <PasswordField
          id="newPassword"
          label="New password"
          error={errors.newPassword}
          autoComplete="new-password"
        />
        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={changePassword.isPending}
          className="h-11 w-full rounded-full bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {changePassword.isPending ? "Updating..." : submitLabel}
        </button>
      </form>
    </div>
  );
}

function PasswordField({
  id,
  label,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  error?: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        className={`mt-2 block h-11 w-full rounded-xl border px-3 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 ${
          error ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
        }`}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
