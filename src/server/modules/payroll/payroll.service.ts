import { TRPCError } from "@trpc/server";
import { Prisma, type PrismaClient } from "../../../../generated/prisma";
import {
  getPayrollPeriodById,
  getPayslipById,
  listPayrollPeriods,
} from "~/server/repositories/payroll.repo";
import { calculatePayroll } from "./payroll.engine";
import { countWeekdays } from "./payroll.utils";

async function getCompanyScope(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (!user?.companyId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Company setup is required",
    });
  }

  return user.companyId;
}

async function getCompanyUserIds(db: PrismaClient, companyId: string) {
  const users = await db.user.findMany({
    where: { companyId },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

export async function listPeriods(db: PrismaClient, userId: string) {
  const companyId = await getCompanyScope(db, userId);
  const createdByIds = await getCompanyUserIds(db, companyId);
  return listPayrollPeriods(db, createdByIds);
}

export async function createPeriod(
  db: PrismaClient,
  userId: string,
  input: { name: string; startDate: string; endDate: string },
) {
  await getCompanyScope(db, userId);
  const startDate = new Date(`${input.startDate}T00:00:00Z`);
  const endDate = new Date(`${input.endDate}T00:00:00Z`);

  if (startDate > endDate) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Start date must be before end date",
    });
  }

  return db.payrollPeriod.create({
    data: {
      name: input.name,
      startDate,
      endDate,
      createdById: userId,
    },
  });
}

export async function runPayroll(
  db: PrismaClient,
  userId: string,
  periodId: string,
) {
  const companyId = await getCompanyScope(db, userId);
  const period = await db.payrollPeriod.findUnique({
    where: { id: periodId },
    include: { payrollEntries: { select: { id: true } } },
  });

  if (!period) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Period not found" });
  }

  if (period.payrollEntries.length > 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Payroll has already been run for this period",
    });
  }

  const employees = await db.employee.findMany({
    where: { companyId, user: { isActive: true } },
    include: {
      salaryStructure: true,
      employeeSalaryComponents: {
        where: { isActive: true, effectiveFrom: { lte: period.endDate } },
        include: { salaryComponent: true },
      },
    },
    orderBy: { firstName: "asc" },
  });

  const payableEmployees = employees.filter((employee) => employee.salaryStructure);
  if (payableEmployees.length === 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "No employees have salary structures configured",
    });
  }

  const totalWorkingDays = countWeekdays(period.startDate, period.endDate);
  const slipInputs = await Promise.all(
    payableEmployees.map(async (employee) => {
      const attendance = await db.attendanceRecord.findMany({
        where: {
          employeeId: employee.id,
          date: { gte: period.startDate, lte: period.endDate },
        },
        select: { status: true },
      });
      const presentDays = attendance.filter(
        (record) => record.status === "PRESENT",
      ).length;
      const halfDays =
        attendance.filter((record) => record.status === "HALF_DAY").length *
        0.5;
      const paidLeave = await db.leaveApplication.aggregate({
        where: {
          employeeId: employee.id,
          status: "APPROVED",
          leaveType: { isPaid: true },
          fromDate: { gte: period.startDate },
          toDate: { lte: period.endDate },
        },
        _sum: { totalDays: true },
      });
      const components = employee.employeeSalaryComponents.map((component) => ({
        id: component.salaryComponentId,
        type: component.salaryComponent.type,
        amount: Number(component.amount),
      }));
      const structure = employee.salaryStructure;
      if (!structure) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Salary structure missing",
        });
      }
      const result = calculatePayroll({
        basicSalary: Number(structure.basicSalary),
        hra: Number(structure.hra),
        components,
        totalWorkingDays,
        daysWorked: presentDays + halfDays,
        paidLeaveDays: Number(paidLeave._sum.totalDays ?? 0),
      });

      return {
        employeeId: employee.id,
        workingDays: presentDays,
        totalWorkingDays,
        paidLeaveDays: Number(paidLeave._sum.totalDays ?? 0),
        result,
      };
    }),
  );

  return db.$transaction(async (tx) => {
    const entry = await tx.payrollEntry.create({
      data: {
        payrollPeriodId: period.id,
        status: "SUBMITTED",
        totalGross: new Prisma.Decimal(
          slipInputs.reduce((sum, slip) => sum + slip.result.grossSalary, 0),
        ),
        totalDeductions: new Prisma.Decimal(
          slipInputs.reduce((sum, slip) => sum + slip.result.totalDeductions, 0),
        ),
        totalNet: new Prisma.Decimal(
          slipInputs.reduce((sum, slip) => sum + slip.result.netSalary, 0),
        ),
        paymentDate: new Date(),
        createdById: userId,
      },
    });

    for (const slip of slipInputs) {
      await tx.salarySlip.create({
        data: {
          payrollEntryId: entry.id,
          employeeId: slip.employeeId,
          payrollPeriodId: period.id,
          basicSalary: new Prisma.Decimal(slip.result.basicSalary),
          hra: new Prisma.Decimal(slip.result.hra),
          totalEarnings: new Prisma.Decimal(slip.result.totalEarnings),
          grossSalary: new Prisma.Decimal(slip.result.grossSalary),
          pfEmployee: new Prisma.Decimal(slip.result.pfEmployee),
          pfEmployer: new Prisma.Decimal(slip.result.pfEmployer),
          professionalTax: new Prisma.Decimal(slip.result.professionalTax),
          totalDeductions: new Prisma.Decimal(slip.result.totalDeductions),
          netSalary: new Prisma.Decimal(slip.result.netSalary),
          workingDays: slip.workingDays,
          totalWorkingDays: slip.totalWorkingDays,
          paidLeaveDays: new Prisma.Decimal(slip.paidLeaveDays),
          status: "SUBMITTED",
          slipDetails: {
            create: slip.result.lineItems.map((item) => ({
              salaryComponentId: item.salaryComponentId,
              amount: new Prisma.Decimal(item.amount),
              type: item.type,
            })),
          },
        },
      });
    }

    await tx.payrollPeriod.update({
      where: { id: period.id },
      data: { status: "COMPLETED" },
    });

    return entry;
  });
}

export async function getPayrollEntry(
  db: PrismaClient,
  userId: string,
  periodId: string,
) {
  const companyId = await getCompanyScope(db, userId);
  const createdByIds = await getCompanyUserIds(db, companyId);
  const period = await getPayrollPeriodById(db, periodId);

  if (!period || !createdByIds.includes(period.createdById)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Period not found" });
  }

  return period;
}

export async function getPayslipForUser(
  db: PrismaClient,
  userId: string,
  slipId: string,
  canViewAll: boolean,
) {
  const companyId = await getCompanyScope(db, userId);
  const slip = await getPayslipById(db, slipId);

  if (slip?.employee.companyId !== companyId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Payslip not found" });
  }

  if (!canViewAll && slip.employee.user.id !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }

  return slip;
}

export async function listMyPayslips(db: PrismaClient, userId: string) {
  const companyId = await getCompanyScope(db, userId);
  const employee = await db.employee.findFirst({
    where: { userId, companyId },
    select: { id: true },
  });

  if (!employee) {
    return [];
  }

  return db.salarySlip.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
    include: {
      payrollEntry: true,
      employee: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}
