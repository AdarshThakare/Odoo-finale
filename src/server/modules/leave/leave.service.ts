import { TRPCError } from "@trpc/server";
import { Prisma } from "../../../../generated/prisma";
import { type PrismaClient } from "../../../../generated/prisma";
import {
  getAllLeaveTypes,
  createLeaveType,
  getLeaveAllocationsByEmployee,
  getLeaveAllocation,
  upsertLeaveAllocation,
  incrementUsedDays,
  getLeaveLedgerBalance,
  createLeaveLedgerEntry,
  getLeaveApplicationsByEmployee,
  getPendingApplicationsByCompany,
  getAllApplicationsByCompany,
  getLeaveApplicationById,
  createLeaveApplication,
  updateLeaveApplicationStatus,
  upsertAttendanceOnLeave,
} from "~/server/repositories/leave.repo";
import {
  calculateLeaveDays,
  enumerateWorkdays,
  startOfUtcDay,
} from "./leave.utils";
import { getEmployeeByUserId, getUserCompany } from "~/server/repositories/employee.repo";

async function requireEmployee(db: PrismaClient, userId: string) {
  const employee = await getEmployeeByUserId(db, userId);
  if (!employee) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Employee profile not found" });
  }
  return employee;
}

async function requireCompany(db: PrismaClient, userId: string) {
  const scope = await getUserCompany(db, userId);
  if (!scope?.companyId || !scope.company) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Company setup is required" });
  }
  return scope;
}

// ─── Leave Types ──────────────────────────────────────────────────────────────

export async function listLeaveTypes(db: PrismaClient) {
  return getAllLeaveTypes(db);
}

export async function addLeaveType(
  db: PrismaClient,
  data: { name: string; maxDaysPerYear: number; isPaid: boolean; carryForward: boolean },
) {
  const existing = await db.leaveType.findUnique({ where: { name: data.name } });
  if (existing) {
    throw new TRPCError({ code: "CONFLICT", message: "Leave type already exists" });
  }
  return createLeaveType(db, data);
}

// ─── Allocations ─────────────────────────────────────────────────────────────

export async function allocateLeave(
  db: PrismaClient,
  userId: string,
  input: { employeeId: string; leaveTypeId: string; year: number; totalDays: number },
) {
  const scope = await requireCompany(db, userId);

  const employee = await db.employee.findFirst({
    where: { id: input.employeeId, companyId: scope.companyId },
  });
  if (!employee) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Employee not found" });
  }

  const leaveType = await db.leaveType.findUnique({ where: { id: input.leaveTypeId } });
  if (!leaveType) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Leave type not found" });
  }

  const existing = await getLeaveAllocation(db, input.employeeId, input.leaveTypeId, input.year);

  const allocation = await upsertLeaveAllocation(
    db,
    input.employeeId,
    input.leaveTypeId,
    input.year,
    input.totalDays,
  );

  const yearStart = new Date(Date.UTC(input.year, 0, 1));
  const yearEnd = new Date(Date.UTC(input.year, 11, 31));

  const delta = existing ? input.totalDays - existing.totalDays : input.totalDays;
  if (delta !== 0) {
    await createLeaveLedgerEntry(db, {
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      transactionType: "ALLOCATION",
      leaves: new Prisma.Decimal(delta),
      fromDate: yearStart,
      toDate: yearEnd,
    });
  }

  return allocation;
}

// ─── Balance ──────────────────────────────────────────────────────────────────

export async function getLeaveBalances(db: PrismaClient, userId: string) {
  const employee = await requireEmployee(db, userId);
  const year = new Date().getUTCFullYear();
  const allocations = await getLeaveAllocationsByEmployee(db, employee.id, year);

  return Promise.all(
    allocations.map(async (alloc) => {
      const balance = await getLeaveLedgerBalance(db, employee.id, alloc.leaveTypeId, year);
      return {
        leaveTypeId: alloc.leaveTypeId,
        leaveTypeName: alloc.leaveType.name,
        isPaid: alloc.leaveType.isPaid,
        totalDays: alloc.totalDays,
        remainingDays: Math.max(0, balance),
        usedDays: alloc.totalDays - Math.max(0, balance),
      };
    }),
  );
}

// ─── Applications ─────────────────────────────────────────────────────────────

