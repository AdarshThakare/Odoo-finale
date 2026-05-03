"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";

import { useToast } from "~/components/ui/Toaster";
import { api } from "~/trpc/react";

const employeeSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  dateOfJoining: z.string().min(1, "Joining date is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  departmentId: z.string().min(1, "Department is required"),
  designationId: z.string().min(1, "Designation is required"),
  role: z.enum(["HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"]),
});

type FieldErrors = Partial<
  Record<keyof z.infer<typeof employeeSchema>, string>
>;

export default function NewEmployeePage() {
  const toast = useToast();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    string | undefined
  >(undefined);
  const [createdCredentials, setCreatedCredentials] = useState<{
    loginId: string;
    temporaryPassword: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);

  const createEmployee = api.employee.create.useMutation({
    onSuccess: (result) => {
      setCreatedCredentials({
        ...result.credentials,
        emailSent: result.email.sent,
        emailError: result.email.error,
      });
      setServerError("");
      toast.success("Employee account created.");
    },
    onError: (error) => {
      setServerError(error.message);
      toast.error(error.message);
    },
  });

  const departmentsQuery = api.settings.listDepartments.useQuery();
  const designationsQuery = api.settings.listDesignations.useQuery(
    selectedDepartmentId ? { departmentId: selectedDepartmentId } : undefined,
    { enabled: !!selectedDepartmentId },
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError("");
    setCreatedCredentials(null);

    const formData = new FormData(event.currentTarget);
    const phoneValue = formData.get("phone");
    const result = employeeSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone:
        typeof phoneValue === "string" && phoneValue.length > 0
          ? phoneValue
          : undefined,
      dateOfJoining: formData.get("dateOfJoining"),
      gender: formData.get("gender"),
      departmentId: formData.get("departmentId"),
      designationId: formData.get("designationId"),
      role: formData.get("role"),
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
    createEmployee.mutate(result.data);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard/employees"
          className="text-sm font-medium text-purple-700 hover:underline"
        >
          Back to employees
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          Create employee
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          The system will generate a Login ID and temporary password.
        </p>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {createdCredentials && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-semibold">Account created</p>
          <p className="mt-1">
            Login ID:{" "}
            <span className="font-mono">{createdCredentials.loginId}</span>
          </p>
          <p>
            Temporary password:{" "}
            <span className="font-mono">
              {createdCredentials.temporaryPassword}
            </span>
          </p>
          <p className="mt-2">
            Email:{" "}
            {createdCredentials.emailSent
              ? "Onboarding email sent"
              : `Not sent${createdCredentials.emailError ? ` - ${createdCredentials.emailError}` : ""}`}
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 md:grid-cols-2"
      >
        <Field label="First name" id="firstName" error={errors.firstName} />
        <Field label="Last name" id="lastName" error={errors.lastName} />
        <Field label="Email" id="email" type="email" error={errors.email} />
        <Field label="Phone" id="phone" error={errors.phone} />
        <Field
          label="Joining date"
          id="dateOfJoining"
          type="date"
          error={errors.dateOfJoining}
        />
        <Select label="Gender" id="gender" error={errors.gender}>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </Select>
        <Select
          label="Department"
          id="departmentId"
          error={errors.departmentId}
          onChange={(event) => {
            setSelectedDepartmentId(event.target.value || undefined);
          }}
        >
          <option value="">Select department</option>
          {departmentsQuery.data?.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Select>
        {departmentsQuery.data?.length === 0 && (
          <p className="text-xs text-gray-500 md:col-span-2">
            No departments found. Create them in Settings first.
          </p>
        )}
        <Select
          key={selectedDepartmentId ?? "designation"}
          label="Designation"
          id="designationId"
          error={errors.designationId}
          disabled={!selectedDepartmentId}
        >
          <option value="">Select designation</option>
          {designationsQuery.data?.map((designation) => (
            <option key={designation.id} value={designation.id}>
              {designation.name}
            </option>
          ))}
        </Select>
        <Select label="Role" id="role" error={errors.role}>
          <option value="EMPLOYEE">Employee</option>
          <option value="HR_OFFICER">HR Officer</option>
          <option value="PAYROLL_OFFICER">Payroll Officer</option>
        </Select>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={createEmployee.isPending}
            className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
          >
            {createEmployee.isPending ? "Creating..." : "Create employee"}
          </button>
        </div>
      </form>
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

function Select({
  id,
  label,
  error,
  children,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={id}
        name={id}
        onChange={onChange}
        disabled={disabled}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition outline-none focus:ring-2 focus:ring-purple-500 ${
          error ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
