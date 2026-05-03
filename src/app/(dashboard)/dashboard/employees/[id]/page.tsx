"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconArrowLeft,
  IconBriefcase,
  IconCalendar,
  IconCircleCheck,
  IconCircleX,
  IconId,
  IconLock,
  IconUserCircle,
  IconWallet,
} from "@tabler/icons-react";

import { useToast } from "~/components/ui/Toaster";
import { api } from "~/trpc/react";

function getRoleRank(role: string) {
  switch (role) {
    case "ADMIN":
      return 3;
    case "HR_OFFICER":
    case "PAYROLL_OFFICER":
      return 2;
    case "EMPLOYEE":
      return 1;
    default:
      return 0;
  }
}

function formatRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value: unknown) {
  return Number(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const employeeId = params.id as string;
  const utils = api.useUtils();
  const toast = useToast();

  const { data: employee, isLoading } = api.employee.getById.useQuery({
    id: employeeId,
  });
  const { data: me, isLoading: meLoading } = api.auth.me.useQuery();

  const viewerRank = me ? getRoleRank(me.role) : 0;
  const targetRank = employee ? getRoleRank(employee.user.role) : 0;
  const isAdmin = me?.role === "ADMIN";
  const isHrOfficer = me?.role === "HR_OFFICER";
  const isPayrollOfficer = me?.role === "PAYROLL_OFFICER";
  const isSelf = me?.employee?.id === employeeId;

  const hasProfileEditCapability = isAdmin || isHrOfficer;
  const hasSalaryEditCapability = isAdmin || isPayrollOfficer;
  const passesRankCheck = isAdmin || viewerRank > targetRank;

  const isTargetHigherOrEqual = !isAdmin && viewerRank <= targetRank && !isSelf;
  const canEditProfile =
    hasProfileEditCapability && (passesRankCheck || isSelf);
  const canEditSalary = hasSalaryEditCapability && passesRankCheck;

  const departmentsQuery = api.settings.listDepartments.useQuery(undefined, {
    enabled: canEditProfile,
  });
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    string | undefined
  >(undefined);
  const designationsQuery = api.settings.listDesignations.useQuery(
    selectedDepartmentId ? { departmentId: selectedDepartmentId } : undefined,
    { enabled: canEditProfile && !!selectedDepartmentId },
  );
  const componentsQuery = api.payroll.listComponents.useQuery(undefined, {
    enabled: canEditSalary,
  });

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
      toast.success("Employee profile saved.");
      setTimeout(() => setProfileSuccess(""), 3000);
    },
    onError: (error) => {
      setProfileError(error.message);
      toast.error(error.message);
    },
  });

  const setSalaryStructure = api.payroll.setSalaryStructure.useMutation({
    onSuccess: async () => {
      await utils.employee.getById.invalidate({ id: employeeId });
      setSalaryError("");
      setSalarySuccess("Salary saved successfully!");
      toast.success("Salary saved successfully.");
      setTimeout(() => setSalarySuccess(""), 3000);
    },
    onError: (error) => {
      setSalaryError(error.message);
      toast.error(error.message);
    },
  });

  const assignComponent = api.payroll.assignComponent.useMutation({
    onSuccess: async () => {
      await utils.employee.getById.invalidate({ id: employeeId });
      setComponentError("");
      setComponentSuccess("Component assigned!");
      toast.success("Salary component assigned.");
      setTimeout(() => setComponentSuccess(""), 3000);
      setComponentForm({
        salaryComponentId: "",
        amount: "",
        effectiveFrom: "",
      });
    },
    onError: (error) => {
      setComponentError(error.message);
      toast.error(error.message);
    },
  });

  if (isLoading || meLoading) {
    return (
      <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
        <div className="space-y-6">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-100">
            <IconUserCircle size={28} stroke={1.7} aria-hidden="true" />
          </span>
          <h1 className="font-display mt-4 text-xl font-semibold text-slate-900">
            Employee not found
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            The profile may have been removed or you may not have access.
          </p>
          <Link
            href="/dashboard/employees"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <IconArrowLeft size={16} stroke={2} aria-hidden="true" />
            Back to employees
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const status = getAccountStatus(employee.user);
  const StatusIcon = status.icon;
  const totalComponents = employee.employeeSalaryComponents.length;
  const activeComponents = employee.employeeSalaryComponents.filter(
    (component) => component.isActive,
  ).length;

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
      const message = "Please enter valid salary details";
      setSalaryError(message);
      toast.error(message);
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
      const message = "Please select a component and amount";
      setComponentError(message);
      toast.error(message);
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
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="relative space-y-8">
        <header
          className="dash-fade-up opacity-0 motion-reduce:animate-none motion-reduce:opacity-100"
          style={{ animationDelay: "40ms" }}
        >
          <Link
            href="/dashboard/employees"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
          >
            <IconArrowLeft size={16} stroke={2} aria-hidden="true" />
            Employees
          </Link>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-xl font-semibold text-violet-700 shadow-sm ring-1 ring-violet-100">
                {initials || <IconUserCircle size={36} stroke={1.6} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
                  Employee profile
                </p>
                <h1 className="font-display mt-2 truncate text-3xl font-semibold text-slate-900 sm:text-4xl">
                  {fullName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span>{employee.designation.name}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{employee.department.name}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isTargetHigherOrEqual && (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                  <IconLock size={15} stroke={2} aria-hidden="true" />
                  View only
                </span>
              )}
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${status.badgeClass}`}
              >
                <StatusIcon size={15} stroke={2} aria-hidden="true" />
                {status.label}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            icon={IconId}
            label="Employee code"
            value={employee.employeeCode}
            detail={employee.user.loginId ?? "No login ID"}
            delay="80ms"
          />
          <InfoCard
            icon={IconBriefcase}
            label="Role"
            value={formatRole(employee.user.role)}
            detail={employee.department.name}
            delay="120ms"
          />
          <InfoCard
            icon={IconCalendar}
            label="Joining date"
            value={formatDate(employee.dateOfJoining)}
            detail={employee.gender.toLowerCase()}
            delay="160ms"
          />
          <InfoCard
            icon={IconWallet}
            label="Compensation"
            value={
              employee.salaryStructure
                ? formatMoney(employee.salaryStructure.basicSalary)
                : "Not set"
            }
            detail={`${activeComponents}/${totalComponents} active components`}
            delay="200ms"
          />
        </section>

        <section
          className="dash-fade-up rounded-2xl bg-white p-5 opacity-0 shadow-sm ring-1 ring-slate-200/70 motion-reduce:animate-none motion-reduce:opacity-100 sm:p-6"
          style={{ animationDelay: "240ms" }}
        >
          <PanelHeader
            title="Profile"
            helper={
              canEditProfile
                ? "Update employee details."
                : "Profile details are read-only for your role."
            }
          />

          {profileError && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700 ring-1 ring-violet-100">
              {profileSuccess}
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
                  className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
                >
                  {updateEmployee.isPending ? "Saving..." : "Save changes"}
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section
            className="dash-fade-up rounded-2xl bg-white p-5 opacity-0 shadow-sm ring-1 ring-slate-200/70 motion-reduce:animate-none motion-reduce:opacity-100 sm:p-6"
            style={{ animationDelay: "280ms" }}
          >
            <PanelHeader
              title="Salary structure"
              helper={
                canEditSalary
                  ? "Set basic salary and HRA for this employee."
                  : "Compensation details are read-only for your role."
              }
            />

            {salaryError && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                {salaryError}
              </div>
            )}
            {salarySuccess && (
              <div className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700 ring-1 ring-violet-100">
                {salarySuccess}
              </div>
            )}

            <form onSubmit={handleSalarySubmit} className="mt-4 grid gap-4">
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

              <div>
                {!canEditSalary ? null : (
                  <button
                    type="submit"
                    disabled={setSalaryStructure.isPending}
                    className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
                  >
                    {setSalaryStructure.isPending ? "Saving..." : "Save salary"}
                  </button>
                )}
              </div>
            </form>
          </section>

          <section
            className="dash-fade-up rounded-2xl bg-white p-5 opacity-0 shadow-sm ring-1 ring-slate-200/70 motion-reduce:animate-none motion-reduce:opacity-100 sm:p-6"
            style={{ animationDelay: "320ms" }}
          >
            <PanelHeader
              title="Additional components"
              helper="Assign earning or deduction components."
            />

            {componentError && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                {componentError}
              </div>
            )}
            {componentSuccess && (
              <div className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700 ring-1 ring-violet-100">
                {componentSuccess}
              </div>
            )}

            <form onSubmit={handleComponentSubmit} className="mt-4 grid gap-4">
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
                  setComponentForm((prev) => ({
                    ...prev,
                    effectiveFrom: value,
                  }))
                }
                disabled={!canEditSalary}
              />

              <div>
                {!canEditSalary ? null : (
                  <button
                    type="submit"
                    disabled={assignComponent.isPending}
                    className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
                  >
                    {assignComponent.isPending
                      ? "Assigning..."
                      : "Assign component"}
                  </button>
                )}
              </div>
            </form>
          </section>
        </section>

        <section
          className="dash-fade-up overflow-hidden rounded-2xl bg-white opacity-0 shadow-sm ring-1 ring-slate-200/70 motion-reduce:animate-none motion-reduce:opacity-100"
          style={{ animationDelay: "360ms" }}
        >
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
            <PanelHeader
              title="Assigned components"
              helper={`${totalComponents} component${
                totalComponents !== 1 ? "s" : ""
              } on this profile`}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-white text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Component</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {employee.employeeSalaryComponents.map((component) => (
                  <tr key={component.id} className="align-top">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {component.salaryComponent.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {component.salaryComponent.type}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-700">
                      {formatMoney(component.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          component.isActive
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {component.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {employee.employeeSalaryComponents.length === 0 && (
                  <tr>
                    <td
                      className="px-5 py-10 text-center text-slate-500"
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
    </div>
  );
}

function getAccountStatus(user: {
  isActive: boolean;
  mustChangePassword: boolean;
}) {
  if (!user.isActive) {
    return {
      label: "Inactive",
      badgeClass: "bg-slate-100 text-slate-600",
      icon: IconCircleX,
    };
  }

  if (user.mustChangePassword) {
    return {
      label: "First login pending",
      badgeClass: "bg-violet-50 text-violet-700",
      icon: IconLock,
    };
  }

  return {
    label: "Active",
    badgeClass: "bg-indigo-50 text-indigo-700",
    icon: IconCircleCheck,
  };
}

function PanelHeader({ title, helper }: { title: string; helper: string }) {
  return (
    <div>
      <h2 className="font-display text-sm font-medium text-slate-900">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  detail,
  delay,
}: {
  icon: typeof IconId;
  label: string;
  value: string;
  detail: string;
  delay: string;
}) {
  return (
    <div
      className="dash-fade-up rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-4 opacity-0 shadow-sm ring-1 ring-slate-200/70 transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md motion-reduce:animate-none motion-reduce:opacity-100"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-100">
          <Icon size={19} stroke={1.9} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            {label}
          </p>
          <p className="font-display mt-1 truncate text-xl font-semibold text-slate-900">
            {value}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
        </div>
      </div>
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
      <label className="block text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-1 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-500"
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
      <label className="block text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-1 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-500"
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
