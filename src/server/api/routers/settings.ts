import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { type Role } from "../../../../generated/prisma";
import { replaceUserRole } from "~/lib/fga-sync";
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

const roleSchema = z.enum([
  "ADMIN",
  "HR_OFFICER",
  "PAYROLL_OFFICER",
  "EMPLOYEE",
]);

function requireAdmin(role: Role) {
  if (role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can manage user access",
    });
  }
}

export const settingsRouter = createTRPCRouter({
  /**
   * List users in the current company for Admin User Settings.
   */
  listUsers: fgaCompanyProcedure("can_manage_settings").query(async ({ ctx }) => {
    requireAdmin(ctx.session.user.role);

    return ctx.db.user.findMany({
      where: { companyId: ctx.companyId },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        loginId: true,
        role: true,
        isActive: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        },
      },
    });
  }),

  /**
   * Update a user's company role.
   */
  updateUserRole: fgaCompanyProcedure("can_manage_settings")
    .input(
      z.object({
        userId: z.string().min(1, "User is required"),
        role: roleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role);

      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role from User Settings",
        });
      }

      const user = await ctx.db.user.findFirst({
        where: { id: input.userId, companyId: ctx.companyId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const updated = await ctx.db.user.update({
        where: { id: user.id },
        data: { role: input.role },
        select: {
          id: true,
          name: true,
          email: true,
          loginId: true,
          role: true,
          isActive: true,
        },
      });

      try {
        await replaceUserRole(updated.id, input.role, ctx.companyId);
      } catch (error) {
        console.warn("[FGA] Failed to replace user role tuple:", error);
      }

      return updated;
    }),

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
