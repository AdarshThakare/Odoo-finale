"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { useToast } from "~/components/ui/Toaster";
import { api } from "~/trpc/react";

const bootstrapFieldsSchema = z.object({
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
});

const bootstrapSchema = bootstrapFieldsSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  },
);

const securityStepSchema = bootstrapFieldsSchema
  .pick({
    password: true,
    confirmPassword: true,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const steps = [
  {
    title: "Company",
    eyebrow: "Step 1",
    description: "Add your organization details.",
  },
  {
    title: "Admin",
    eyebrow: "Step 2",
    description: "Create the first administrator.",
  },
  {
    title: "Security",
    eyebrow: "Step 3",
    description: "Set the password and confirm setup.",
  },
] as const;

type FormValues = z.infer<typeof bootstrapFieldsSchema>;
type FieldName = keyof FormValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const MAX_LOGO_BYTES = 1024 * 1024;

type LogoUploadResponse = { url: string } | { error: string };

function isLogoUploadResponse(value: unknown): value is LogoUploadResponse {
  if (!value || typeof value !== "object") return false;
  return (
    ("url" in value && typeof value.url === "string") ||
    ("error" in value && typeof value.error === "string")
  );
}

const initialValues: FormValues = {
  companyName: "",
  adminName: "",
  email: "",
  password: "",
  confirmPassword: "",
  companyLogoUrl: undefined,
};

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  const bootstrapAdmin = api.auth.bootstrapAdmin.useMutation({
    onSuccess: () => {
      setServerError("");
      toast.success("Workspace created. Sign in with your admin account.");
      router.push("/login");
    },
    onError: (error) => {
      setServerError(error.message);
      toast.error(error.message);
    },
  });

  function setField(field: FieldName, value: string | undefined) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function collectErrors(issues: z.ZodIssue[]) {
    const nextErrors: FieldErrors = {};
    issues.forEach((issue) => {
      const field = issue.path[0] as FieldName | undefined;
      if (field) nextErrors[field] = issue.message;
    });
    return nextErrors;
  }

  function validateStep(stepIndex: number) {
    if (stepIndex === 0) {
      if (logoUploading) {
        const message = "Please wait for the logo upload to finish";
        setServerError(message);
        toast.error(message);
        return false;
      }

      const result = bootstrapFieldsSchema
        .pick({ companyName: true, companyLogoUrl: true })
        .safeParse({
          companyName: values.companyName,
          companyLogoUrl: values.companyLogoUrl,
        });

      if (!result.success) {
        setErrors(collectErrors(result.error.issues));
        toast.error(
          result.error.issues[0]?.message ?? "Check the highlighted fields.",
        );
        return false;
      }
    }

    if (stepIndex === 1) {
      const result = bootstrapFieldsSchema
        .pick({ adminName: true, email: true })
        .safeParse({
          adminName: values.adminName,
          email: values.email,
        });

      if (!result.success) {
        setErrors(collectErrors(result.error.issues));
        toast.error(
          result.error.issues[0]?.message ?? "Check the highlighted fields.",
        );
        return false;
      }
    }

    if (stepIndex === 2) {
      const result = securityStepSchema.safeParse({
        password: values.password,
        confirmPassword: values.confirmPassword,
      });

      if (!result.success) {
        setErrors(collectErrors(result.error.issues));
        toast.error(
          result.error.issues[0]?.message ?? "Check the highlighted fields.",
        );
        return false;
      }
    }

    setErrors({});
    setServerError("");
    return true;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function handleBack() {
    setErrors({});
    setServerError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      setField("companyLogoUrl", undefined);
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      const message = "Logo must be under 1MB";
      setErrors((prev) => ({
        ...prev,
        companyLogoUrl: message,
      }));
      setField("companyLogoUrl", undefined);
      toast.error(message);
      return;
    }

    setLogoUploading(true);
    setErrors((prev) => ({ ...prev, companyLogoUrl: undefined }));

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/upload/company-logo", {
        method: "POST",
        body: formData,
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          isLogoUploadResponse(payload) && "error" in payload
            ? payload.error
            : "Logo upload failed";
        throw new Error(message);
      }

      if (!isLogoUploadResponse(payload) || !("url" in payload)) {
        throw new Error("Logo upload failed");
      }

      setField("companyLogoUrl", payload.url);
      toast.success("Company logo uploaded.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Logo upload failed";
      setField("companyLogoUrl", undefined);
      setErrors((prev) => ({
        ...prev,
        companyLogoUrl: message,
      }));
      toast.error(message);
    } finally {
      setLogoUploading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");

    if (logoUploading) {
      const message = "Please wait for the logo upload to finish";
      setServerError(message);
      toast.error(message);
      return;
    }

    const result = bootstrapSchema.safeParse(values);

    if (!result.success) {
      setErrors(collectErrors(result.error.issues));
      toast.error(
        result.error.issues[0]?.message ?? "Check the highlighted fields.",
      );
      const firstInvalidStep = result.error.issues.some((issue) =>
        ["companyName", "companyLogoUrl"].includes(String(issue.path[0])),
      )
        ? 0
        : result.error.issues.some((issue) =>
              ["adminName", "email"].includes(String(issue.path[0])),
            )
          ? 1
          : 2;
      setStep(firstInvalidStep);
      return;
    }

    setErrors({});
    bootstrapAdmin.mutate(result.data);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:m-16 sm:p-6">
      <div className="mb-5">
        <p className="text-xs font-semibold tracking-[0.18em] text-purple-700 uppercase">
          Company setup
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal text-gray-950">
          Create your admin workspace
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          A guided setup for your company profile, admin account, and secure
          password.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      {serverError && (
        <div className="mt-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5">
        <div className="min-h-57.5">
          {step === 0 && (
            <CompanyStep
              values={values}
              errors={errors}
              logoUploading={logoUploading}
              onFieldChange={setField}
              onLogoChange={handleLogoChange}
            />
          )}

          {step === 1 && (
            <AdminStep
              values={values}
              errors={errors}
              onFieldChange={setField}
            />
          )}

          {step === 2 && (
            <SecurityStep
              values={values}
              errors={errors}
              onFieldChange={setField}
            />
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0 || bootstrapAdmin.isPending}
            className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:ring-4 focus:ring-purple-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={logoUploading}
              className="h-11 rounded-lg bg-purple-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800 focus:ring-4 focus:ring-purple-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={bootstrapAdmin.isPending || logoUploading}
              className="h-11 rounded-lg bg-purple-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800 focus:ring-4 focus:ring-purple-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bootstrapAdmin.isPending ? "Creating..." : "Create workspace"}
            </button>
          )}
        </div>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-purple-700 hover:text-purple-800"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <ol className="grid grid-cols-3">
      {steps.map((stepItem, index) => {
        const isActive = index === currentStep;
        const isComplete = index < currentStep;

        return (
          <li
            key={stepItem.title}
            className="relative flex flex-col items-center"
          >
            {index > 0 && (
              <span
                className={`absolute top-5 right-1/2 h-0.5 w-full ${
                  isActive || isComplete ? "bg-purple-600" : "bg-gray-200"
                }`}
                aria-hidden="true"
              />
            )}
            <div className="relative z-10 flex flex-col items-center bg-white px-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm transition ${
                  isActive
                    ? "border-purple-700 bg-purple-700 text-white"
                    : isComplete
                      ? "border-purple-600 bg-purple-600 text-white"
                      : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <span
                className={`mt-3 text-base font-bold ${
                  isActive || isComplete ? "text-gray-950" : "text-gray-500"
                }`}
              >
                {stepItem.title}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CompanyStep({
  values,
  errors,
  logoUploading,
  onFieldChange,
  onLogoChange,
}: {
  values: FormValues;
  errors: FieldErrors;
  logoUploading: boolean;
  onFieldChange: (field: FieldName, value: string | undefined) => void;
  onLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <StepShell
      eyebrow="Company profile"
      title="Start with your organization"
      description="This becomes the first company workspace in EMPAY."
    >
      <Field
        label="Company name"
        id="companyName"
        value={values.companyName}
        error={errors.companyName}
        placeholder="Odoo India"
        onChange={(value) => onFieldChange("companyName", value)}
      />

      <div>
        <label
          htmlFor="companyLogo"
          className="block text-sm font-semibold text-gray-800"
        >
          Company logo
        </label>
        <input
          id="companyLogo"
          name="companyLogo"
          type="file"
          accept="image/*"
          onChange={onLogoChange}
          className={`mt-2 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition outline-none file:mr-3 file:rounded-md file:border-0 file:bg-purple-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-purple-700 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 ${
            errors.companyLogoUrl
              ? "border-red-400 bg-red-50"
              : "border-gray-300"
          }`}
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional. PNG or JPG, up to 1MB.
        </p>
        {logoUploading && (
          <p className="mt-1 text-xs text-gray-500">Uploading logo...</p>
        )}
        {values.companyLogoUrl && !logoUploading && (
          <p className="mt-1 text-xs text-emerald-600">Logo uploaded.</p>
        )}
        {errors.companyLogoUrl && (
          <p className="mt-1 text-xs text-red-600">{errors.companyLogoUrl}</p>
        )}
      </div>
    </StepShell>
  );
}

function AdminStep({
  values,
  errors,
  onFieldChange,
}: {
  values: FormValues;
  errors: FieldErrors;
  onFieldChange: (field: FieldName, value: string | undefined) => void;
}) {
  return (
    <StepShell
      eyebrow="Admin access"
      title="Create the first admin"
      description="This account can manage employees, settings, roles, and setup."
    >
      <Field
        label="Admin name"
        id="adminName"
        value={values.adminName}
        error={errors.adminName}
        placeholder="Sahil Kale"
        onChange={(value) => onFieldChange("adminName", value)}
      />
      <Field
        label="Work email"
        id="email"
        type="email"
        value={values.email}
        error={errors.email}
        placeholder="admin@company.com"
        onChange={(value) => onFieldChange("email", value)}
      />
    </StepShell>
  );
}

function SecurityStep({
  values,
  errors,
  onFieldChange,
}: {
  values: FormValues;
  errors: FieldErrors;
  onFieldChange: (field: FieldName, value: string | undefined) => void;
}) {
  return (
    <StepShell
      eyebrow="Security"
      title="Protect the workspace"
      description="Use a strong password for the primary admin account."
    >
      <Field
        label="Password"
        id="password"
        type="password"
        value={values.password}
        error={errors.password}
        placeholder="Minimum 8 characters"
        onChange={(value) => onFieldChange("password", value)}
      />
      <Field
        label="Confirm password"
        id="confirmPassword"
        type="password"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        placeholder="Re-enter password"
        onChange={(value) => onFieldChange("confirmPassword", value)}
      />

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-500 uppercase">
          Review
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Company</dt>
            <dd className="truncate font-semibold text-gray-900">
              {values.companyName || "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Admin</dt>
            <dd className="truncate font-semibold text-gray-900">
              {values.adminName || "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Email</dt>
            <dd className="truncate font-semibold text-gray-900">
              {values.email || "-"}
            </dd>
          </div>
        </dl>
      </div>
    </StepShell>
  );
}

function StepShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-xs font-semibold tracking-[0.18em] text-purple-700 uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-lg font-bold text-gray-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  type = "text",
  value,
  placeholder,
  error,
  onChange,
}: {
  id: FieldName;
  label: string;
  type?: string;
  value: string | undefined;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-800">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 block h-11 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 shadow-sm transition outline-none placeholder:text-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 ${
          error ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
