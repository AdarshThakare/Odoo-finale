import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, roleProcedure } from "~/server/api/trpc";
import { type PrismaClient } from "../../../../generated/prisma";

const adminRoles = ["ADMIN"] as const;
const managerRoles = ["ADMIN", "HR_OFFICER"] as const;

const departmentSchema = z.object({
  name: z.string().min(2, "Department name is required"),
});

const designationSchema = z.object({
  departmentId: z.string().min(1, "Department is required"),
  name: z.string().min(2, "Designation name is required"),
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

export const settingsRouter = createTRPCRouter({
  listDepartments: roleProcedure([...managerRoles]).query(async ({ ctx }) => {
    const companyId = await getCompanyId(ctx);
    return ctx.db.department.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: {
          select: { employees: true, designations: true },
        },
      },
    });
  }),

  createDepartment: roleProcedure([...adminRoles])
    .input(departmentSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx);

      const existing = await ctx.db.department.findFirst({
        where: { name: input.name, companyId },
        select: { id: true },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Department already exists",
        });
      }

      return ctx.db.department.create({
        data: { name: input.name, companyId },
        select: { id: true, name: true },
      });
    }),

  updateDepartment: roleProcedure([...adminRoles])
    .input(
      z.object({
        id: z.string().min(1, "Department is required"),
        name: z.string().min(2, "Department name is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx);

      const department = await ctx.db.department.findFirst({
        where: { id: input.id, companyId },
        select: { id: true },
      });

      if (!department) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Department not found",
        });
      }

      const existing = await ctx.db.department.findFirst({
        where: { name: input.name, companyId },
        select: { id: true },
      });

      if (existing && existing.id !== input.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Department name already in use",
        });
      }

      return ctx.db.department.update({
        where: { id: input.id },
        data: { name: input.name },
        select: { id: true, name: true },
      });
    }),

  deleteDepartment: roleProcedure([...adminRoles])
    .input(z.object({ id: z.string().min(1, "Department is required") }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx);

      const department = await ctx.db.department.findFirst({
        where: { id: input.id, companyId },
        select: { id: true },
      });

      if (!department) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Department not found",
        });
      }

      const employeeCount = await ctx.db.employee.count({
        where: { departmentId: input.id },
      });

      if (employeeCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Department has employees assigned",
        });
      }

      const designationCount = await ctx.db.designation.count({
        where: { departmentId: input.id },
      });

      if (designationCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Department has designations assigned",
        });
      }

      await ctx.db.department.delete({ where: { id: input.id } });
      return { success: true };
    }),

  listDesignations: roleProcedure([...managerRoles])
    .input(z.object({ departmentId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx);
      const departmentFilter = input?.departmentId
        ? { departmentId: input.departmentId }
        : {};

      return ctx.db.designation.findMany({
        where: {
          ...departmentFilter,
          department: { companyId },
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          department: { select: { id: true, name: true } },
          _count: { select: { employees: true } },
        },
      });
    }),

  createDesignation: roleProcedure([...adminRoles])
    .input(designationSchema)
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx);
      const department = await ctx.db.department.findFirst({
        where: { id: input.departmentId, companyId },
        select: { id: true },
      });

      if (!department) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Department not found",
        });
      }

      const existing = await ctx.db.designation.findFirst({
        where: {
          name: input.name,
          departmentId: input.departmentId,
        },
        select: { id: true },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Designation already exists",
        });
      }

      return ctx.db.designation.create({
        data: { name: input.name, departmentId: input.departmentId },
        select: { id: true, name: true },
      });
    }),

  updateDesignation: roleProcedure([...adminRoles])
    .input(
      z.object({
        id: z.string().min(1, "Designation is required"),
        name: z.string().min(2, "Designation name is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx);
      const designation = await ctx.db.designation.findFirst({
        where: { id: input.id, department: { companyId } },
        select: { id: true, departmentId: true },
      });

      if (!designation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Designation not found",
        });
      }

      const existing = await ctx.db.designation.findFirst({
        where: {
          name: input.name,
          departmentId: designation.departmentId,
        },
        select: { id: true },
      });

      if (existing && existing.id !== input.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Designation name already in use",
        });
      }

      return ctx.db.designation.update({
        where: { id: input.id },
        data: { name: input.name },
        select: { id: true, name: true },
      });
    }),

  deleteDesignation: roleProcedure([...adminRoles])
    .input(z.object({ id: z.string().min(1, "Designation is required") }))
    .mutation(async ({ ctx, input }) => {
      const companyId = await getCompanyId(ctx);
      const designation = await ctx.db.designation.findFirst({
        where: { id: input.id, department: { companyId } },
        select: { id: true },
      });

      if (!designation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Designation not found",
        });
      }

      const employeeCount = await ctx.db.employee.count({
        where: { designationId: input.id },
      });

      if (employeeCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Designation has employees assigned",
        });
      }

      await ctx.db.designation.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
