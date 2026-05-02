"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { api } from "~/trpc/react";

const bootstrapSchema = z
  .object({
    companyName: z.string().min(2, "Company name is required"),
    adminName: z.string().min(2, "Admin name is required"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    companyLogoUrl: z.string().url("Invalid logo URL").optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FieldErrors = Partial<
  Record<
    "companyName" | "adminName" | "email" | "password" | "confirmPassword" | "companyLogoUrl",
    string
  >
>;

const MAX_LOGO_BYTES = 1024 * 1024;

export default function RegisterPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const bootstrapAdmin = api.auth.bootstrapAdmin.useMutation({
    onSuccess: (result) => {
      setServerError("");
      router.push("/login");
    },
    onError: (error) => setServerError(error.message),
  });

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      setLogoUrl(null);
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      setErrors((prev) => ({
        ...prev,
        companyLogoUrl: "Logo must be under 1MB",
      }));
      setLogoUrl(null);
      return;
    }

    setLogoUploading(true);
    setErrors((prev) => ({
      ...prev,
      companyLogoUrl: undefined,
    }));

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/upload/company-logo", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Logo upload failed");
      }

      if (!payload?.url) {
        throw new Error("Logo upload failed");
      }

      setLogoUrl(payload.url);
    } catch (error) {
      setLogoUrl(null);
      setErrors((prev) => ({
        ...prev,
        companyLogoUrl:
          error instanceof Error ? error.message : "Logo upload failed",
      }));
    } finally {
      setLogoUploading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");

    if (logoUploading) {
      setServerError("Please wait for the logo upload to finish");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const result = bootstrapSchema.safeParse({
      companyName: formData.get("companyName"),
      adminName: formData.get("adminName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      companyLogoUrl: logoUrl ?? undefined,
    });

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    bootstrapAdmin.mutate(result.data);
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-2 text-xl font-semibold text-gray-900">
        Set up your company
      </h2>
      <p className="mb-6 text-sm text-gray-600">
        Create the first admin account for your organization.
      </p>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Company name"
          id="companyName"
          error={errors.companyName}
        />
        <div>
          <label
            htmlFor="companyLogo"
            className="block text-sm font-medium text-gray-700"
          >
            Company logo (optional)
          </label>
          <input
            id="companyLogo"
            name="companyLogo"
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition outline-none focus:ring-2 focus:ring-purple-500 ${
              errors.companyLogoUrl
                ? "border-red-400 bg-red-50"
                : "border-gray-300"
            }`}
          />
          <p className="mt-1 text-xs text-gray-500">PNG or JPG, up to 1MB.</p>
          {logoUploading && (
            <p className="mt-1 text-xs text-gray-500">Uploading logo...</p>
          )}
          {logoUrl && !logoUploading && (
            <p className="mt-1 text-xs text-green-600">Logo uploaded.</p>
          )}
          {errors.companyLogoUrl && (
            <p className="mt-1 text-xs text-red-600">
              {errors.companyLogoUrl}
            </p>
          )}
        </div>
        <Field label="Admin name" id="adminName" error={errors.adminName} />
        <Field
          label="Work email"
          id="email"
          type="email"
          error={errors.email}
        />
        <Field
          label="Password"
          id="password"
          type="password"
          error={errors.password}
        />
        <Field
          label="Confirm password"
          id="confirmPassword"
          type="password"
          error={errors.confirmPassword}
        />

        <button
          type="submit"
          disabled={bootstrapAdmin.isPending || logoUploading}
          className="w-full rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
        >
          {bootstrapAdmin.isPending ? "Creating account..." : "Create admin"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-purple-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  error,
}: {
  id: string;
  label: string;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition outline-none focus:ring-2 focus:ring-purple-500 ${
          error ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
