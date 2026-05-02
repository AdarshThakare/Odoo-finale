"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().min(1, "Login ID or email is required"),
  password: z.string().min(1, "Password is required"),
});

type FieldErrors = Partial<Record<"identifier" | "password", string>>;

export default function LoginPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");

    const formData = new FormData(event.currentTarget);
    const result = loginSchema.safeParse({
      identifier: formData.get("identifier"),
      password: formData.get("password"),
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
    setLoading(true);

    const response = await signIn("credentials", {
      identifier: result.data.identifier,
      password: result.data.password,
      redirect: false,
    });

    setLoading(false);

    if (response?.error) {
      setServerError("Invalid login ID, email, or password");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">
        Sign in to your account
      </h2>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="identifier"
            className="block text-sm font-medium text-gray-700"
          >
            Login ID or email
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition outline-none focus:ring-2 focus:ring-purple-500 ${
              errors.identifier ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.identifier && (
            <p className="mt-1 text-xs text-red-600">{errors.identifier}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition outline-none focus:ring-2 focus:ring-purple-500 ${
              errors.password ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Need to create a company?{" "}
        <Link href="/register" className="font-semibold text-purple-700">
          Create an admin account
        </Link>
      </p>
    </div>
  );
}
