import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  fgaCompanyProcedure,
} from "~/server/api/trpc";

const departmentSchema = z.object({
  name: z.string().min(2, "Department name is required"),
});

const designationSchema = z.object({
  departmentId: z.string().min(1, "Department is required"),
  name: z.string().min(2, "Designation name is required"),
});

export const settingsRouter = createTRPCRouter({
  /**
   * List all departments.
   * FGA: can_view_employee_directory on company:{companyId}
   */
  listDepartments: fgaCompanyProcedure("can_view_employee_directory").query(
    async ({ ctx }) => {
      return ctx.db.department.findMany({
        where: { companyId: ctx.companyId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: {
            select: { employees: true, designations: true },
          },
        },
      });
    },
  ),

  /**
   * Create a department.
   * FGA: can_manage_settings on company:{companyId}
   */
  createDepartment: fgaCompanyProcedure("can_manage_settings")
    .input(departmentSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.department.findFirst({
        where: { name: input.name, companyId: ctx.companyId },
        select: { id: true },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Department already exists",
        });
      }

      return ctx.db.department.create({
        data: { name: input.name, companyId: ctx.companyId },
        select: { id: true, name: true },
      });
    }),

  /**
   * Update a department.
   * FGA: can_manage_settings on company:{companyId}
   */
  updateDepartment: fgaCompanyProcedure("can_manage_settings")
    .input(
      z.object({
        id: z.string().min(1, "Department is required"),
        name: z.string().min(2, "Department name is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const department = await ctx.db.department.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        select: { id: true },
      });

      if (!department) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Department not found",
        });
      }

      const existing = await ctx.db.department.findFirst({
        where: { name: input.name, companyId: ctx.companyId },
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

  /**
   * Delete a department.
   * FGA: can_manage_settings on company:{companyId}
   */
  deleteDepartment: fgaCompanyProcedure("can_manage_settings")
    .input(z.object({ id: z.string().min(1, "Department is required") }))
    .mutation(async ({ ctx, input }) => {
      const department = await ctx.db.department.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
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

  /**
   * List all designations.
   * FGA: can_view_employee_directory on company:{companyId}
   */
  listDesignations: fgaCompanyProcedure("can_view_employee_directory")
    .input(z.object({ departmentId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const departmentFilter = input?.departmentId
        ? { departmentId: input.departmentId }
        : {};

      return ctx.db.designation.findMany({
        where: {
          ...departmentFilter,
          department: { companyId: ctx.companyId },
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

  /**
   * Create a designation.
   * FGA: can_manage_settings on company:{companyId}
   */
  createDesignation: fgaCompanyProcedure("can_manage_settings")
    .input(designationSchema)
    .mutation(async ({ ctx, input }) => {
      const department = await ctx.db.department.findFirst({
        where: { id: input.departmentId, companyId: ctx.companyId },
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

  /**
   * Update a designation.
   * FGA: can_manage_settings on company:{companyId}
   */
  updateDesignation: fgaCompanyProcedure("can_manage_settings")
    .input(
      z.object({
        id: z.string().min(1, "Designation is required"),
        name: z.string().min(2, "Designation name is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const designation = await ctx.db.designation.findFirst({
        where: { id: input.id, department: { companyId: ctx.companyId } },
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

  /**
   * Delete a designation.
   * FGA: can_manage_settings on company:{companyId}
   */
  deleteDesignation: fgaCompanyProcedure("can_manage_settings")
    .input(z.object({ id: z.string().min(1, "Designation is required") }))
    .mutation(async ({ ctx, input }) => {
      const designation = await ctx.db.designation.findFirst({
        where: { id: input.id, department: { companyId: ctx.companyId } },
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
