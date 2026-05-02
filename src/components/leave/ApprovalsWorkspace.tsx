"use client";

import { useState } from "react";

import { api, type RouterOutputs } from "~/trpc/react";

type Application = RouterOutputs["leave"]["getAllApprovals"][number];

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

export function ApprovalsWorkspace({
  pending: initialPending,
  all: initialAll,
}: {
  pending: Application[];
  all: Application[];
}) {
  const utils = api.useUtils();
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [actionError, setActionError] = useState("");
  const [rejecting, setRejecting] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pending = initialPending } =
    api.leave.getPendingApprovals.useQuery(undefined, {
      initialData: initialPending,
    });
  const { data: all = initialAll } = api.leave.getAllApprovals.useQuery(
    undefined,
    { initialData: initialAll },
  );

  function invalidateApprovals() {
    void utils.leave.getPendingApprovals.invalidate();
    void utils.leave.getAllApprovals.invalidate();
  }

  const approve = api.leave.approve.useMutation({
    onSuccess: () => {
      setActionError("");
      invalidateApprovals();
    },
    onError: (error) => setActionError(error.message),
  });

  const reject = api.leave.reject.useMutation({
    onSuccess: () => {
      setRejecting(null);
      setRejectionReason("");
      setActionError("");
      invalidateApprovals();
    },
    onError: (error) => setActionError(error.message),
  });

  const rows = tab === "pending" ? pending : all;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave approvals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review employee leave requests and keep attendance in sync.
        </p>
      </div>

      <div className="mt-6 flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
            tab === "pending"
              ? "bg-white text-purple-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Pending ({pending.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
            tab === "all"
              ? "bg-white text-purple-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          All requests
        </button>
      </div>

      {actionError && (
        <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Leave</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((application) => (
              <tr key={application.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">
                    {application.employee.firstName}{" "}
                    {application.employee.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {application.employee.employeeCode} -{" "}
                    {application.employee.department.name}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">
                    {application.leaveType.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDays(application.totalDays)} days
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {application.reason}
                  </p>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatDate(application.fromDate)} -{" "}
                  {formatDate(application.toDate)}
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
                  {application.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={approve.isPending}
                        onClick={() =>
                          approve.mutate({ applicationId: application.id })
                        }
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={reject.isPending}
                        onClick={() => setRejecting(application)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                  No leave requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Reject request
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {rejecting.employee.firstName} {rejecting.employee.lastName} -{" "}
              {rejecting.leaveType.name}
            </p>
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={4}
              placeholder="Reason for rejection"
              className="mt-4 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejecting(null);
                  setRejectionReason("");
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reject.isPending || rejectionReason.trim().length < 5}
                onClick={() =>
                  reject.mutate({
                    applicationId: rejecting.id,
                    reason: rejectionReason,
                  })
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {reject.isPending ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
