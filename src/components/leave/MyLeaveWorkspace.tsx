"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconCalendarPlus,
  IconClipboardCheck,
  IconSettings,
  IconUsersGroup,
  IconWallet,
  type TablerIcon,
} from "@tabler/icons-react";

import { type Role } from "../../../generated/prisma";
import { useToast } from "~/components/ui/Toaster";
import { api, type RouterOutputs } from "~/trpc/react";

type Balance = RouterOutputs["leave"]["getBalance"][number];
type Application = RouterOutputs["leave"]["getMyApplications"][number];
type Approval = RouterOutputs["leave"]["getPendingApprovals"][number];

const cardAnimation =
  "dash-fade-up opacity-0 motion-reduce:opacity-100 motion-reduce:animate-none";

const statusStyles: Record<string, string> = {
  PENDING: "bg-violet-50 text-violet-700 ring-violet-100",
  APPROVED: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-100",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
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
  pendingApprovals: initialPendingApprovals,
  pendingApprovalCount,
  leaveTypeCount,
  employeeCount,
}: {
  balances: Balance[];
  applications: Application[];
  role: Role;
  canManage: boolean;
  canApprove: boolean;
  hasPersonalLeaveProfile: boolean;
  pendingApprovals: Approval[];
  pendingApprovalCount: number;
  leaveTypeCount: number;
  employeeCount: number;
}) {
  const utils = api.useUtils();
  const toast = useToast();
  const [cancelError, setCancelError] = useState("");
  const [approvalError, setApprovalError] = useState("");
  const [rejecting, setRejecting] = useState<Approval | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: applications = initialApplications } =
    api.leave.getMyApplications.useQuery(undefined, {
      enabled: hasPersonalLeaveProfile,
      initialData: initialApplications,
    });
  const { data: pendingApprovals = initialPendingApprovals } =
    api.leave.getPendingApprovals.useQuery(undefined, {
      enabled: canApprove,
      initialData: initialPendingApprovals,
    });

  const cancel = api.leave.cancel.useMutation({
    onSuccess: () => {
      setCancelError("");
      toast.success("Leave application cancelled.");
      void utils.leave.getMyApplications.invalidate();
      void utils.leave.getBalance.invalidate();
    },
    onError: (error) => {
      setCancelError(error.message);
      toast.error(error.message);
    },
  });

  function invalidateApprovals() {
    void utils.leave.getPendingApprovals.invalidate();
    void utils.leave.getAllApprovals.invalidate();
  }

  const approve = api.leave.approve.useMutation({
    onSuccess: () => {
      setApprovalError("");
      toast.success("Leave request approved.");
      invalidateApprovals();
    },
    onError: (error) => {
      setApprovalError(error.message);
      toast.error(error.message);
    },
  });

  const reject = api.leave.reject.useMutation({
    onSuccess: () => {
      setRejecting(null);
      setRejectionReason("");
      setApprovalError("");
      toast.success("Leave request rejected.");
      invalidateApprovals();
    },
    onError: (error) => {
      setApprovalError(error.message);
      toast.error(error.message);
    },
  });

  const totalAllocated = balances.reduce(
    (sum, balance) => sum + Number(balance.totalDays),
    0,
  );
  const totalRemaining = balances.reduce(
    (sum, balance) => sum + Number(balance.remainingDays),
    0,
  );
  const pendingMine = applications.filter(
    (application) => application.status === "PENDING",
  ).length;
  const recentApplications = applications.slice(0, 5);

  return (
    <div className="relative rounded-4xl bg-white p-6 font-sans shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
      <div className="relative space-y-8">
        <header
          className={`${cardAnimation} flex flex-wrap items-start justify-between gap-4`}
          style={{ animationDelay: "40ms" }}
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.32em] text-slate-500 uppercase">
              Leave
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Leave workspace
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {role === "ADMIN"
                ? "Manage leave setup and approval workflows."
                : "View balances, apply for time off, and track requests."}
            </p>
          </div>
          {hasPersonalLeaveProfile && (
            <Link
              href="/dashboard/leave/apply"
              className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700"
            >
              <IconCalendarPlus size={16} stroke={2} aria-hidden="true" />
              Apply leave
            </Link>
          )}
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {hasPersonalLeaveProfile && (
            <ActionCard
              icon={IconCalendarPlus}
              title="Apply for leave"
              detail={
                balances.length > 0
                  ? `${formatDays(totalRemaining)} days available`
                  : "No allocation yet"
              }
              href="/dashboard/leave/apply"
              cta="Open request form"
              delay="80ms"
              primary
            />
          )}
          {canManage && (
            <ActionCard
              icon={IconSettings}
              title="Manage setup"
              detail={`${leaveTypeCount} leave type${
                leaveTypeCount !== 1 ? "s" : ""
              } · ${employeeCount} employee${employeeCount !== 1 ? "s" : ""}`}
              href="/dashboard/leave/manage"
              cta="Configure policies"
              delay={hasPersonalLeaveProfile ? "120ms" : "80ms"}
            />
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={IconWallet}
            label="Balance left"
            value={hasPersonalLeaveProfile ? formatDays(totalRemaining) : "-"}
            detail={
              hasPersonalLeaveProfile
                ? `${formatDays(totalAllocated)} allocated`
                : "Admin profile"
            }
            delay="200ms"
          />
          <MetricCard
            icon={IconCalendarPlus}
            label="My pending"
            value={hasPersonalLeaveProfile ? String(pendingMine) : "-"}
            detail="Awaiting decision"
            delay="240ms"
          />
          <MetricCard
            icon={IconClipboardCheck}
            label="Approvals"
            value={canApprove ? String(pendingApprovalCount) : "-"}
            detail={canApprove ? "Pending review" : "No approval access"}
            delay="280ms"
          />
          <MetricCard
            icon={IconUsersGroup}
            label="Employees"
            value={canManage ? String(employeeCount) : "-"}
            detail={canManage ? "Allocation scope" : "Managed by HR"}
            delay="320ms"
          />
        </section>

        {hasPersonalLeaveProfile ? (
          <>
            <section
              className={`${cardAnimation} rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70`}
              style={{ animationDelay: "360ms" }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-sm font-medium text-slate-900">
                    Leave balances
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Quotas available for the current year.
                  </p>
                </div>
                <Link
                  href="/dashboard/leave/apply"
                  className="text-xs font-semibold text-slate-400 transition hover:text-slate-700"
                >
                  Apply now
                </Link>
              </div>

              {balances.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {balances.map((balance) => {
                    const remaining =
                      balance.totalDays > 0
                        ? (balance.remainingDays / balance.totalDays) * 100
                        : 0;

                    return (
                      <div
                        key={balance.leaveTypeId}
                        className="rounded-2xl bg-linear-to-br from-white via-white to-violet-50/70 p-4 shadow-sm ring-1 ring-slate-200/70"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {balance.leaveTypeName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {balance.isPaid ? "Paid" : "Unpaid"} leave
                            </p>
                          </div>
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-violet-700 ring-1 ring-violet-100">
                            {formatDays(balance.remainingDays)} left
                          </span>
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-violet-600"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, remaining),
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {formatDays(balance.usedDays)} used of{" "}
                          {formatDays(balance.totalDays)} days
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl bg-violet-50 p-4 text-sm text-violet-700 ring-1 ring-violet-100">
                  No leave has been allocated to your profile yet. HR can
                  allocate quota from Leave Manage.
                </div>
              )}
            </section>

            {cancelError && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                {cancelError}
              </div>
            )}

            <section
              className={`${cardAnimation} overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70`}
              style={{ animationDelay: "400ms" }}
            >
              <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-sm font-medium text-slate-900">
                      Recent applications
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Latest leave requests from your profile.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70">
                    {applications.length} total
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-white text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Dates</th>
                      <th className="px-5 py-3">Days</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {recentApplications.map((application) => (
                      <tr key={application.id}>
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {application.leaveType.name}
                          <p className="mt-1 text-xs font-normal text-slate-500">
                            {application.reason}
                          </p>
                          {application.rejectionReason && (
                            <p className="mt-1 text-xs text-rose-600">
                              {application.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {formatDate(application.fromDate)} -{" "}
                          {formatDate(application.toDate)}
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {formatDays(application.totalDays)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ${
                              statusStyles[application.status] ??
                              "bg-slate-100 text-slate-600 ring-slate-200"
                            }`}
                          >
                            {application.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {["PENDING", "APPROVED"].includes(
                            application.status,
                          ) ? (
                            <button
                              type="button"
                              disabled={cancel.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Cancel this leave application?",
                                  )
                                ) {
                                  cancel.mutate({
                                    applicationId: application.id,
                                  });
                                }
                              }}
                              className="text-sm font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {recentApplications.length === 0 && (
                      <tr>
                        <td
                          className="px-5 py-10 text-center text-slate-500"
                          colSpan={5}
                        >
                          No leave applications yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section
            className={`${cardAnimation} rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200/70`}
            style={{ animationDelay: "360ms" }}
          >
            Admin accounts do not have personal leave balances. Use the cards
            above to create leave types, allocate quotas, and review requests.
          </section>
        )}

        {canApprove && (
          <section
            className={`${cardAnimation} overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70`}
            style={{
              animationDelay: hasPersonalLeaveProfile ? "440ms" : "400ms",
            }}
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-sm font-medium text-slate-900">
                    Pending approvals
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review and decide leave requests without leaving this page.
                  </p>
                </div>
                <Link
                  href="/dashboard/leave/approvals"
                  className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70 transition hover:bg-slate-50"
                >
                  Full history
                </Link>
              </div>
            </div>

            {approvalError && (
              <div className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                {approvalError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-white text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Leave</th>
                    <th className="px-5 py-3">Dates</th>
                    <th className="px-5 py-3">Days</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pendingApprovals.map((application) => (
                    <tr key={application.id} className="align-top">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">
                          {application.employee.firstName}{" "}
                          {application.employee.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {application.employee.employeeCode} -{" "}
                          {application.employee.department.name}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">
                          {application.leaveType.name}
                        </p>
                        <p className="mt-1 max-w-xs text-xs text-slate-500">
                          {application.reason}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {formatDate(application.fromDate)} -{" "}
                        {formatDate(application.toDate)}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {formatDays(application.totalDays)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={approve.isPending}
                            onClick={() =>
                              approve.mutate({ applicationId: application.id })
                            }
                            className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={reject.isPending}
                            onClick={() => setRejecting(application)}
                            className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingApprovals.length === 0 && (
                    <tr>
                      <td
                        className="px-5 py-10 text-center text-slate-500"
                        colSpan={5}
                      >
                        No pending leave approvals.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {rejecting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Reject request
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {rejecting.employee.firstName} {rejecting.employee.lastName} -{" "}
                {rejecting.leaveType.name}
              </p>
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                rows={4}
                placeholder="Reason for rejection"
                className="mt-4 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejecting(null);
                    setRejectionReason("");
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    reject.isPending || rejectionReason.trim().length < 5
                  }
                  onClick={() =>
                    reject.mutate({
                      applicationId: rejecting.id,
                      reason: rejectionReason,
                    })
                  }
                  className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {reject.isPending ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  detail,
  href,
  cta,
  delay,
  primary = false,
}: {
  icon: TablerIcon;
  title: string;
  detail: string;
  href: string;
  cta: string;
  delay: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${cardAnimation} group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${
            primary
              ? "bg-violet-600 text-white ring-violet-600"
              : "bg-violet-50 text-violet-700 ring-violet-100"
          }`}
        >
          <Icon size={19} stroke={1.9} aria-hidden="true" />
        </span>
        <span className="text-xs font-semibold text-slate-400 transition group-hover:text-slate-700">
          Open
        </span>
      </div>
      <h2 className="font-display mt-4 text-lg font-semibold text-slate-900">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
      <p className="mt-4 text-xs font-semibold text-violet-700">{cta}</p>
    </Link>
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
