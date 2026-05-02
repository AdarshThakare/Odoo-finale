import { TRPCError } from "@trpc/server";
import { Prisma } from "../../../../generated/prisma";
import { type PrismaClient } from "../../../../generated/prisma";
import {
  getEmployeeByUserId,
  getUserCompany,
} from "~/server/repositories/employee.repo";
import {
  createAttendanceRecord,
  getAttendanceForCompanyDate,
  getAttendanceForEmployeeMonth,
  getAttendanceRecordForEmployeeDate,
  updateAttendanceRecord,
} from "~/server/repositories/attendance.repo";

type AttendanceStatusView =
  | "ABSENT"
  | "PRESENT"
  | "HALF_DAY"
  | "ON_LEAVE"
  | "IN_PROGRESS";

type AttendanceDay = {
  date: string;
  weekday: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: string | null;
  extraHours: string | null;
  status: AttendanceStatusView;
};

type MyAttendanceResult = {
  company: {
    id: string;
    name: string;
    code: string;
    logoUrl: string | null;
  };
  employee: {
    id: string;
    employeeCode: string;
    name: string;
    department: string;
    designation: string;
  };
  month: {
    key: string;
    label: string;
    startDate: string;
    endDate: string;
    totalWorkingDays: number;
  };
  stats: {
    daysPresent: number;
    leaveCount: number;
    totalWorkingDays: number;
    currentlyCheckedIn: boolean;
  };
  days: AttendanceDay[];
};

type TeamAttendanceRow = {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: string;
  designation: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: string | null;
  extraHours: string | null;
  status: AttendanceStatusView;
};

type TeamAttendanceResult = {
  company: {
    id: string;
    name: string;
    code: string;
    logoUrl: string | null;
  };
  date: {
    key: string;
    label: string;
    weekday: string;
  };
  search: string;
  stats: {
    totalEmployees: number;
    presentCount: number;
    inProgressCount: number;
    leaveCount: number;
    absentCount: number;
  };
  rows: TeamAttendanceRow[];
};

const WORK_DAY_HOURS = 8;

function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function startOfMonthUtc(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function startOfNextMonthUtc(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1));
}

function parseMonthKey(monthKey?: string) {
  const now = new Date();
  if (!monthKey) {
    const startDate = startOfMonthUtc(now);
    return {
      key: formatMonthKey(startDate),
      startDate,
      endDate: startOfNextMonthUtc(startDate),
    };
  }

  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    const startDate = startOfMonthUtc(now);
    return {
      key: formatMonthKey(startDate),
      startDate,
      endDate: startOfNextMonthUtc(startDate),
    };
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  return {
    key: formatMonthKey(startDate),
    startDate,
    endDate: startOfNextMonthUtc(startDate),
  };
}

function parseDateKey(dateKey?: string) {
  const now = new Date();
  if (!dateKey) {
    return startOfUtcDay(now);
  }

  const parsed = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return startOfUtcDay(now);
  }

  return parsed;
}

function formatDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatMonthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function formatWeekday(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(value);
}

function formatClock(value: Date | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function formatHours(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return value.toFixed(2).padStart(5, "0");
}

function countWorkingDays(startDate: Date, endDate: Date) {
  let count = 0;
  for (
    let cursor = new Date(startDate);
    cursor < endDate;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
  }
  return count;
}

function enumerateDates(startDate: Date, endDate: Date) {
  const dates: Date[] = [];
  for (
    let cursor = new Date(startDate);
    cursor < endDate;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    dates.push(new Date(cursor));
  }
  return dates;
}

function deriveStatus(record: {
  checkIn: Date | null;
  checkOut: Date | null;
  workingHours: Prisma.Decimal | null;
  status: string;
}): AttendanceStatusView {
  if (!record.checkIn) {
    return record.status === "ON_LEAVE" ? "ON_LEAVE" : "ABSENT";
  }

  if (!record.checkOut) {
    return "IN_PROGRESS";
  }

  const workingHours = record.workingHours ? Number(record.workingHours) : 0;
  if (workingHours >= WORK_DAY_HOURS) return "PRESENT";
  if (workingHours >= 4) return "HALF_DAY";
  return "ABSENT";
}

function deriveExtraHours(workingHours: number | null) {
  if (workingHours === null) return null;
  return Math.max(0, workingHours - WORK_DAY_HOURS);
}

async function getCompanyScope(db: PrismaClient, userId: string) {
  const creator = await getUserCompany(db, userId);
  if (!creator?.companyId || !creator.company) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Company setup is required",
    });
  }

  return {
    ...creator,
    companyId: creator.companyId,
    company: creator.company,
  };
}

