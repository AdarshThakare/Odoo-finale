# Stage 3 — Leave Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full leave lifecycle — HR configures types & allocates quotas, employees apply, Payroll Officers approve/reject, ledger tracks all transactions, attendance records auto-sync on approval.

**Architecture:** Follows the same 3-layer pattern already in the codebase (tRPC router → service → repository). Company-scoped (all queries filter by `companyId`). Leave balance = SUM of `LeaveLedgerEntry.leaves` (ALLOCATION=+, USAGE=−, CANCELLATION=+). Approving a leave auto-creates `AttendanceRecord` rows with `status=ON_LEAVE` for each working day in range.

**Tech Stack:** tRPC v11, Prisma 7, PostgreSQL, Next.js 15 App Router, Zod, Tailwind CSS v4

**Spec:** `EMPAY.md` §5 (leave router), §6 Stage 3 checklist, §7 business rules #2, #3, #8

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/server/repositories/leave.repo.ts` | Create | All Prisma queries for leave domain |
| `src/server/modules/leave/leave.utils.ts` | Create | Pure date math (day counting, weekday enumeration) |
| `src/server/modules/leave/leave.service.ts` | Create | Business logic (balance, apply, approve, reject, cancel, allocate) |
| `src/server/api/routers/leave.ts` | Create | tRPC router — all 10 procedures |
| `src/server/api/root.ts` | Modify | Wire in `leaveRouter` |
| `src/app/(dashboard)/dashboard/leave/page.tsx` | Create | My leave page (role-aware: employee/HR/payroll views) |
| `src/app/(dashboard)/dashboard/leave/apply/page.tsx` | Create | Apply for leave form |
| `src/app/(dashboard)/dashboard/leave/approvals/page.tsx` | Create | Payroll Officer approval queue |
| `src/app/(dashboard)/dashboard/leave/manage/page.tsx` | Create | HR: leave types + employee allocations |

---

## Task 1: Leave Repository

**Files:**
- Create: `src/server/repositories/leave.repo.ts`

- [ ] **Step 1: Create `src/server/repositories/leave.repo.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/server/repositories/leave.repo.ts
git commit -m "feat(stage-3): leave repository"
```

---

## Task 2: Leave Utils & Service

**Files:**
- Create: `src/server/modules/leave/leave.utils.ts`
- Create: `src/server/modules/leave/leave.service.ts`

- [ ] **Step 1: Create `src/server/modules/leave/leave.utils.ts`**

```typescript
export function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function isWeekend(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Count working days (Mon–Fri) between fromDate and toDate inclusive.
 * Returns 0.5 for a half-day request.
 */
export function calculateLeaveDays(fromDate: Date, toDate: Date, isHalfDay: boolean): number {
  if (isHalfDay) return 0.5;

  let count = 0;
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    if (!isWeekend(cursor)) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/**
 * Return all working days (Mon–Fri) in [fromDate, toDate] inclusive.
 */
export function enumerateWorkdays(fromDate: Date, toDate: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    if (!isWeekend(cursor)) dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
```

- [ ] **Step 2: Create `src/server/modules/leave/leave.service.ts`**

```typescript
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

  // Create ledger entry for the allocation (or adjustment)
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
    // Update status
    await updateLeaveApplicationStatus(tx as PrismaClient, applicationId, "APPROVED", userId);

    // Debit ledger
    await createLeaveLedgerEntry(tx as PrismaClient, {
      employeeId: application.employeeId,
      leaveTypeId: application.leaveTypeId,
      leaveApplicationId: applicationId,
      transactionType: "USAGE",
      leaves: application.totalDays.negated(),
      fromDate: application.fromDate,
      toDate: application.toDate,
    });

    // Update usedDays on allocation
    await incrementUsedDays(
      tx as PrismaClient,
      application.employeeId,
      application.leaveTypeId,
      year,
      application.totalDays,
    );

    // Sync attendance records to ON_LEAVE for each workday
    const workdays = enumerateWorkdays(application.fromDate, application.toDate);
    await Promise.all(
      workdays.map((date) =>
        upsertAttendanceOnLeave(tx as PrismaClient, application.employeeId, date),
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
```

- [ ] **Step 3: Commit**

```bash
git add src/server/modules/leave/
git commit -m "feat(stage-3): leave utils and service"
```

---

## Task 3: Leave tRPC Router

**Files:**
- Create: `src/server/api/routers/leave.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create `src/server/api/routers/leave.ts`**

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, roleProcedure } from "~/server/api/trpc";
import {
  listLeaveTypes,
  addLeaveType,
  allocateLeave,
  getLeaveBalances,
  applyForLeave,
  getMyLeaveApplications,
  getPendingApprovals,
  getAllApprovals,
  approveLeaveApplication,
  rejectLeaveApplication,
  cancelLeaveApplication,
} from "~/server/modules/leave/leave.service";

const hrRoles = ["ADMIN", "HR_OFFICER"] as const;
const approverRoles = ["ADMIN", "PAYROLL_OFFICER"] as const;

export const leaveRouter = createTRPCRouter({
  listTypes: protectedProcedure.query(({ ctx }) => listLeaveTypes(ctx.db)),

  createType: roleProcedure([...hrRoles])
    .input(
      z.object({
        name: z.string().min(2, "Name is required"),
        maxDaysPerYear: z.number().int().positive(),
        isPaid: z.boolean(),
        carryForward: z.boolean(),
      }),
    )
    .mutation(({ ctx, input }) => addLeaveType(ctx.db, input)),

  allocate: roleProcedure([...hrRoles])
    .input(
      z.object({
        employeeId: z.string().min(1),
        leaveTypeId: z.string().min(1),
        year: z.number().int().min(2020).max(2100),
        totalDays: z.number().int().positive(),
      }),
    )
    .mutation(({ ctx, input }) => allocateLeave(ctx.db, ctx.session.user.id, input)),

  getBalance: protectedProcedure.query(({ ctx }) =>
    getLeaveBalances(ctx.db, ctx.session.user.id),
  ),

  apply: protectedProcedure
    .input(
      z.object({
        leaveTypeId: z.string().min(1),
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
        isHalfDay: z.boolean(),
        halfDayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        reason: z.string().min(5, "Please provide a reason (min 5 characters)"),
      }),
    )
    .mutation(({ ctx, input }) => applyForLeave(ctx.db, ctx.session.user.id, input)),

  getMyApplications: protectedProcedure.query(({ ctx }) =>
    getMyLeaveApplications(ctx.db, ctx.session.user.id),
  ),

  getPendingApprovals: roleProcedure([...approverRoles]).query(({ ctx }) =>
    getPendingApprovals(ctx.db, ctx.session.user.id),
  ),

  getAllApprovals: roleProcedure([...approverRoles]).query(({ ctx }) =>
    getAllApprovals(ctx.db, ctx.session.user.id),
  ),

  approve: roleProcedure([...approverRoles])
    .input(z.object({ applicationId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      approveLeaveApplication(ctx.db, ctx.session.user.id, input.applicationId),
    ),

  reject: roleProcedure([...approverRoles])
    .input(
      z.object({
        applicationId: z.string().min(1),
        reason: z.string().min(5, "Please provide a rejection reason"),
      }),
    )
    .mutation(({ ctx, input }) =>
      rejectLeaveApplication(ctx.db, ctx.session.user.id, input.applicationId, input.reason),
    ),

  cancel: protectedProcedure
    .input(z.object({ applicationId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      cancelLeaveApplication(ctx.db, ctx.session.user.id, input.applicationId),
    ),
});
```

- [ ] **Step 2: Wire `leaveRouter` into `src/server/api/root.ts`**

Add the import and route entry:

```typescript
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { attendanceRouter } from "~/server/api/routers/attendance";
import { authRouter } from "~/server/api/routers/auth";
import { employeeRouter } from "~/server/api/routers/employee";
import { leaveRouter } from "~/server/api/routers/leave";
import { payrollRouter } from "~/server/api/routers/payroll";
import { settingsRouter } from "~/server/api/routers/settings";

export const appRouter = createTRPCRouter({
  attendance: attendanceRouter,
  auth: authRouter,
  employee: employeeRouter,
  leave: leaveRouter,
  payroll: payrollRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to leave files.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/leave.ts src/server/api/root.ts
git commit -m "feat(stage-3): leave tRPC router, wire into root"
```

---

## Task 4: Leave Management Page (HR — Types & Allocations)

**Files:**
- Create: `src/app/(dashboard)/dashboard/leave/manage/page.tsx`

This page is accessible to HR_OFFICER and ADMIN only. It has two sections: Leave Types (create + list) and Allocations (select employee + type + year + days).

- [ ] **Step 1: Create `src/app/(dashboard)/dashboard/leave/manage/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { LeaveManageWorkspace } from "~/components/leave/LeaveManageWorkspace";

export default async function LeaveManagePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/dashboard/security/change-password");

  const allowed = ["ADMIN", "HR_OFFICER"] as string[];
  if (!allowed.includes(session.user.role)) redirect("/dashboard/leave");

  const [leaveTypes, employees] = await Promise.all([
    api.leave.listTypes(),
    api.employee.list(),
  ]);

  return (
    <LeaveManageWorkspace
      leaveTypes={leaveTypes}
      employees={employees}
    />
  );
}
```

- [ ] **Step 2: Create `src/components/leave/LeaveManageWorkspace.tsx`**

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

type LeaveType = {
  id: string;
  name: string;
  maxDaysPerYear: number;
  isPaid: boolean;
  carryForward: boolean;
};

type Employee = { id: string; firstName: string; lastName: string; employeeCode: string };

interface Props {
  leaveTypes: LeaveType[];
  employees: Employee[];
}

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

export function LeaveManageWorkspace({ leaveTypes: initial, employees }: Props) {
  const [tab, setTab] = useState<"types" | "allocations">("types");
  const utils = api.useUtils();

  // ─── Leave Type Form ──────────────────────────────────────────────────────
  const [typeForm, setTypeForm] = useState({ name: "", maxDaysPerYear: 12, isPaid: true, carryForward: false });
  const [typeError, setTypeError] = useState("");

  const createType = api.leave.createType.useMutation({
    onSuccess: () => {
      setTypeForm({ name: "", maxDaysPerYear: 12, isPaid: true, carryForward: false });
      setTypeError("");
      void utils.leave.listTypes.invalidate();
    },
    onError: (e) => setTypeError(e.message),
  });

  // ─── Allocation Form ──────────────────────────────────────────────────────
  const [allocForm, setAllocForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    year: currentYear,
    totalDays: 12,
  });
  const [allocError, setAllocError] = useState("");
  const [allocSuccess, setAllocSuccess] = useState("");

  const allocate = api.leave.allocate.useMutation({
    onSuccess: () => {
      setAllocError("");
      setAllocSuccess("Leave allocated successfully");
      setTimeout(() => setAllocSuccess(""), 3000);
    },
    onError: (e) => { setAllocError(e.message); setAllocSuccess(""); },
  });

  // ─── Latest leave types (after mutations) ─────────────────────────────────
  const { data: leaveTypes = initial } = api.leave.listTypes.useQuery(undefined, {
    initialData: initial,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="mt-1 text-sm text-gray-500">Configure leave types and allocate quotas to employees</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(["types", "allocations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t === "types" ? "Leave Types" : "Allocations"}
          </button>
        ))}
      </div>

      {tab === "types" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Leave Type */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 font-semibold text-gray-900">Add Leave Type</h2>
            {typeError && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{typeError}</div>
            )}
            <div className="space-y-3">
              <input
                value={typeForm.name}
                onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Leave type name (e.g. Casual Leave)"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Max days/year</label>
                  <input
                    type="number"
                    min={1}
                    value={typeForm.maxDaysPerYear}
                    onChange={(e) => setTypeForm((f) => ({ ...f, maxDaysPerYear: Number(e.target.value) }))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={typeForm.isPaid}
                    onChange={(e) => setTypeForm((f) => ({ ...f, isPaid: e.target.checked }))}
                    className="rounded"
                  />
                  Paid leave
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={typeForm.carryForward}
                    onChange={(e) => setTypeForm((f) => ({ ...f, carryForward: e.target.checked }))}
                    className="rounded"
                  />
                  Carry forward
                </label>
              </div>
              <button
                onClick={() => createType.mutate(typeForm)}
                disabled={createType.isPending || !typeForm.name.trim()}
                className="w-full rounded-lg bg-purple-700 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
              >
                {createType.isPending ? "Adding..." : "Add Leave Type"}
              </button>
            </div>
          </div>

          {/* Leave Types List */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 font-semibold text-gray-900">Existing Types ({leaveTypes.length})</h2>
            {leaveTypes.length === 0 ? (
              <p className="text-sm text-gray-400">No leave types configured yet.</p>
            ) : (
              <ul className="space-y-2">
                {leaveTypes.map((lt) => (
                  <li key={lt.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lt.name}</p>
                      <p className="text-xs text-gray-500">{lt.maxDaysPerYear} days/year</p>
                    </div>
                    <div className="flex gap-2">
                      {lt.isPaid && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Paid</span>
                      )}
                      {lt.carryForward && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Carry</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "allocations" && (
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 max-w-lg">
          <h2 className="mb-4 font-semibold text-gray-900">Allocate Leave to Employee</h2>
          {allocError && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{allocError}</div>
          )}
          {allocSuccess && (
            <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{allocSuccess}</div>
          )}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Employee</label>
              <select
                value={allocForm.employeeId}
                onChange={(e) => setAllocForm((f) => ({ ...f, employeeId: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Leave Type</label>
              <select
                value={allocForm.leaveTypeId}
                onChange={(e) => setAllocForm((f) => ({ ...f, leaveTypeId: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">Year</label>
                <select
                  value={allocForm.year}
                  onChange={(e) => setAllocForm((f) => ({ ...f, year: Number(e.target.value) }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">Total Days</label>
                <input
                  type="number"
                  min={1}
                  value={allocForm.totalDays}
                  onChange={(e) => setAllocForm((f) => ({ ...f, totalDays: Number(e.target.value) }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <button
              onClick={() => allocate.mutate(allocForm)}
              disabled={allocate.isPending || !allocForm.employeeId || !allocForm.leaveTypeId}
              className="w-full rounded-lg bg-purple-700 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
            >
              {allocate.isPending ? "Allocating..." : "Allocate Leave"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/leave/manage/ src/components/leave/
git commit -m "feat(stage-3): leave manage page (types + allocations)"
```

---

## Task 5: My Leaves Page + Apply Page

**Files:**
- Create: `src/app/(dashboard)/dashboard/leave/page.tsx`
- Create: `src/app/(dashboard)/dashboard/leave/apply/page.tsx`
- Create: `src/components/leave/MyLeaveWorkspace.tsx`
- Create: `src/components/leave/ApplyLeaveWorkspace.tsx`

- [ ] **Step 1: Create `src/app/(dashboard)/dashboard/leave/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { MyLeaveWorkspace } from "~/components/leave/MyLeaveWorkspace";

export default async function LeavePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/dashboard/security/change-password");

  const [balances, applications] = await Promise.all([
    api.leave.getBalance(),
    api.leave.getMyApplications(),
  ]);

  const canManage = ["ADMIN", "HR_OFFICER"].includes(session.user.role);
  const canApprove = ["ADMIN", "PAYROLL_OFFICER"].includes(session.user.role);

  return (
    <MyLeaveWorkspace
      balances={balances}
      applications={applications}
      role={session.user.role}
      canManage={canManage}
      canApprove={canApprove}
    />
  );
}
```

- [ ] **Step 2: Create `src/components/leave/MyLeaveWorkspace.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "~/trpc/react";
import { type Role } from "../../../generated/prisma";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

type Balance = {
  leaveTypeId: string;
  leaveTypeName: string;
  isPaid: boolean;
  totalDays: number;
  remainingDays: number;
  usedDays: number;
};

type Application = {
  id: string;
  leaveType: { name: string };
  fromDate: Date;
  toDate: Date;
  totalDays: unknown;
  status: string;
  reason: string;
  rejectionReason?: string | null;
};

interface Props {
  balances: Balance[];
  applications: Application[];
  role: Role;
  canManage: boolean;
  canApprove: boolean;
}

function fmt(date: Date) {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function MyLeaveWorkspace({ balances, applications: initial, canManage, canApprove }: Props) {
  const utils = api.useUtils();
  const [cancelError, setCancelError] = useState<string>("");

  const { data: applications = initial } = api.leave.getMyApplications.useQuery(undefined, {
    initialData: initial,
  });

  const cancel = api.leave.cancel.useMutation({
    onSuccess: () => { setCancelError(""); void utils.leave.getMyApplications.invalidate(); },
    onError: (e) => setCancelError(e.message),
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave</h1>
          <p className="mt-1 text-sm text-gray-500">View your leave balance and applications</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Link href="/dashboard/leave/manage" className="rounded-lg border border-purple-200 px-4 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-50">
              Manage
            </Link>
          )}
          {canApprove && (
            <Link href="/dashboard/leave/approvals" className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50">
              Approvals
            </Link>
          )}
          <Link href="/dashboard/leave/apply" className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800">
            Apply for Leave
          </Link>
        </div>
      </div>

      {/* Balance Cards */}
      {balances.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map((b) => (
            <div key={b.leaveTypeId} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <p className="text-sm font-medium text-gray-600">{b.leaveTypeName}</p>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-3xl font-bold text-purple-700">{b.remainingDays}</span>
                <span className="mb-1 text-sm text-gray-400">/ {b.totalDays} days left</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-purple-500"
                  style={{ width: `${b.totalDays > 0 ? (b.remainingDays / b.totalDays) * 100 : 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">{b.usedDays} used {b.isPaid ? "· Paid" : "· Unpaid"}</p>
            </div>
          ))}
        </div>
      )}

      {balances.length === 0 && (
        <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-700 ring-1 ring-amber-200">
          No leave has been allocated to you yet. Contact HR to set up your leave balance.
        </div>
      )}

      {/* Error */}
      {cancelError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{cancelError}</div>
      )}

      {/* Applications Table */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">My Applications ({applications.length})</h2>
        </div>
        {applications.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No leave applications yet.{" "}
            <Link href="/dashboard/leave/apply" className="text-purple-700 hover:underline">Apply now →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 font-medium text-gray-500">Type</th>
                <th className="px-6 py-3 font-medium text-gray-500">From</th>
                <th className="px-6 py-3 font-medium text-gray-500">To</th>
                <th className="px-6 py-3 font-medium text-gray-500">Days</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-gray-900">{app.leaveType.name}</td>
                  <td className="px-6 py-4 text-gray-600">{fmt(app.fromDate)}</td>
                  <td className="px-6 py-4 text-gray-600">{fmt(app.toDate)}</td>
                  <td className="px-6 py-4 text-gray-600">{Number(app.totalDays)}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[app.status] ?? ""}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {app.status === "PENDING" && (
                      <button
                        onClick={() => cancel.mutate({ applicationId: app.id })}
                        disabled={cancel.isPending}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                    {app.status === "REJECTED" && app.rejectionReason && (
                      <span className="text-xs text-gray-400" title={app.rejectionReason}>
                        See reason
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/(dashboard)/dashboard/leave/apply/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { ApplyLeaveWorkspace } from "~/components/leave/ApplyLeaveWorkspace";

export default async function ApplyLeavePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/dashboard/security/change-password");

  const [leaveTypes, balances] = await Promise.all([
    api.leave.listTypes(),
    api.leave.getBalance(),
  ]);

  return <ApplyLeaveWorkspace leaveTypes={leaveTypes} balances={balances} />;
}
```

- [ ] **Step 4: Create `src/components/leave/ApplyLeaveWorkspace.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type LeaveType = { id: string; name: string; isPaid: boolean };
type Balance = { leaveTypeId: string; leaveTypeName: string; remainingDays: number };

interface Props {
  leaveTypes: LeaveType[];
  balances: Balance[];
}

export function ApplyLeaveWorkspace({ leaveTypes, balances }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    leaveTypeId: "",
    fromDate: "",
    toDate: "",
    isHalfDay: false,
    halfDayDate: "",
    reason: "",
  });
  const [error, setError] = useState("");

  const balanceMap = new Map(balances.map((b) => [b.leaveTypeId, b.remainingDays]));

  const apply = api.leave.apply.useMutation({
    onSuccess: () => router.push("/dashboard/leave"),
    onError: (e) => setError(e.message),
  });

  const selectedBalance = form.leaveTypeId ? (balanceMap.get(form.leaveTypeId) ?? null) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.leaveTypeId) { setError("Please select a leave type"); return; }
    if (!form.fromDate) { setError("Please select a start date"); return; }
    if (!form.toDate && !form.isHalfDay) { setError("Please select an end date"); return; }
    apply.mutate({
      leaveTypeId: form.leaveTypeId,
      fromDate: form.fromDate,
      toDate: form.isHalfDay ? form.fromDate : form.toDate,
      isHalfDay: form.isHalfDay,
      halfDayDate: form.isHalfDay ? form.fromDate : undefined,
      reason: form.reason,
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Apply for Leave</h1>
        <p className="mt-1 text-sm text-gray-500">Submit a leave request for approval</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Leave Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Leave Type</label>
            <select
              value={form.leaveTypeId}
              onChange={(e) => setForm((f) => ({ ...f, leaveTypeId: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
            {selectedBalance !== null && (
              <p className="mt-1 text-xs text-gray-500">
                Balance: <span className={`font-semibold ${selectedBalance <= 0 ? "text-red-600" : "text-green-600"}`}>{selectedBalance} days remaining</span>
              </p>
            )}
          </div>

          {/* Half Day */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isHalfDay}
              onChange={(e) => setForm((f) => ({ ...f, isHalfDay: e.target.checked }))}
              className="rounded"
            />
            Half day
          </label>

          {/* Date(s) */}
          {form.isHalfDay ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={form.fromDate}
                onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">From</label>
                <input
                  type="date"
                  value={form.fromDate}
                  onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">To</label>
                <input
                  type="date"
                  value={form.toDate}
                  min={form.fromDate}
                  onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
            <textarea
              rows={3}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Brief reason for your leave request..."
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/leave")}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={apply.isPending}
              className="flex-1 rounded-lg bg-purple-700 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
            >
              {apply.isPending ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/dashboard/leave/page.tsx src/app/(dashboard)/dashboard/leave/apply/ src/components/leave/MyLeaveWorkspace.tsx src/components/leave/ApplyLeaveWorkspace.tsx
git commit -m "feat(stage-3): my leave page and apply form"
```

---

## Task 6: Approvals Page (Payroll Officer & Admin)

**Files:**
- Create: `src/app/(dashboard)/dashboard/leave/approvals/page.tsx`
- Create: `src/components/leave/ApprovalsWorkspace.tsx`

- [ ] **Step 1: Create `src/app/(dashboard)/dashboard/leave/approvals/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { ApprovalsWorkspace } from "~/components/leave/ApprovalsWorkspace";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/dashboard/security/change-password");

  const allowed = ["ADMIN", "PAYROLL_OFFICER"] as string[];
  if (!allowed.includes(session.user.role)) redirect("/dashboard/leave");

  const [pending, all] = await Promise.all([
    api.leave.getPendingApprovals(),
    api.leave.getAllApprovals(),
  ]);

  return <ApprovalsWorkspace pending={pending} all={all} />;
}
```

- [ ] **Step 2: Create `src/components/leave/ApprovalsWorkspace.tsx`**

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

type Application = {
  id: string;
  leaveType: { name: string };
  fromDate: Date;
  toDate: Date;
  totalDays: unknown;
  status: string;
  reason: string;
  employee: { id: string; employeeCode: string; firstName: string; lastName: string; department: { name: string } };
};

interface Props {
  pending: Application[];
  all: Application[];
}

function fmt(date: Date) {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function ApprovalsWorkspace({ pending: initialPending, all: initialAll }: Props) {
  const utils = api.useUtils();
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState("");

  const { data: pending = initialPending } = api.leave.getPendingApprovals.useQuery(undefined, { initialData: initialPending });
  const { data: all = initialAll } = api.leave.getAllApprovals.useQuery(undefined, { initialData: initialAll });

  const invalidate = () => {
    void utils.leave.getPendingApprovals.invalidate();
    void utils.leave.getAllApprovals.invalidate();
  };

  const approve = api.leave.approve.useMutation({
    onSuccess: () => { setActionError(""); invalidate(); },
    onError: (e) => setActionError(e.message),
  });

  const reject = api.leave.reject.useMutation({
    onSuccess: () => { setRejectModal(null); setRejectReason(""); setActionError(""); invalidate(); },
    onError: (e) => setActionError(e.message),
  });

  const rows = tab === "pending" ? pending : all;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leave Approvals</h1>
        <p className="mt-1 text-sm text-gray-500">Review and action employee leave requests</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setTab("pending")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === "pending" ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab("all")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === "all" ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          All Applications
        </button>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
      )}

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            {tab === "pending" ? "No pending leave requests." : "No applications found."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 font-medium text-gray-500">Employee</th>
                <th className="px-6 py-3 font-medium text-gray-500">Leave Type</th>
                <th className="px-6 py-3 font-medium text-gray-500">Dates</th>
                <th className="px-6 py-3 font-medium text-gray-500">Days</th>
                <th className="px-6 py-3 font-medium text-gray-500">Reason</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                {tab === "pending" && <th className="px-6 py-3 font-medium text-gray-500">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((app) => (
                <tr key={app.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{app.employee.firstName} {app.employee.lastName}</p>
                    <p className="text-xs text-gray-400">{app.employee.employeeCode} · {app.employee.department.name}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{app.leaveType.name}</td>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    {fmt(app.fromDate)} – {fmt(app.toDate)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">{Number(app.totalDays)}</td>
                  <td className="max-w-[200px] px-6 py-4 text-gray-600">
                    <span className="line-clamp-2">{app.reason}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[app.status] ?? ""}`}>
                      {app.status}
                    </span>
                  </td>
                  {tab === "pending" && (
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve.mutate({ applicationId: app.id })}
                          disabled={approve.isPending}
                          className="rounded-md bg-green-50 px-3 py-1 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => { setRejectModal({ id: app.id, name: `${app.employee.firstName} ${app.employee.lastName}` }); setRejectReason(""); }}
                          className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 font-semibold text-gray-900">Reject Leave Request</h3>
            <p className="mb-4 text-sm text-gray-500">Rejecting request for {rejectModal.name}</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)..."
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => reject.mutate({ applicationId: rejectModal.id, reason: rejectReason })}
                disabled={reject.isPending || rejectReason.length < 5}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {reject.isPending ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/leave/approvals/ src/components/leave/ApprovalsWorkspace.tsx
git commit -m "feat(stage-3): leave approvals page with approve/reject modal"
```

---

## Task 7: TypeScript Check & Stage Checkpoint

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Fix any errors before proceeding. Common issues:
- `employee.list()` may not exist — check what the actual procedure name is in `employeeRouter`
- `app.totalDays` is `Prisma.Decimal` — use `Number(app.totalDays)` when displaying

- [ ] **Step 2: Check employee router for correct list procedure name**

```bash
grep -n "list\|getAll\|findAll" src/server/api/routers/employee.ts | head -10
```

If the procedure is named differently (e.g. `getAll`), update `LeaveManageWorkspace.tsx` and the manage page accordingly.

- [ ] **Step 3: Update EMPAY.md Stage 3 checkboxes**

In `EMPAY.md`, change all Stage 3 `- [ ]` items to `- [x]`.

- [ ] **Step 4: Final commit**

```bash
git add EMPAY.md
git commit -m "feat(stage-3): complete leave management — types, allocations, apply, approve, ledger sync"
```

---

## Self-Review Notes

- **Spec coverage:** All 10 `leaveRouter` procedures from EMPAY.md §5 are implemented.
- **Business rules covered:** Rule #2 (balance check before apply), Rule #3 (attendance sync on approval), Rule #8 (paid/unpaid distinction in balance calc).
- **Transactions:** `approveLeaveApplication` uses `db.$transaction` — ledger debit + attendance sync are atomic.
- **Known type:** `Prisma.Decimal.negated()` — available in Prisma 7. If it doesn't exist, use `new Prisma.Decimal(-Number(application.totalDays))` instead.
- **`employee.list()`** — the manage page calls this. Verify the actual procedure name from `employeeRouter` before dispatching Task 4 subagent.
- **`getUserCompany`** — already used in attendance service, imported from `employee.repo`. Verify it exists and returns `{ companyId, company }`.
