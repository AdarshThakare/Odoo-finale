"use client";

import { useState } from "react";
import {
  IconBuilding,
  IconBriefcase,
  IconUsersGroup,
  IconWallet,
  type TablerIcon,
} from "@tabler/icons-react";

import { api } from "~/trpc/react";

const roleOptions = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "HR_OFFICER", label: "HR Officer" },
  { value: "PAYROLL_OFFICER", label: "Payroll Officer" },
  { value: "ADMIN", label: "Admin" },
] as const;

type Role = (typeof roleOptions)[number]["value"];

const roleLabels = Object.fromEntries(
  roleOptions.map((role) => [role.value, role.label]),
) as Record<Role, string>;

const cardAnimation =
  "dash-fade-up opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none";

export default function SettingsPage() {
  const utils = api.useUtils();
  const [departmentName, setDepartmentName] = useState("");
  const [designationName, setDesignationName] = useState("");
  const [designationDepartmentId, setDesignationDepartmentId] = useState("");
  const [componentName, setComponentName] = useState("");
  const [componentType, setComponentType] = useState<"EARNING" | "DEDUCTION">(
    "EARNING",
  );
  const [error, setError] = useState("");

  const currentUserQuery = api.auth.me.useQuery();
  const isAdmin = currentUserQuery.data?.role === "ADMIN";
  const usersQuery = api.settings.listUsers.useQuery(undefined, {
    enabled: isAdmin,
  });
  const departmentsQuery = api.settings.listDepartments.useQuery();
  const designationsQuery = api.settings.listDesignations.useQuery();
  const componentsQuery = api.payroll.listComponents.useQuery();

  const updateUserRole = api.settings.updateUserRole.useMutation({
    onSuccess: async () => {
      await usersQuery.refetch();
      await utils.settings.listUsers.invalidate();
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const createDepartment = api.settings.createDepartment.useMutation({
    onSuccess: async () => {
      setDepartmentName("");
      await utils.settings.listDepartments.invalidate();
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const updateDepartment = api.settings.updateDepartment.useMutation({
    onSuccess: async () => {
      await utils.settings.listDepartments.invalidate();
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const deleteDepartment = api.settings.deleteDepartment.useMutation({
    onSuccess: async () => {
      await utils.settings.listDepartments.invalidate();
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const createDesignation = api.settings.createDesignation.useMutation({
    onSuccess: async () => {
      setDesignationName("");
      await utils.settings.listDesignations.invalidate();
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const updateDesignation = api.settings.updateDesignation.useMutation({
    onSuccess: async () => {
      await utils.settings.listDesignations.invalidate();
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const deleteDesignation = api.settings.deleteDesignation.useMutation({
    onSuccess: async () => {
      await utils.settings.listDesignations.invalidate();
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const createComponent = api.payroll.createComponent.useMutation({
    onSuccess: async () => {
      setComponentName("");
      await utils.payroll.listComponents.invalidate();
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const updateComponent = api.payroll.updateComponent.useMutation({
    onSuccess: async () => {
      await utils.payroll.listComponents.invalidate();
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  function handleRenameDepartment(id: string, currentName: string) {
    const nextName = window.prompt("Rename department", currentName);
    if (!nextName || nextName.trim().length < 2) return;
    updateDepartment.mutate({ id, name: nextName.trim() });
  }

  function handleRenameDesignation(id: string, currentName: string) {
    const nextName = window.prompt("Rename designation", currentName);
    if (!nextName || nextName.trim().length < 2) return;
    updateDesignation.mutate({ id, name: nextName.trim() });
  }

  function handleRenameComponent(id: string, currentName: string) {
    const nextName = window.prompt("Rename component", currentName);
    if (!nextName || nextName.trim().length < 2) return;
    updateComponent.mutate({ id, name: nextName.trim() });
  }

  function handleRoleChange(userId: string, role: Role) {
    updateUserRole.mutate({ userId, role });
  }

  const departments = departmentsQuery.data ?? [];
  const designations = designationsQuery.data ?? [];
  const components = componentsQuery.data ?? [];
  const users = usersQuery.data ?? [];

  return (
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="relative space-y-8">
        <header
          className={`${cardAnimation} flex flex-wrap items-start justify-between gap-4`}
          style={{ animationDelay: "40ms" }}
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
              Settings
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Company settings
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage departments, designations, user access, and salary
              components.
            </p>
          </div>
          {isAdmin && (
            <span className="rounded-full bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
              Admin controls enabled
            </span>
          )}
        </header>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={IconUsersGroup}
            label="Users"
            value={isAdmin ? String(users.length) : "-"}
            detail={isAdmin ? "Company accounts" : "Admin only"}
            delay="80ms"
          />
          <MetricCard
            icon={IconBuilding}
            label="Departments"
            value={String(departments.length)}
            detail="Org structure"
            delay="120ms"
          />
          <MetricCard
            icon={IconBriefcase}
            label="Designations"
            value={String(designations.length)}
            detail="Role titles"
            delay="160ms"
          />
          <MetricCard
            icon={IconWallet}
            label="Components"
            value={String(components.length)}
            detail="Payroll rules"
            delay="200ms"
          />
        </section>

        {isAdmin && (
          <Panel
            title="User settings"
            helper="View all company users and assign access roles."
            badge="Admin only"
            delay="240ms"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-white text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">User name</th>
                    <th className="px-5 py-3">Login ID</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {users.map((user) => {
                    const isCurrentUser = user.id === currentUserQuery.data?.id;
                    const pendingRole =
                      updateUserRole.variables?.userId === user.id
                        ? updateUserRole.variables.role
                        : user.role;
                    const displayName = user.employee
                      ? `${user.employee.firstName} ${user.employee.lastName}`
                      : user.name;

                    return (
                      <tr key={user.id} className="align-top">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">
                            {displayName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {user.employee?.department?.name ?? "No department"}
                            {" · "}
                            {user.employee?.designation?.name ??
                              "No designation"}
                          </p>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-slate-700">
                          {user.loginId}
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {user.email}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            <select
                              value={pendingRole}
                              onChange={(event) =>
                                handleRoleChange(
                                  user.id,
                                  event.target.value as Role,
                                )
                              }
                              disabled={
                                isCurrentUser || updateUserRole.isPending
                              }
                              className="h-10 min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                              aria-label={`Change role for ${displayName}`}
                            >
                              {roleOptions.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                            <span className="text-xs text-slate-500">
                              {isCurrentUser
                                ? "Current user"
                                : roleLabels[user.role]}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {usersQuery.isLoading && (
                    <EmptyRow colSpan={4}>Loading users...</EmptyRow>
                  )}

                  {users.length === 0 && !usersQuery.isLoading && (
                    <EmptyRow colSpan={4}>No users found.</EmptyRow>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel
            title="Departments"
            helper="Create and organize top-level company teams."
            delay="280ms"
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!departmentName.trim()) return;
                createDepartment.mutate({ name: departmentName.trim() });
              }}
              className="mb-5 flex flex-col gap-3 sm:flex-row"
            >
              <TextInput
                value={departmentName}
                onChange={setDepartmentName}
                placeholder="Add new department"
              />
              <PrimaryButton disabled={createDepartment.isPending}>
                {createDepartment.isPending ? "Adding..." : "Add"}
              </PrimaryButton>
            </form>

            <List>
              {departments.map((department) => (
                <ListItem
                  key={department.id}
                  title={department.name}
                  detail={`${department._count.employees} employees · ${department._count.designations} designations`}
                  actions={
                    <>
                      <TextButton
                        onClick={() =>
                          handleRenameDepartment(department.id, department.name)
                        }
                      >
                        Rename
                      </TextButton>
                      <DangerButton
                        onClick={() =>
                          deleteDepartment.mutate({ id: department.id })
                        }
                      >
                        Delete
                      </DangerButton>
                    </>
                  }
                />
              ))}
              {departments.length === 0 && (
                <EmptyList>No departments yet.</EmptyList>
              )}
            </List>
          </Panel>

          <Panel
            title="Designations"
            helper="Create titles and attach them to departments."
            delay="320ms"
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!designationName.trim() || !designationDepartmentId) return;
                createDesignation.mutate({
                  name: designationName.trim(),
                  departmentId: designationDepartmentId,
                });
              }}
              className="mb-5 grid gap-3 sm:grid-cols-[1fr,1fr,auto]"
            >
              <TextInput
                value={designationName}
                onChange={setDesignationName}
                placeholder="Add new designation"
              />
              <select
                value={designationDepartmentId}
                onChange={(event) =>
                  setDesignationDepartmentId(event.target.value)
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <PrimaryButton disabled={createDesignation.isPending}>
                {createDesignation.isPending ? "Adding..." : "Add"}
              </PrimaryButton>
            </form>

            <List>
              {designations.map((designation) => (
                <ListItem
                  key={designation.id}
                  title={designation.name}
                  detail={`${designation.department.name} · ${designation._count.employees} employees`}
                  actions={
                    <>
                      <TextButton
                        onClick={() =>
                          handleRenameDesignation(
                            designation.id,
                            designation.name,
                          )
                        }
                      >
                        Rename
                      </TextButton>
                      <DangerButton
                        onClick={() =>
                          deleteDesignation.mutate({ id: designation.id })
                        }
                      >
                        Delete
                      </DangerButton>
                    </>
                  }
                />
              ))}
              {designations.length === 0 && (
                <EmptyList>No designations yet.</EmptyList>
              )}
            </List>
          </Panel>
        </section>

        <Panel
          title="Salary components"
          helper="Manage reusable earning and deduction components."
          delay="360ms"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!componentName.trim()) return;
              createComponent.mutate({
                name: componentName.trim(),
                type: componentType,
              });
            }}
            className="mb-5 grid gap-3 sm:grid-cols-[1fr,12rem,auto]"
          >
            <TextInput
              value={componentName}
              onChange={setComponentName}
              placeholder="Add new component"
            />
            <select
              value={componentType}
              onChange={(event) =>
                setComponentType(event.target.value as "EARNING" | "DEDUCTION")
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            >
              <option value="EARNING">Earning</option>
              <option value="DEDUCTION">Deduction</option>
            </select>
            <PrimaryButton disabled={createComponent.isPending}>
              {createComponent.isPending ? "Adding..." : "Add"}
            </PrimaryButton>
          </form>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {components.map((component) => (
              <div
                key={component.id}
                className="rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-4 shadow-sm ring-1 ring-slate-200/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {component.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {component.type} ·{" "}
                      {component.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      component.isActive
                        ? "bg-indigo-50 text-indigo-700 ring-indigo-100"
                        : "bg-slate-100 text-slate-600 ring-slate-200"
                    }`}
                  >
                    {component.isActive ? "Active" : "Off"}
                  </span>
                </div>
                <div className="mt-4 flex gap-3">
                  <TextButton
                    onClick={() =>
                      handleRenameComponent(component.id, component.name)
                    }
                  >
                    Rename
                  </TextButton>
                  <TextButton
                    onClick={() =>
                      updateComponent.mutate({
                        id: component.id,
                        isActive: !component.isActive,
                      })
                    }
                  >
                    {component.isActive ? "Deactivate" : "Activate"}
                  </TextButton>
                </div>
              </div>
            ))}
            {components.length === 0 && (
              <EmptyList>No components yet.</EmptyList>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  delay,
}: {
  icon: TablerIcon;
  label: string;
  value: string;
  detail: string;
  delay: string;
}) {
  return (
    <div
      className={`${cardAnimation} rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-4 shadow-sm ring-1 ring-slate-200/70`}
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
          <p className="font-display mt-1 text-2xl font-semibold text-slate-900">
            {value}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  helper,
  badge,
  delay,
  children,
}: {
  title: string;
  helper: string;
  badge?: string;
  delay: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`${cardAnimation} overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70`}
      style={{ animationDelay: delay }}
    >
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-medium text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{helper}</p>
          </div>
          {badge && (
            <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70">
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
    />
  );
}

function PrimaryButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="h-11 rounded-full bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2 text-sm">{children}</ul>;
}

function ListItem({
  title,
  detail,
  actions,
}: {
  title: string;
  detail: string;
  actions: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-3">
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      <div className="flex shrink-0 gap-2">{actions}</div>
    </li>
  );
}

function TextButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold text-violet-700 hover:text-violet-800"
    >
      {children}
    </button>
  );
}

function DangerButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold text-rose-600 hover:text-rose-700"
    >
      {children}
    </button>
  );
}

function EmptyList({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {children}
    </li>
  );
}

function EmptyRow({
  children,
  colSpan,
}: {
  children: React.ReactNode;
  colSpan: number;
}) {
  return (
    <tr>
      <td className="px-5 py-10 text-center text-slate-500" colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}
