import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  fgaCompanyProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { checkAccess } from "~/lib/fga";
import { type PrismaClient } from "../../../../generated/prisma";
import {
  createPeriod,
  getPayrollEntry,
  getPayslipForUser,
  getSalaryStatement,
  listMyPayslips,
  listPeriods,
  runPayroll,
} from "~/server/modules/payroll/payroll.service";

const componentSchema = z.object({
  name: z.string().min(2, "Component name is required"),
  type: z.enum(["EARNING", "DEDUCTION"]),
});

const salaryStructureSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  basicSalary: z.number().nonnegative(),
  hra: z.number().nonnegative(),
  effectiveFrom: z.string().min(1, "Effective date is required"),
});

const assignComponentSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  salaryComponentId: z.string().min(1, "Component is required"),
  amount: z.number().nonnegative(),
  effectiveFrom: z.string().min(1, "Effective date is required"),
  isActive: z.boolean().optional(),
});

const periodSchema = z.object({
  name: z.string().min(2, "Period name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

async function getCompanyId(ctx: {
  db: PrismaClient;
  session: { user: { id: string } };
}) {
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
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

export const payrollRouter = createTRPCRouter({
  /**
   * List all salary components.
   * FGA: can_manage_payroll on company:{companyId}
   */
  listComponents: fgaCompanyProcedure("can_manage_payroll").query(
    async ({ ctx }) => {
      return ctx.db.salaryComponent.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, type: true, isActive: true },
      });
    },
  ),

  /**
   * Create a salary component.
   * FGA: can_manage_payroll on company:{companyId}
   */
  createComponent: fgaCompanyProcedure("can_manage_payroll")
    .input(componentSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.salaryComponent.findUnique({
        where: { name: input.name },
        select: { id: true },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Component already exists",
        });
      }

      return ctx.db.salaryComponent.create({
        data: { name: input.name, type: input.type },
        select: { id: true, name: true, type: true, isActive: true },
      });
    }),

  /**
   * Update a salary component.
   * FGA: can_manage_payroll on company:{companyId}
   */
  updateComponent: fgaCompanyProcedure("can_manage_payroll")
    .input(
      z.object({
        id: z.string().min(1, "Component is required"),
        name: z.string().min(2, "Component name is required").optional(),
        type: z.enum(["EARNING", "DEDUCTION"]).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const component = await ctx.db.salaryComponent.findUnique({
        where: { id: input.id },
        select: { id: true, name: true },
      });

      if (!component) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Component not found",
        });
      }

      if (input.name && input.name !== component.name) {
        const existing = await ctx.db.salaryComponent.findUnique({
          where: { name: input.name },
          select: { id: true },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Component name already exists",
          });
        }
      }

      return ctx.db.salaryComponent.update({
        where: { id: input.id },
        data: {
          name: input.name,
          type: input.type,
          isActive: input.isActive,
        },
        select: { id: true, name: true, type: true, isActive: true },
      });
    }),

  /**
   * Set an employee's salary structure.
   * FGA: can_edit_salary on employee_profile:{employeeId}
   */
  setSalaryStructure: protectedProcedure
    .input(salaryStructureSchema)
    .mutation(async ({ ctx, input }) => {
      // Resource-level FGA check: can the user edit this employee's salary?
      const allowed = await checkAccess(
        ctx.session.user.id,
        "can_edit_salary",
        "employee_profile",
        input.employeeId,
      );

      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this employee's salary",
        });
      }

      const companyId = await getCompanyId(ctx);
      const employee = await ctx.db.employee.findFirst({
        where: { id: input.employeeId, companyId },
        select: { id: true },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      return ctx.db.salaryStructure.upsert({
        where: { employeeId: input.employeeId },
        update: {
          basicSalary: input.basicSalary,
          hra: input.hra,
          effectiveFrom: new Date(input.effectiveFrom),
          isActive: true,
        },
        create: {
          employee: { connect: { id: input.employeeId } },
          basicSalary: input.basicSalary,
          hra: input.hra,
          effectiveFrom: new Date(input.effectiveFrom),
          isActive: true,
        },
        select: {
          id: true,
          basicSalary: true,
          hra: true,
          effectiveFrom: true,
          isActive: true,
        },
      });
    }),

  /**
   * Assign a salary component to an employee.
   * FGA: can_edit_salary on employee_profile:{employeeId}
   */
  assignComponent: protectedProcedure
    .input(assignComponentSchema)
    .mutation(async ({ ctx, input }) => {
      // Resource-level FGA check
      const allowed = await checkAccess(
        ctx.session.user.id,
        "can_edit_salary",
        "employee_profile",
        input.employeeId,
      );

      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this employee's salary",
        });
      }

      const companyId = await getCompanyId(ctx);
      const employee = await ctx.db.employee.findFirst({
        where: { id: input.employeeId, companyId },
        select: { id: true },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      const component = await ctx.db.salaryComponent.findUnique({
        where: { id: input.salaryComponentId },
        select: { id: true },
      });

      if (!component) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Component not found",
        });
      }

      return ctx.db.employeeSalaryComponent.upsert({
        where: {
          employeeId_salaryComponentId: {
            employeeId: input.employeeId,
            salaryComponentId: input.salaryComponentId,
          },
        },
        update: {
          amount: input.amount,
          effectiveFrom: new Date(input.effectiveFrom),
          isActive: input.isActive ?? true,
        },
        create: {
          employee: { connect: { id: input.employeeId } },
          salaryComponent: { connect: { id: input.salaryComponentId } },
          amount: input.amount,
          effectiveFrom: new Date(input.effectiveFrom),
          isActive: input.isActive ?? true,
        },
        select: {
          id: true,
          amount: true,
          effectiveFrom: true,
          isActive: true,
          salaryComponent: { select: { id: true, name: true, type: true } },
        },
      });
    }),

  /**
   * List all payroll periods.
   * FGA: can_manage_payroll on company:{companyId}
   */
  listPeriods: fgaCompanyProcedure("can_manage_payroll").query(({ ctx }) =>
    listPeriods(ctx.db, ctx.session.user.id),
  ),

  /**
   * Create a payroll period.
   * FGA: can_manage_payroll on company:{companyId}
   */
  createPeriod: fgaCompanyProcedure("can_manage_payroll")
    .input(periodSchema)
    .mutation(({ ctx, input }) =>
      createPeriod(ctx.db, ctx.session.user.id, input),
    ),

  /**
   * Run payroll for a period.
   * FGA: can_manage_payroll on company:{companyId}
   */
  runPayroll: fgaCompanyProcedure("can_manage_payroll")
    .input(z.object({ periodId: z.string().min(1, "Period is required") }))
    .mutation(({ ctx, input }) =>
      runPayroll(ctx.db, ctx.session.user.id, input.periodId),
    ),

  /**
   * Get payroll entry details for a period.
   * FGA: can_view_reports on company:{companyId}
   */
  getPayrollEntry: fgaCompanyProcedure("can_view_reports")
    .input(z.object({ periodId: z.string().min(1, "Period is required") }))
    .query(({ ctx, input }) =>
      getPayrollEntry(ctx.db, ctx.session.user.id, input.periodId),
    ),

  /**
   * Get a specific payslip.
   * FGA: can_view on salary_slip:{slipId}
   */
  getPayslip: protectedProcedure
    .input(z.object({ id: z.string().min(1, "Payslip is required") }))
    .query(async ({ ctx, input }) => {
      const allowed = await checkAccess(
        ctx.session.user.id,
        "can_view",
        "salary_slip",
        input.id,
      );

      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this payslip",
        });
      }

      return getPayslipForUser(
        ctx.db,
        ctx.session.user.id,
        input.id,
        // FGA already verified access — pass true for admin-level view
        true,
      );
    }),

  /**
   * List the current user's own payslips.
   * Self-service — no FGA check needed.
   */
  listMyPayslips: protectedProcedure.query(({ ctx }) =>
    listMyPayslips(ctx.db, ctx.session.user.id),
  ),

  /**
   * Get salary statement for a specific employee and year.
   * FGA: can_manage_payroll on company:{companyId}
   */
  getSalaryStatement: fgaCompanyProcedure("can_manage_payroll")
    .input(
      z.object({
        employeeId: z.string().min(1, "Employee is required"),
        year: z.number().int().min(2020).max(2100),
      }),
    )
    .query(({ ctx, input }) =>
      getSalaryStatement(ctx.db, ctx.session.user.id, input.employeeId, input.year),
    ),
});
