import { TRPCError } from "@trpc/server";
import { type PrismaClient, type Role } from "../../../../generated/prisma";

function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function formatDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(value: Date, months: number) {
  const next = new Date(value);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function monthLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(value);
}

async function getScope(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      companyId: true,
      company: { select: { id: true, name: true, code: true } },
      employee: { select: { id: true } },
    },
  });

  if (!user?.companyId || !user.company) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Company setup is required",
    });
  }

  return {
    userId: user.id,
    role: user.role,
    companyId: user.companyId,
    company: user.company,
    employeeId: user.employee?.id ?? null,
  };
}

function canSeeHr(role: Role) {
  return role === "ADMIN" || role === "HR_OFFICER";
}

function canSeePayroll(role: Role) {
  return role === "ADMIN" || role === "PAYROLL_OFFICER";
}

export async function getDashboardStats(db: PrismaClient, userId: string) {
  const scope = await getScope(db, userId);
  const today = startOfUtcDay(new Date());
  const monthStart = startOfMonth(today);
  const nextMonth = addMonths(monthStart, 1);

  const myAttendance = scope.employeeId
    ? await db.attendanceRecord.findUnique({
        where: { employeeId_date: { employeeId: scope.employeeId, date: today } },
        select: { status: true, checkIn: true, checkOut: true },
      })
    : null;

  const myLeaveBalance = scope.employeeId
    ? await db.leaveLedgerEntry.aggregate({
        where: {
          employeeId: scope.employeeId,
          fromDate: { gte: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)) },
        },
        _sum: { leaves: true },
      })
    : null;

  const employeePayslip = scope.employeeId
    ? await db.salarySlip.findFirst({
        where: { employeeId: scope.employeeId },
        orderBy: { createdAt: "desc" },
        select: { id: true, netSalary: true, createdAt: true },
      })
    : null;

  const hrStats = canSeeHr(scope.role)
    ? {
        headcount: await db.employee.count({
          where: { companyId: scope.companyId, user: { isActive: true } },
        }),
        presentToday: await db.attendanceRecord.count({
          where: {
            date: today,
            status: { in: ["PRESENT", "HALF_DAY"] },
            employee: { companyId: scope.companyId },
          },
        }),
        onLeaveToday: await db.attendanceRecord.count({
          where: {
            date: today,
            status: "ON_LEAVE",
            employee: { companyId: scope.companyId },
          },
        }),
        pendingLeaves: await db.leaveApplication.count({
          where: { status: "PENDING", employee: { companyId: scope.companyId } },
        }),
      }
    : null;

  const payrollEntry = canSeePayroll(scope.role)
    ? await db.payrollEntry.findFirst({
        where: {
          payrollPeriod: {
            createdById: {
              in: (
                await db.user.findMany({
                  where: { companyId: scope.companyId },
                  select: { id: true },
                })
              ).map((user) => user.id),
            },
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          totalGross: true,
          totalDeductions: true,
          totalNet: true,
          salarySlips: { select: { id: true } },
          payrollPeriod: { select: { name: true } },
        },
      })
    : null;

  return {
    company: scope.company,
    role: scope.role,
    today: formatDateKey(today),
    personal: {
      attendanceStatus: myAttendance?.status ?? "ABSENT",
      checkedIn: !!myAttendance?.checkIn && !myAttendance.checkOut,
      leaveBalance: Number(myLeaveBalance?._sum.leaves ?? 0),
      latestPayslip: employeePayslip,
    },
    hr: hrStats,
    payroll: payrollEntry
      ? {
          periodName: payrollEntry.payrollPeriod.name,
          totalGross: payrollEntry.totalGross,
          totalDeductions: payrollEntry.totalDeductions,
          totalNet: payrollEntry.totalNet,
          employeeCount: payrollEntry.salarySlips.length,
        }
      : null,
    monthWindow: {
      startDate: formatDateKey(monthStart),
      endDate: formatDateKey(addDays(nextMonth, -1)),
    },
  };
}

export async function getAttendanceTrend(db: PrismaClient, userId: string) {
  const scope = await getScope(db, userId);
  const today = startOfUtcDay(new Date());
  const start = addDays(today, -13);
  const rows = await db.attendanceRecord.findMany({
    where: {
      date: { gte: start, lte: today },
      employee: { companyId: scope.companyId },
    },
    select: { date: true, status: true },
  });

  return Array.from({ length: 14 }, (_, index) => {
    const date = addDays(start, index);
    const key = formatDateKey(date);
    const dayRows = rows.filter((row) => formatDateKey(row.date) === key);
    return {
      date: key.slice(5),
      present: dayRows.filter((row) =>
        ["PRESENT", "HALF_DAY"].includes(row.status),
      ).length,
      absent: dayRows.filter((row) => row.status === "ABSENT").length,
      leave: dayRows.filter((row) => row.status === "ON_LEAVE").length,
    };
  });
}

export async function getLeaveDistribution(db: PrismaClient, userId: string) {
  const scope = await getScope(db, userId);
  const rows = await db.leaveApplication.groupBy({
    by: ["leaveTypeId"],
    where: {
      status: "APPROVED",
      employee: { companyId: scope.companyId },
    },
    _sum: { totalDays: true },
  });

  const leaveTypes = await db.leaveType.findMany({
    where: { id: { in: rows.map((row) => row.leaveTypeId) } },
    select: { id: true, name: true },
  });

  return rows.map((row) => ({
    name:
      leaveTypes.find((leaveType) => leaveType.id === row.leaveTypeId)?.name ??
      "Leave",
    days: Number(row._sum.totalDays ?? 0),
  }));
}

export async function getPayrollTrend(db: PrismaClient, userId: string) {
  const scope = await getScope(db, userId);
  const userIds = (
    await db.user.findMany({
      where: { companyId: scope.companyId },
      select: { id: true },
    })
  ).map((user) => user.id);
  const monthStart = startOfMonth(new Date());
  const start = addMonths(monthStart, -5);
  const rows = await db.payrollEntry.findMany({
    where: {
      payrollPeriod: {
        startDate: { gte: start },
        createdById: { in: userIds },
      },
    },
    select: {
      totalNet: true,
      payrollPeriod: { select: { startDate: true } },
    },
  });

  return Array.from({ length: 6 }, (_, index) => {
    const month = addMonths(start, index);
    const key = `${month.getUTCFullYear()}-${month.getUTCMonth()}`;
    const monthRows = rows.filter(
      (row) =>
        `${row.payrollPeriod.startDate.getUTCFullYear()}-${row.payrollPeriod.startDate.getUTCMonth()}` ===
        key,
    );

    return {
      month: monthLabel(month),
      net: monthRows.reduce((sum, row) => sum + Number(row.totalNet), 0),
    };
  });
}

export async function getHeadcountByDepartment(
  db: PrismaClient,
  userId: string,
) {
  const scope = await getScope(db, userId);
  const departments = await db.department.findMany({
    where: { companyId: scope.companyId },
    select: {
      name: true,
      _count: { select: { employees: true } },
    },
    orderBy: { name: "asc" },
  });

  return departments.map((department) => ({
    department: department.name,
    employees: department._count.employees,
  }));
}
