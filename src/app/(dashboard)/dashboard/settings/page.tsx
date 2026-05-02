"use client";

import { useState } from "react";

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

export default function SettingsPage() {
  const utils = api.useUtils();
  const [departmentName, setDepartmentName] = useState("");
  const [designationName, setDesignationName] = useState("");
  const [designationDepartmentId, setDesignationDepartmentId] =
    useState("");
  const [componentName, setComponentName] = useState("");
  const [componentType, setComponentType] = useState<
    "EARNING" | "DEDUCTION"
  >("EARNING");
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage departments, designations, and salary components.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isAdmin && (
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                User Settings
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                View all company users and assign access roles.
              </p>
            </div>
            <div className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
              Admin only
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      User name
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Login ID
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {usersQuery.data?.map((user) => {
                    const isCurrentUser = user.id === currentUserQuery.data?.id;
                    const pendingRole =
                      updateUserRole.variables?.userId === user.id
                        ? updateUserRole.variables.role
                        : user.role;
                    const displayName =
                      user.employee
                        ? `${user.employee.firstName} ${user.employee.lastName}`
                        : user.name;

                    return (
                      <tr key={user.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">
                            {displayName}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {user.employee?.department?.name ??
                              "No department"}
                            {" · "}
                            {user.employee?.designation?.name ??
                              "No designation"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700">
                          {user.loginId}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">
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
                              className="min-w-44 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                              aria-label={`Change role for ${displayName}`}
                            >
                              {roleOptions.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                            {isCurrentUser ? (
                              <span className="text-xs text-gray-500">
                                Current user
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">
                                {roleLabels[user.role]}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {usersQuery.isLoading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        Loading users...
                      </td>
                    </tr>
                  )}

                  {usersQuery.data?.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Departments</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!departmentName.trim()) return;
            createDepartment.mutate({ name: departmentName.trim() });
          }}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={departmentName}
            onChange={(event) => setDepartmentName(event.target.value)}
            placeholder="Add new department"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
          <button
            type="submit"
            disabled={createDepartment.isPending}
            className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
          >
            {createDepartment.isPending ? "Adding..." : "Add"}
          </button>
        </form>

        <ul className="mt-4 space-y-2 text-sm">
          {departmentsQuery.data?.map((department) => (
            <li
              key={department.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
            >
              <div>
                <p className="font-medium text-gray-900">{department.name}</p>
                <p className="text-xs text-gray-500">
                  {department._count.employees} employees · {department._count.designations} designations
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRenameDepartment(department.id, department.name)}
                  className="text-xs font-semibold text-purple-700"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => deleteDepartment.mutate({ id: department.id })}
                  className="text-xs font-semibold text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {departmentsQuery.data?.length === 0 && (
            <li className="text-gray-500">No departments yet.</li>
          )}
        </ul>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Designations</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!designationName.trim() || !designationDepartmentId) return;
            createDesignation.mutate({
              name: designationName.trim(),
              departmentId: designationDepartmentId,
            });
          }}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr,1fr,auto]"
        >
          <input
            value={designationName}
            onChange={(event) => setDesignationName(event.target.value)}
            placeholder="Add new designation"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
          <select
            value={designationDepartmentId}
            onChange={(event) => setDesignationDepartmentId(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Select department</option>
            {departmentsQuery.data?.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createDesignation.isPending}
            className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
          >
            {createDesignation.isPending ? "Adding..." : "Add"}
          </button>
        </form>

        <ul className="mt-4 space-y-2 text-sm">
          {designationsQuery.data?.map((designation) => (
            <li
              key={designation.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
            >
              <div>
                <p className="font-medium text-gray-900">{designation.name}</p>
                <p className="text-xs text-gray-500">
                  {designation.department.name} · {designation._count.employees} employees
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRenameDesignation(designation.id, designation.name)}
                  className="text-xs font-semibold text-purple-700"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => deleteDesignation.mutate({ id: designation.id })}
                  className="text-xs font-semibold text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {designationsQuery.data?.length === 0 && (
            <li className="text-gray-500">No designations yet.</li>
          )}
        </ul>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Salary components</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!componentName.trim()) return;
            createComponent.mutate({
              name: componentName.trim(),
              type: componentType,
            });
          }}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr,1fr,auto]"
        >
          <input
            value={componentName}
            onChange={(event) => setComponentName(event.target.value)}
            placeholder="Add new component"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
          <select
            value={componentType}
            onChange={(event) =>
              setComponentType(event.target.value as "EARNING" | "DEDUCTION")
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="EARNING">Earning</option>
            <option value="DEDUCTION">Deduction</option>
          </select>
          <button
            type="submit"
            disabled={createComponent.isPending}
            className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
          >
            {createComponent.isPending ? "Adding..." : "Add"}
          </button>
        </form>

        <ul className="mt-4 space-y-2 text-sm">
          {componentsQuery.data?.map((component) => (
            <li
              key={component.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
            >
              <div>
                <p className="font-medium text-gray-900">{component.name}</p>
                <p className="text-xs text-gray-500">
                  {component.type} · {component.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRenameComponent(component.id, component.name)}
                  className="text-xs font-semibold text-purple-700"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateComponent.mutate({
                      id: component.id,
                      isActive: !component.isActive,
                    })
                  }
                  className="text-xs font-semibold text-gray-600"
                >
                  {component.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </li>
          ))}
          {componentsQuery.data?.length === 0 && (
            <li className="text-gray-500">No components yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
