"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

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

export function ChangePasswordForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");

  const changePassword = api.auth.changePassword.useMutation({
    onSuccess: async (result, variables) => {
      setSuccess("Password updated! Redirecting...");
      setServerError("");

      await signIn("credentials", {
        identifier: result.identifier,
        password: variables.newPassword,
        redirect: false,
      });

      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => setServerError(error.message),
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
      return;
    }

    setErrors({});
    changePassword.mutate(result.data);
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <h1 className="text-xl font-bold text-gray-900">Set your password</h1>
      <p className="mt-1 text-sm text-gray-500">
        Your account requires a new password before you can continue.
      </p>

      {serverError && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <PasswordField
          id="currentPassword"
          label="Current (temporary) password"
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
          className="w-full rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
        >
          {changePassword.isPending ? "Updating..." : "Set new password"}
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
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition outline-none focus:ring-2 focus:ring-purple-500 ${error ? "border-red-400 bg-red-50" : "border-gray-300"
          }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
