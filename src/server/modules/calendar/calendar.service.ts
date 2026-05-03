import { TRPCError } from "@trpc/server";

import { type PrismaClient } from "../../../../generated/prisma";

type CalendarStatus = "PRESENT" | "HALF_DAY" | "ABSENT" | "ON_LEAVE";
type CalendarMode = "team" | "mine";

export type CalendarPersonRecord = {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: string;
  designation: string;
  status: CalendarStatus;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: string | null;
  leaveType: string | null;
  leaveStatus: string | null;
  leaveReason: string | null;
};

export type CalendarDay = {
  date: string;
  dayNumber: number;
  weekday: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  summary: {
    total: number;
    present: number;
    halfDay: number;
    absent: number;
    onLeave: number;
    pendingLeave: number;
  };
  records: CalendarPersonRecord[];
};

export type DashboardCalendarData = {
  mode: CalendarMode;
  month: {
    key: string;
    label: string;
    previousKey: string;
    nextKey: string;
  };
  viewer: {
    role: string;
    companyName: string;
    employeeName: string | null;
  };
  filters: {
    departments: string[];
    statuses: CalendarStatus[];
  };
  totals: CalendarDay["summary"];
  days: CalendarDay[];
};

const DISPLAY_TIME_ZONE = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function parseMonthKey(monthKey?: string) {
  const now = new Date();
  const fallback = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  if (!monthKey) return fallback;

  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return fallback;
  }

  return new Date(Date.UTC(year, month - 1, 1));
}

function addMonths(value: Date, amount: number) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1),
  );
}

function formatDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatMonthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatClock(value: Date | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: DISPLAY_TIME_ZONE,
  }).format(value);
}

function formatHours(value: unknown) {
  if (value === null || value === undefined) return null;
  return Number(value).toFixed(2);
}

function formatWeekday(value: Date, format: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("en-US", {
    weekday: format,
    timeZone: "UTC",
  }).format(value);
}

function deriveStatus(record?: {
  checkIn: Date | null;
  checkOut: Date | null;
  workingHours: unknown;
  status: string;
}): CalendarStatus {
  if (!record) return "ABSENT";
  if (record.status === "ON_LEAVE") return "ON_LEAVE";
  if (record.status === "HALF_DAY") return "HALF_DAY";
  if (record.status === "PRESENT") return "PRESENT";
  if (!record.checkIn) return "ABSENT";
  if (!record.checkOut) return "HALF_DAY";
  return Number(record.workingHours ?? 0) >= 8 ? "PRESENT" : "HALF_DAY";
}

function enumerateCalendarGrid(monthStart: Date) {
  const monthEnd = addMonths(monthStart, 1);
  const gridStart = new Date(
    monthStart.getTime() - monthStart.getUTCDay() * DAY_MS,
  );
  const endDay = monthEnd.getUTCDay();
  const gridEnd = new Date(monthEnd.getTime() + ((7 - endDay) % 7) * DAY_MS);
  const days: Date[] = [];

  for (
    let cursor = new Date(gridStart);
    cursor < gridEnd;
    cursor = new Date(cursor.getTime() + DAY_MS)
  ) {
    days.push(new Date(cursor));
  }

  return {
    gridStart,
    gridEnd,
    days: days.length >= 35 ? days : [...days],
  };
}

function emptySummary(): CalendarDay["summary"] {
  return {
    total: 0,
    present: 0,
    halfDay: 0,
    absent: 0,
    onLeave: 0,
    pendingLeave: 0,
  };
}

function addToSummary(
  summary: CalendarDay["summary"],
  status: CalendarStatus,
  leaveStatus?: string | null,
) {
  summary.total += 1;
  if (status === "PRESENT") summary.present += 1;
  if (status === "HALF_DAY") summary.halfDay += 1;
  if (status === "ABSENT") summary.absent += 1;
  if (status === "ON_LEAVE") summary.onLeave += 1;
  if (leaveStatus === "PENDING") summary.pendingLeave += 1;
}

async function getViewer(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      companyId: true,
      company: { select: { name: true } },
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!user?.companyId || !user.company) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Company setup is required",
    });
  }

  return {
    ...user,
    companyId: user.companyId,
    company: user.company,
  };
}

