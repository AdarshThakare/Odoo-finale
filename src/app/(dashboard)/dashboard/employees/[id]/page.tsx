"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "~/trpc/react";

function getRoleRank(role: string) {
  switch (role) {
    case "ADMIN": return 3;
    case "HR_OFFICER":
    case "PAYROLL_OFFICER": return 2;
    case "EMPLOYEE": return 1;
    default: return 0;
  }
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const employeeId = params.id as string;
  const utils = api.useUtils();

  const { data: employee, isLoading } = api.employee.getById.useQuery({
    id: employeeId,
  });
  const { data: me, isLoading: meLoading } = api.auth.me.useQuery();

  const departmentsQuery = api.settings.listDepartments.useQuery();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    string | undefined
  >(undefined);
  const designationsQuery = api.settings.listDesignations.useQuery(
    selectedDepartmentId ? { departmentId: selectedDepartmentId } : undefined,
    { enabled: !!selectedDepartmentId },
  );
  const componentsQuery = api.payroll.listComponents.useQuery();

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    gender: "MALE",
    departmentId: "",
    designationId: "",
  });

  const [salaryForm, setSalaryForm] = useState({
    basicSalary: "",
    hra: "",
    effectiveFrom: "",
  });

  const [componentForm, setComponentForm] = useState({
    salaryComponentId: "",
    amount: "",
    effectiveFrom: "",
  });

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [salaryError, setSalaryError] = useState("");
  const [salarySuccess, setSalarySuccess] = useState("");
  const [componentError, setComponentError] = useState("");
  const [componentSuccess, setComponentSuccess] = useState("");

  useEffect(() => {
    if (!employee) return;

    setProfileForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone ?? "",
      gender: employee.gender,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
    });
    setSelectedDepartmentId(employee.departmentId);

    if (employee.salaryStructure) {
      const effective = new Date(employee.salaryStructure.effectiveFrom);
      setSalaryForm({
        basicSalary: String(employee.salaryStructure.basicSalary),
        hra: String(employee.salaryStructure.hra),
        effectiveFrom: effective.toISOString().slice(0, 10),
      });
    }
  }, [employee]);

  const updateEmployee = api.employee.update.useMutation({
    onSuccess: async () => {
      await utils.employee.getById.invalidate({ id: employeeId });
      setProfileError("");
      setProfileSuccess("Profile saved successfully!");
      setTimeout(() => setProfileSuccess(""), 3000);
    },
    onError: (error) => setProfileError(error.message),
  });

  const setSalaryStructure = api.payroll.setSalaryStructure.useMutation({
    onSuccess: async () => {
      await utils.employee.getById.invalidate({ id: employeeId });
      setSalaryError("");
      setSalarySuccess("Salary saved successfully!");
      setTimeout(() => setSalarySuccess(""), 3000);
    },
    onError: (error) => setSalaryError(error.message),
  });

  const assignComponent = api.payroll.assignComponent.useMutation({
    onSuccess: async () => {
      await utils.employee.getById.invalidate({ id: employeeId });
      setComponentError("");
      setComponentSuccess("Component assigned!");
      setTimeout(() => setComponentSuccess(""), 3000);
      setComponentForm({ salaryComponentId: "", amount: "", effectiveFrom: "" });
    },
    onError: (error) => setComponentError(error.message),
  });

  const viewerRank = me ? getRoleRank(me.role) : 0;
  const targetRank = employee ? getRoleRank(employee.user.role) : 0;
  const isAdmin = me?.role === "ADMIN";
  const isSelf = me?.employee?.id === employeeId;

  const isTargetHigherOrEqual = !isAdmin && viewerRank <= targetRank && !isSelf;
  const canEditProfile = isAdmin || viewerRank > targetRank || isSelf;
  const canEditSalary = isAdmin || viewerRank > targetRank;

  if (isLoading || meLoading) {
    return <div className="text-sm text-gray-600">Loading employee...</div>;
  }

  if (!employee) {
    return <div className="text-sm text-gray-600">Employee not found.</div>;
  }

  function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError("");

    updateEmployee.mutate({
      id: employeeId,
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      phone: profileForm.phone || undefined,
      gender: profileForm.gender as "MALE" | "FEMALE" | "OTHER",
      departmentId: profileForm.departmentId,
      designationId: profileForm.designationId,
    });
  }

  function handleSalarySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalaryError("");

    const basicSalary = Number(salaryForm.basicSalary);
    const hra = Number(salaryForm.hra);

    if (
      !salaryForm.effectiveFrom ||
      Number.isNaN(basicSalary) ||
      Number.isNaN(hra)
    ) {
      setSalaryError("Please enter valid salary details");
      return;
    }

    setSalaryStructure.mutate({
      employeeId,
      basicSalary,
      hra,
      effectiveFrom: salaryForm.effectiveFrom,
    });
  }

  function handleComponentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setComponentError("");

    const amount = Number(componentForm.amount);
    if (!componentForm.salaryComponentId || Number.isNaN(amount)) {
      setComponentError("Please select a component and amount");
      return;
    }

    assignComponent.mutate({
      employeeId,
      salaryComponentId: componentForm.salaryComponentId,
      amount,
      effectiveFrom: componentForm.effectiveFrom || new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/employees"
          className="text-sm font-medium text-purple-700 hover:underline"
        >
          Back to employees
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h1>
          {isTargetHigherOrEqual && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
              View only
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Login ID: {employee.user.loginId}
        </p>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        <p className="text-sm text-gray-500">Update employee details.</p>

        {profileError && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {profileError}
          </div>
        )}
        {profileSuccess && (
          <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            ✓ {profileSuccess}
          </div>
        )}

        <form
          onSubmit={handleProfileSubmit}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <Field
            label="First name"
            value={profileForm.firstName}
            onChange={(value) =>
              setProfileForm((prev) => ({ ...prev, firstName: value }))
            }
            disabled={!canEditProfile}
          />
          <Field
            label="Last name"
            value={profileForm.lastName}
            onChange={(value) =>
              setProfileForm((prev) => ({ ...prev, lastName: value }))
            }
            disabled={!canEditProfile}
          />
          <Field
            label="Phone"
            value={profileForm.phone}
            onChange={(value) =>
              setProfileForm((prev) => ({ ...prev, phone: value }))
            }
            disabled={!canEditProfile}
          />
          <Select
            label="Gender"
            value={profileForm.gender}
            onChange={(value) =>
              setProfileForm((prev) => ({ ...prev, gender: value }))
            }
            disabled={!canEditProfile}
            options={[
              { value: "MALE", label: "Male" },
              { value: "FEMALE", label: "Female" },
              { value: "OTHER", label: "Other" },
            ]}
          />
          <Select
            label="Department"
            value={profileForm.departmentId}
            onChange={(value) => {
              setProfileForm((prev) => ({
                ...prev,
                departmentId: value,
                designationId: "",
              }));
              setSelectedDepartmentId(value || undefined);
            }}
            disabled={!canEditProfile}
            options={(departmentsQuery.data ?? []).map((department) => ({
              value: department.id,
              label: department.name,
            }))}
          />
          <Select
            label="Designation"
            value={profileForm.designationId}
            onChange={(value) =>
              setProfileForm((prev) => ({ ...prev, designationId: value }))
            }
            disabled={!canEditProfile}
            options={(designationsQuery.data ?? []).map((designation) => ({
              value: designation.id,
              label: designation.name,
            }))}
          />

          <div className="md:col-span-2">
            {!canEditProfile ? null : (
              <button
                type="submit"
                disabled={updateEmployee.isPending}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
              >
                {updateEmployee.isPending ? "Saving..." : "Save changes"}
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Salary structure
        </h2>
        <p className="text-sm text-gray-500">
          Set basic salary and HRA for this employee.
        </p>

        {salaryError && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {salaryError}
          </div>
        )}
        {salarySuccess && (
          <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            ✓ {salarySuccess}
          </div>
        )}

        <form
          onSubmit={handleSalarySubmit}
          className="mt-4 grid gap-4 md:grid-cols-3"
        >
          <Field
            label="Basic salary"
            type="number"
            value={salaryForm.basicSalary}
            onChange={(value) =>
              setSalaryForm((prev) => ({ ...prev, basicSalary: value }))
            }
            disabled={!canEditSalary}
          />
          <Field
            label="HRA"
            type="number"
            value={salaryForm.hra}
            onChange={(value) =>
              setSalaryForm((prev) => ({ ...prev, hra: value }))
            }
            disabled={!canEditSalary}
          />
          <Field
            label="Effective from"
            type="date"
            value={salaryForm.effectiveFrom}
            onChange={(value) =>
              setSalaryForm((prev) => ({ ...prev, effectiveFrom: value }))
            }
            disabled={!canEditSalary}
          />

          <div className="md:col-span-3">
            {!canEditSalary ? null : (
              <button
                type="submit"
                disabled={setSalaryStructure.isPending}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
              >
                {setSalaryStructure.isPending ? "Saving..." : "Save salary"}
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Additional components
        </h2>
        <p className="text-sm text-gray-500">
          Assign earning or deduction components.
        </p>

        {componentError && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {componentError}
          </div>
        )}
        {componentSuccess && (
          <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            ✓ {componentSuccess}
          </div>
        )}

        <form
          onSubmit={handleComponentSubmit}
          className="mt-4 grid gap-4 md:grid-cols-3"
        >
          <Select
            label="Component"
            value={componentForm.salaryComponentId}
            onChange={(value) =>
              setComponentForm((prev) => ({
                ...prev,
                salaryComponentId: value,
              }))
            }
            disabled={!canEditSalary}
            options={(componentsQuery.data ?? [])
              .filter((component) => component.isActive)
              .map((component) => ({
                value: component.id,
                label: `${component.name} (${component.type})`,
              }))}
          />
          <Field
            label="Amount"
            type="number"
            value={componentForm.amount}
            onChange={(value) =>
              setComponentForm((prev) => ({ ...prev, amount: value }))
            }
            disabled={!canEditSalary}
          />
          <Field
            label="Effective from"
            type="date"
            value={componentForm.effectiveFrom}
            onChange={(value) =>
              setComponentForm((prev) => ({ ...prev, effectiveFrom: value }))
            }
            disabled={!canEditSalary}
          />

          <div className="md:col-span-3">
            {!canEditSalary ? null : (
              <button
                type="submit"
                disabled={assignComponent.isPending}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
              >
                {assignComponent.isPending ? "Assigning..." : "Assign component"}
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2">Component</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employee.employeeSalaryComponents.map((component) => (
                <tr key={component.id}>
                  <td className="px-3 py-2 text-gray-900">
                    {component.salaryComponent.name}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {component.salaryComponent.type}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {component.amount.toString()}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {component.isActive ? "Active" : "Inactive"}
                  </td>
                </tr>
              ))}
              {employee.employeeSalaryComponents.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-4 text-center text-gray-500"
                    colSpan={4}
                  >
                    No components assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
