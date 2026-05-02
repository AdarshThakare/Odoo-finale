import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, roleProcedure } from "~/server/api/trpc";

const payrollRoles = ["ADMIN", "PAYROLL_OFFICER"] as const;

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

async function getCompanyId(ctx: { db: typeof import("~/server/db").db; session: { user: { id: string } } }) {
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
  listComponents: roleProcedure([...payrollRoles]).query(async ({ ctx }) => {
    return ctx.db.salaryComponent.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, isActive: true },
    });
  }),

  createComponent: roleProcedure([...payrollRoles])
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

  updateComponent: roleProcedure([...payrollRoles])
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

  setSalaryStructure: roleProcedure([...payrollRoles])
    .input(salaryStructureSchema)
    .mutation(async ({ ctx, input }) => {
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

  assignComponent: roleProcedure([...payrollRoles])
    .input(assignComponentSchema)
    .mutation(async ({ ctx, input }) => {
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
});
