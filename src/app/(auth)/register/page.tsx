"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { api } from "~/trpc/react";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FieldErrors = Partial<
  Record<"name" | "email" | "password" | "confirmPassword", string>
>;

const fields = [
  { id: "name", label: "Full name", type: "text", autocomplete: "name" },
  { id: "email", label: "Email address", type: "email", autocomplete: "email" },
  {
    id: "password",
    label: "Password",
    type: "password",
    autocomplete: "new-password",
  },
  {
    id: "confirmPassword",
    label: "Confirm password",
    type: "password",
    autocomplete: "new-password",
  },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");

  const register = api.auth.register.useMutation({
    onSuccess: () => router.push("/login?registered=true"),
    onError: (error) => setServerError(error.message),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");

    const formData = new FormData(event.currentTarget);
    const result = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
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
    register.mutate({
      name: result.data.name,
      email: result.data.email,
      password: result.data.password,
    });
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">
        Create your account
      </h2>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(({ id, label, type, autocomplete }) => (
          <div key={id}>
            <label
              htmlFor={id}
              className="block text-sm font-medium text-gray-700"
            >
              {label}
            </label>
            <input
              id={id}
              name={id}
              type={type}
              autoComplete={autocomplete}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition outline-none focus:ring-2 focus:ring-purple-500 ${
                errors[id] ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors[id] && (
              <p className="mt-1 text-xs text-red-600">{errors[id]}</p>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={register.isPending}
          className="w-full rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
        >
          {register.isPending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-purple-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
