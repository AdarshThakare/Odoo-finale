import { type PrismaClient, type Prisma } from "../../../generated/prisma";

// ─── Leave Types ──────────────────────────────────────────────────────────────

export async function getAllLeaveTypes(db: PrismaClient) {
  return db.leaveType.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      maxDaysPerYear: true,
      isPaid: true,
      carryForward: true,
      createdAt: true,
    },
  });
}

export async function getLeaveTypeById(db: PrismaClient, id: string) {
  return db.leaveType.findUnique({ where: { id } });
}

export async function createLeaveType(
  db: PrismaClient,
  data: { name: string; maxDaysPerYear: number; isPaid: boolean; carryForward: boolean },
) {
  return db.leaveType.create({ data });
}

// ─── Leave Allocations ────────────────────────────────────────────────────────

export async function getLeaveAllocationsByEmployee(
  db: PrismaClient,
  employeeId: string,
  year: number,
) {
  return db.leaveAllocation.findMany({
    where: { employeeId, year },
    include: { leaveType: { select: { id: true, name: true, isPaid: true } } },
  });
}

export async function getLeaveAllocation(
  db: PrismaClient,
  employeeId: string,
  leaveTypeId: string,
  year: number,
) {
  return db.leaveAllocation.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
  });
}

export async function upsertLeaveAllocation(
  db: PrismaClient,
  employeeId: string,
  leaveTypeId: string,
  year: number,
  totalDays: number,
) {
  return db.leaveAllocation.upsert({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    update: { totalDays },
    create: { employeeId, leaveTypeId, year, totalDays },
  });
}

export async function incrementUsedDays(
  db: PrismaClient,
  employeeId: string,
  leaveTypeId: string,
  year: number,
  delta: Prisma.Decimal,
) {
  return db.leaveAllocation.update({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    data: { usedDays: { increment: delta } },
  });
}

// ─── Leave Ledger ─────────────────────────────────────────────────────────────

export async function getLeaveLedgerBalance(
  db: PrismaClient,
  employeeId: string,
  leaveTypeId: string,
  year: number,
) {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
  const result = await db.leaveLedgerEntry.aggregate({
    where: {
      employeeId,
      leaveTypeId,
      createdAt: { gte: yearStart, lt: yearEnd },
    },
    _sum: { leaves: true },
  });
  return Number(result._sum.leaves ?? 0);
}

export async function createLeaveLedgerEntry(
  db: PrismaClient,
  data: {
    employeeId: string;
    leaveTypeId: string;
    leaveApplicationId?: string;
    transactionType: "ALLOCATION" | "USAGE" | "CANCELLATION";
    leaves: Prisma.Decimal;
    fromDate: Date;
    toDate: Date;
  },
) {
  return db.leaveLedgerEntry.create({ data });
}

// ─── Leave Applications ───────────────────────────────────────────────────────

export async function getLeaveApplicationsByEmployee(
  db: PrismaClient,
  employeeId: string,
) {
  return db.leaveApplication.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
    include: { leaveType: { select: { id: true, name: true } } },
  });
}

export async function getPendingApplicationsByCompany(
  db: PrismaClient,
  companyId: string,
) {
  return db.leaveApplication.findMany({
    where: {
      status: "PENDING",
      employee: { companyId },
    },
    orderBy: { createdAt: "asc" },
    include: {
      leaveType: { select: { id: true, name: true } },
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
        },
      },
    },
  });
}

export async function getAllApplicationsByCompany(
  db: PrismaClient,
  companyId: string,
) {
  return db.leaveApplication.findMany({
    where: { employee: { companyId } },
    orderBy: { createdAt: "desc" },
    include: {
      leaveType: { select: { id: true, name: true } },
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
        },
      },
    },
  });
}

export async function getLeaveApplicationById(db: PrismaClient, id: string) {
  return db.leaveApplication.findUnique({
    where: { id },
    include: {
      leaveType: true,
      employee: { include: { user: { select: { id: true } } } },
    },
  });
}

export async function createLeaveApplication(
  db: PrismaClient,
  data: {
    employeeId: string;
    leaveTypeId: string;
    fromDate: Date;
    toDate: Date;
    totalDays: Prisma.Decimal;
    isHalfDay: boolean;
    halfDayDate?: Date;
    reason: string;
  },
) {
  return db.leaveApplication.create({ data, select: { id: true, status: true } });
}

export async function updateLeaveApplicationStatus(
  db: PrismaClient,
  id: string,
  status: "APPROVED" | "REJECTED" | "CANCELLED",
  approverId?: string,
  rejectionReason?: string,
) {
  return db.leaveApplication.update({
    where: { id },
    data: {
      status,
      approvedById: approverId,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
      rejectionReason,
    },
  });
}

// ─── Attendance sync ──────────────────────────────────────────────────────────

export async function upsertAttendanceOnLeave(
  db: PrismaClient,
  employeeId: string,
  date: Date,
) {
  return db.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId, date } },
    update: { status: "ON_LEAVE" },
    create: { employeeId, date, status: "ON_LEAVE" },
  });
}