export async function getMyAttendanceForUser(
  db: PrismaClient,
  userId: string,
  monthKey?: string,
): Promise<MyAttendanceResult> {
  const scope = await getCompanyScope(db, userId);
  const employee = await getEmployeeByUserId(db, userId);

  if (!employee) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Employee profile not found",
    });
  }

  const month = parseMonthKey(monthKey);
  const [attendanceRecords, employeeProfile] = await Promise.all([
    getAttendanceForEmployeeMonth(
      db,
      employee.id,
      month.startDate,
      month.endDate,
    ),
    db.employee.findUnique({
      where: { id: employee.id },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        department: { select: { name: true } },
        designation: { select: { name: true } },
      },
    }),
  ]);

  if (!employeeProfile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Employee profile not found",
    });
  }

  const attendanceMap = new Map<string, (typeof attendanceRecords)[number]>();
  for (const record of attendanceRecords) {
    attendanceMap.set(formatDateKey(record.date), record);
  }

  const days = enumerateDates(month.startDate, month.endDate).map((date) => {
    const record = attendanceMap.get(formatDateKey(date));
    const workingHours = record?.workingHours
      ? Number(record.workingHours)
      : null;
    const status = record ? deriveStatus(record) : "ABSENT";

    return {
      date: formatDateKey(date),
      weekday: formatWeekday(date),
      checkIn: formatClock(record?.checkIn),
      checkOut: formatClock(record?.checkOut),
      workingHours: formatHours(workingHours),
      extraHours: formatHours(deriveExtraHours(workingHours)),
      status,
    };
  });

  const daysPresent = attendanceRecords.filter((record) => {
    const status = deriveStatus(record);
    return status === "PRESENT" || status === "HALF_DAY";
  }).length;

  const leaveCount = attendanceRecords.filter(
    (record) => record.status === "ON_LEAVE",
  ).length;
  const currentlyCheckedIn = attendanceRecords.some(
    (record) => !record.checkOut && !!record.checkIn,
  );
  const totalWorkingDays = countWorkingDays(month.startDate, month.endDate);

  return {
    company: scope.company,
    employee: {
      id: employeeProfile.id,
      employeeCode: employeeProfile.employeeCode,
      name: `${employeeProfile.firstName} ${employeeProfile.lastName}`,
      department: employeeProfile.department.name,
      designation: employeeProfile.designation.name,
    },
    month: {
      key: month.key,
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(month.startDate),
      startDate: formatDateKey(month.startDate),
      endDate: formatDateKey(
        new Date(month.endDate.getTime() - 24 * 60 * 60 * 1000),
      ),
      totalWorkingDays,
    },
    stats: {
      daysPresent,
      leaveCount,
      totalWorkingDays,
      currentlyCheckedIn,
    },
    days,
  };
}

