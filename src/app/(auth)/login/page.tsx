"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { BrandName } from "~/components/BrandLogo";

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
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-7">
        <p className="text-xs font-semibold tracking-[0.18em] text-purple-700 uppercase">
          Welcome back
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-gray-950">
          Sign in to <BrandName />
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Use your login ID or work email to continue.
        </p>
      </div>

      {serverError && (
        <div className="mb-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="identifier"
            className="block text-sm font-semibold text-gray-800"
          >
            Login ID or email
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="SAKA20260001 or name@company.com"
            className={`mt-2 block h-11 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 shadow-sm transition outline-none placeholder:text-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 ${
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
            className="block text-sm font-semibold text-gray-800"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className={`mt-2 block h-11 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 shadow-sm transition outline-none placeholder:text-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 ${
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
          className="mt-1 h-11 w-full rounded-lg bg-purple-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800 focus:ring-4 focus:ring-purple-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-gray-500">
        Need to create a company?{" "}
        <Link
          href="/register"
          className="font-semibold text-purple-700 hover:text-purple-800"
        >
          Create an admin account
        </Link>
      </p>
    </div>
  );
}