export async function getDashboardCalendar(
  db: PrismaClient,
  userId: string,
  monthKey?: string,
): Promise<DashboardCalendarData> {
  const viewer = await getViewer(db, userId);
  const mode: CalendarMode = viewer.role === "ADMIN" ? "team" : "mine";
  const monthStart = parseMonthKey(monthKey);
  const monthEnd = addMonths(monthStart, 1);
  const {
    gridStart,
    gridEnd,
    days: gridDays,
  } = enumerateCalendarGrid(monthStart);
  const todayKey = formatDateKey(startOfUtcDay(new Date()));

  if (mode === "mine" && !viewer.employee) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Employee profile not found",
    });
  }

  const employees = await db.employee.findMany({
    where: {
      companyId: viewer.companyId,
      ...(mode === "mine" ? { id: viewer.employee?.id } : {}),
    },
    orderBy: [{ department: { name: "asc" } }, { firstName: "asc" }],
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
      attendanceRecords: {
        where: {
          date: {
            gte: gridStart,
            lt: gridEnd,
          },
        },
        select: {
          date: true,
          checkIn: true,
          checkOut: true,
          workingHours: true,
          status: true,
        },
      },
      leaveApplications: {
        where: {
          status: { in: ["PENDING", "APPROVED"] },
          fromDate: { lt: gridEnd },
          toDate: { gte: gridStart },
        },
        select: {
          fromDate: true,
          toDate: true,
          status: true,
          reason: true,
          leaveType: { select: { name: true } },
        },
      },
    },
  });

  const days = gridDays.map((date) => {
    const key = formatDateKey(date);
    const summary = emptySummary();
    const records: CalendarPersonRecord[] = employees.map((employee) => {
      const attendance = employee.attendanceRecords.find(
        (record) => formatDateKey(record.date) === key,
      );
      const leave = employee.leaveApplications.find(
        (application) =>
          formatDateKey(application.fromDate) <= key &&
          formatDateKey(application.toDate) >= key,
      );
      const status =
        leave?.status === "APPROVED" ? "ON_LEAVE" : deriveStatus(attendance);
      const leaveStatus = leave?.status ?? null;

      addToSummary(summary, status, leaveStatus);

      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department.name,
        designation: employee.designation.name,
        status,
        checkIn: formatClock(attendance?.checkIn),
        checkOut: formatClock(attendance?.checkOut),
        workingHours: formatHours(attendance?.workingHours),
        leaveType: leave?.leaveType.name ?? null,
        leaveStatus,
        leaveReason: leave?.reason ?? null,
      };
    });

    return {
      date: key,
      dayNumber: date.getUTCDate(),
      weekday: formatWeekday(date),
      isCurrentMonth: date >= monthStart && date < monthEnd,
      isToday: key === todayKey,
      isWeekend: [0, 6].includes(date.getUTCDay()),
      summary,
      records,
    };
  });

  const totals = days
    .filter((day) => day.isCurrentMonth)
    .reduce((acc, day) => {
      acc.total += day.summary.total;
      acc.present += day.summary.present;
      acc.halfDay += day.summary.halfDay;
      acc.absent += day.summary.absent;
      acc.onLeave += day.summary.onLeave;
      acc.pendingLeave += day.summary.pendingLeave;
      return acc;
    }, emptySummary());

  return {
    mode,
    month: {
      key: formatMonthKey(monthStart),
      label: new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(monthStart),
      previousKey: formatMonthKey(addMonths(monthStart, -1)),
      nextKey: formatMonthKey(addMonths(monthStart, 1)),
    },
    viewer: {
      role: viewer.role,
      companyName: viewer.company.name,
      employeeName: viewer.employee
        ? `${viewer.employee.firstName} ${viewer.employee.lastName}`
        : null,
    },
    filters: {
      departments: Array.from(
        new Set(employees.map((employee) => employee.department.name)),
      ).sort(),
      statuses: ["PRESENT", "HALF_DAY", "ABSENT", "ON_LEAVE"],
    },
    totals,
    days,
  };
}