export async function getAllAttendanceForUser(
  db: PrismaClient,
  userId: string,
  dateKey?: string,
  search?: string,
): Promise<TeamAttendanceResult> {
  const scope = await getCompanyScope(db, userId);
  const date = parseDateKey(dateKey);
  const employees = await getAttendanceForCompanyDate(
    db,
    scope.companyId,
    date,
    search,
  );

  const rows: TeamAttendanceRow[] = employees.map((employee) => {
    const record = employee.attendanceRecords[0];
    if (!record) {
      // Employee has no record today — mark as ABSENT
      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department.name,
        designation: employee.designation.name,
        checkIn: null,
        checkOut: null,
        workingHours: null,
        extraHours: null,
        status: "ABSENT" as const,
      };
    }

    const workingHours = record.workingHours
      ? Number(record.workingHours)
      : null;
    const status = deriveStatus(record);

    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      name: `${employee.firstName} ${employee.lastName}`,
      department: employee.department.name,
      designation: employee.designation.name,
      checkIn: formatClock(record.checkIn),
      checkOut: formatClock(record.checkOut),
      workingHours: formatHours(workingHours),
      extraHours: formatHours(deriveExtraHours(workingHours)),
      status,
    };
  });

  const presentCount = rows.filter(
    (row) => row.status === "PRESENT" || row.status === "HALF_DAY",
  ).length;
  const inProgressCount = rows.filter(
    (row) => row.status === "IN_PROGRESS",
  ).length;
  const leaveCount = rows.filter((row) => row.status === "ON_LEAVE").length;
  const totalEmployees = employees.length;
  const absentCount = Math.max(0, totalEmployees - rows.length);

  return {
    company: scope.company,
    date: {
      key: formatDateKey(date),
      label: formatDateLabel(date),
      weekday: formatWeekday(date),
    },
    search: search?.trim() ?? "",
    stats: {
      totalEmployees,
      presentCount,
      inProgressCount,
      leaveCount,
      absentCount,
    },
    rows,
  };
}

export async function checkInForUser(db: PrismaClient, userId: string) {
  const scope = await getCompanyScope(db, userId);
  const employee = await getEmployeeByUserId(db, userId);

  if (!employee || employee.companyId !== scope.companyId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Employee profile not found",
    });
  }

  const today = startOfUtcDay(new Date());
  const existing = await getAttendanceRecordForEmployeeDate(
    db,
    employee.id,
    today,
  );

  if (existing?.checkIn) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You have already checked in today",
    });
  }

  const now = new Date();

  if (existing) {
    // Record exists (e.g. created by a leave system) but has no checkIn yet — update it
    return db.attendanceRecord.update({
      where: { id: existing.id },
      data: { checkIn: now },
      select: { id: true, date: true, checkIn: true, checkOut: true, workingHours: true, status: true, notes: true },
    });
  }

  return createAttendanceRecord(db, {
    employeeId: employee.id,
    date: today,
    checkIn: now,
    status: "ABSENT", // will be updated to PRESENT/HALF_DAY on check-out
  });
}

export async function checkOutForUser(db: PrismaClient, userId: string) {
  const scope = await getCompanyScope(db, userId);
  const employee = await getEmployeeByUserId(db, userId);

  if (employee?.companyId !== scope.companyId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Employee profile not found",
    });
  }

  const today = startOfUtcDay(new Date());
  const record = await getAttendanceRecordForEmployeeDate(
    db,
    employee.id,
    today,
  );

  if (!record?.checkIn) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Check in before checking out",
    });
  }

  if (record.checkOut) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You have already checked out today",
    });
  }

  const now = new Date();
  const hours = Math.max(
    (now.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60),
    0,
  );
  const workingHours = new Prisma.Decimal(hours.toFixed(2));
  const status =
    hours >= WORK_DAY_HOURS ? "PRESENT" : hours >= 4 ? "HALF_DAY" : "ABSENT";

  return updateAttendanceRecord(db, record.id, {
    checkOut: now,
    workingHours,
    status,
  });
}

export async function getTodayAttendanceSummary(
  db: PrismaClient,
  userId: string,
) {
  const scope = await getCompanyScope(db, userId);
  const today = startOfUtcDay(new Date());

  const records = await db.attendanceRecord.findMany({
    where: {
      date: today,
      employee: {
        companyId: scope.companyId,
      },
      checkIn: { not: null },
    },
    select: {
      employeeId: true,
    },
  });

  return records.map((r) => r.employeeId);
}
