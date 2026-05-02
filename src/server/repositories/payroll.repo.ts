import { type PrismaClient } from "../../../generated/prisma";

export function listPayrollPeriods(db: PrismaClient, createdByIds: string[]) {
  return db.payrollPeriod.findMany({
    where: { createdById: { in: createdByIds } },
    orderBy: { startDate: "desc" },
    include: {
      payrollEntries: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          totalGross: true,
          totalDeductions: true,
          totalNet: true,
          createdAt: true,
          salarySlips: { select: { id: true } },
        },
      },
    },
  });
}

export function getPayrollPeriodById(db: PrismaClient, id: string) {
  return db.payrollPeriod.findUnique({
    where: { id },
    include: {
      payrollEntries: {
        orderBy: { createdAt: "desc" },
        include: {
          salarySlips: {
            include: {
              employee: {
                include: {
                  user: { select: { loginId: true, email: true } },
                  department: { select: { name: true } },
                },
              },
            },
            orderBy: { employee: { firstName: "asc" } },
          },
        },
      },
    },
  });
}

export function getPayslipById(db: PrismaClient, id: string) {
  return db.salarySlip.findUnique({
    where: { id },
    include: {
      payrollEntry: true,
      employee: {
        include: {
          user: { select: { id: true, loginId: true, email: true, name: true } },
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
      slipDetails: {
        include: { salaryComponent: { select: { name: true } } },
        orderBy: { salaryComponent: { name: "asc" } },
      },
    },
  });
}