export async function applyForLeave(
  db: PrismaClient,
  userId: string,
  input: {
    leaveTypeId: string;
    fromDate: string;
    toDate: string;
    isHalfDay: boolean;
    halfDayDate?: string;
    reason: string;
  },
) {
  const employee = await requireEmployee(db, userId);
  const year = new Date().getUTCFullYear();

  const from = startOfUtcDay(new Date(`${input.fromDate}T00:00:00Z`));
  const to = startOfUtcDay(new Date(`${input.toDate}T00:00:00Z`));

  if (from > to) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Start date must be before end date" });
  }

  const totalDays = calculateLeaveDays(from, to, input.isHalfDay);
  if (totalDays === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No working days in the selected range" });
  }

  // Check balance
  const balance = await getLeaveLedgerBalance(db, employee.id, input.leaveTypeId, year);
  if (balance < totalDays) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Insufficient leave balance. Available: ${balance}, Requested: ${totalDays}`,
    });
  }

  return createLeaveApplication(db, {
    employeeId: employee.id,
    leaveTypeId: input.leaveTypeId,
    fromDate: from,
    toDate: to,
    totalDays: new Prisma.Decimal(totalDays),
    isHalfDay: input.isHalfDay,
    halfDayDate: input.halfDayDate
      ? startOfUtcDay(new Date(`${input.halfDayDate}T00:00:00Z`))
      : undefined,
    reason: input.reason,
  });
}

export async function getMyLeaveApplications(db: PrismaClient, userId: string) {
  const employee = await requireEmployee(db, userId);
  return getLeaveApplicationsByEmployee(db, employee.id);
}

export async function getPendingApprovals(db: PrismaClient, userId: string) {
  const scope = await requireCompany(db, userId);
  return getPendingApplicationsByCompany(db, scope.companyId);
}

export async function getAllApprovals(db: PrismaClient, userId: string) {
  const scope = await requireCompany(db, userId);
  return getAllApplicationsByCompany(db, scope.companyId);
}

export async function approveLeaveApplication(
  db: PrismaClient,
  userId: string,
  applicationId: string,
) {
  const application = await getLeaveApplicationById(db, applicationId);
  if (!application) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Leave application not found" });
  }
  if (application.status !== "PENDING") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending applications can be approved" });
  }

  const year = application.fromDate.getUTCFullYear();

  await db.$transaction(async (tx) => {
    await updateLeaveApplicationStatus(tx as unknown as PrismaClient, applicationId, "APPROVED", userId);

    await createLeaveLedgerEntry(tx as unknown as PrismaClient, {
      employeeId: application.employeeId,
      leaveTypeId: application.leaveTypeId,
      leaveApplicationId: applicationId,
      transactionType: "USAGE",
      leaves: new Prisma.Decimal(-Number(application.totalDays)),
      fromDate: application.fromDate,
      toDate: application.toDate,
    });

    await incrementUsedDays(
      tx as unknown as PrismaClient,
      application.employeeId,
      application.leaveTypeId,
      year,
      application.totalDays,
    );

    const workdays = enumerateWorkdays(application.fromDate, application.toDate);
    await Promise.all(
      workdays.map((date) =>
        upsertAttendanceOnLeave(tx as unknown as PrismaClient, application.employeeId, date),
      ),
    );
  });

  return { success: true };
}

export async function rejectLeaveApplication(
  db: PrismaClient,
  userId: string,
  applicationId: string,
  reason: string,
) {
  const application = await getLeaveApplicationById(db, applicationId);
  if (!application) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Leave application not found" });
  }
  if (application.status !== "PENDING") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending applications can be rejected" });
  }

  await updateLeaveApplicationStatus(db, applicationId, "REJECTED", userId, reason);
  return { success: true };
}

export async function cancelLeaveApplication(
  db: PrismaClient,
  userId: string,
  applicationId: string,
) {
  const application = await getLeaveApplicationById(db, applicationId);
  if (!application) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Leave application not found" });
  }
  if (application.employee.user.id !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You can only cancel your own leave" });
  }
  if (application.status !== "PENDING") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending applications can be cancelled" });
  }

  await updateLeaveApplicationStatus(db, applicationId, "CANCELLED");
  return { success: true };
}
