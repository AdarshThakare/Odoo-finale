"use client";

import Link from "next/link";
import { useState } from "react";

import { type Role } from "../../../generated/prisma";
import { api, type RouterOutputs } from "~/trpc/react";

type Balance = RouterOutputs["leave"]["getBalance"][number];
type Application = RouterOutputs["leave"]["getMyApplications"][number];

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDays(value: unknown) {
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

export function MyLeaveWorkspace({
  balances,
  applications: initialApplications,
  role,
  canManage,
  canApprove,
  hasPersonalLeaveProfile,
}: {
  balances: Balance[];
  applications: Application[];
  role: Role;
  canManage: boolean;
  canApprove: boolean;
  hasPersonalLeaveProfile: boolean;
}) {
  const utils = api.useUtils();
  const [cancelError, setCancelError] = useState("");

  const { data: applications = initialApplications } =
    api.leave.getMyApplications.useQuery(undefined, {
      enabled: hasPersonalLeaveProfile,
      initialData: initialApplications,
    });

  const cancel = api.leave.cancel.useMutation({
    onSuccess: () => {
      setCancelError("");
      void utils.leave.getMyApplications.invalidate();
      void utils.leave.getBalance.invalidate();
    },
    onError: (error) => setCancelError(error.message),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave</h1>
          <p className="mt-1 text-sm text-gray-500">
            {role === "ADMIN"
              ? "Manage leave setup and approval workflows."
              : "View balances, apply for time off, and track requests."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Link
              href="/dashboard/leave/manage"
              className="rounded-lg border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-50"
            >
              Manage
            </Link>
          )}
          {canApprove && (
            <Link
              href="/dashboard/leave/approvals"
              className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
            >
              Approvals
            </Link>
          )}
          {hasPersonalLeaveProfile && (
            <Link
              href="/dashboard/leave/apply"
              className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800"
            >
              Apply
            </Link>
          )}
        </div>
      </div>

      {!hasPersonalLeaveProfile && (
        <div className="mt-6 rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">
          Admin accounts do not have personal leave balances. Use Manage to
          create leave types and allocate quotas, or Approvals to review leave
          requests.
        </div>
      )}

      {hasPersonalLeaveProfile && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((balance) => {
              const remaining =
                balance.totalDays > 0
                  ? (balance.remainingDays / balance.totalDays) * 100
                  : 0;

              return (
                <div
                  key={balance.leaveTypeId}
                  className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {balance.leaveTypeName}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {balance.isPaid ? "Paid" : "Unpaid"} leave
                      </p>
                    </div>
                    <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">
                      {formatDays(balance.remainingDays)} left
                    </span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-purple-600"
                      style={{ width: `${Math.max(0, Math.min(100, remaining))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {formatDays(balance.usedDays)} used of{" "}
                    {formatDays(balance.totalDays)} days
                  </p>
                </div>
              );
            })}
          </div>

          {balances.length === 0 && (
            <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
              No leave has been allocated to your profile yet. HR can allocate
              quota from Leave Manage.
            </div>
          )}

          {cancelError && (
            <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {cancelError}
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">My applications</h2>
            </div>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {application.leaveType.name}
                      <p className="mt-1 text-xs font-normal text-gray-500">
                        {application.reason}
                      </p>
                      {application.rejectionReason && (
                        <p className="mt-1 text-xs text-red-600">
                          {application.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(application.fromDate)} -{" "}
                      {formatDate(application.toDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDays(application.totalDays)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          statusStyles[application.status] ??
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {application.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {["PENDING", "APPROVED"].includes(
                        application.status,
                      ) ? (
                        <button
                          type="button"
                          disabled={cancel.isPending}
                          onClick={() =>
                            cancel.mutate({ applicationId: application.id })
                          }
                          className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                      No leave applications yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
