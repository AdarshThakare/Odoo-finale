import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  roleProcedure,
} from "~/server/api/trpc";
import {
  createEmployeeForUser,
  getEmployeeForUser,
  listEmployeesForUser,
  updateEmployeeForUser,
} from "~/server/modules/employee/employee.service";

const createEmployeeSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Phone number is required").optional(),
  dateOfJoining: z.string().min(1, "Joining date is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  departmentId: z.string().min(1, "Department is required"),
  designationId: z.string().min(1, "Designation is required"),
  role: z
    .enum(["HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"])
    .default("EMPLOYEE"),
});

const updateEmployeeSchema = z.object({
  id: z.string().min(1, "Employee is required"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  departmentId: z.string().min(1, "Department is required"),
  designationId: z.string().min(1, "Designation is required"),
});

const creatorRoles = ["ADMIN", "HR_OFFICER"] as const;

export const employeeRouter = createTRPCRouter({
  list: roleProcedure([...creatorRoles])
    .input(
      z
        .object({
          departmentId: z.string().optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return listEmployeesForUser(ctx.db, ctx.session.user.id, input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1, "Employee is required") }))
    .query(async ({ ctx, input }) => {
      return getEmployeeForUser(ctx.db, ctx.session.user.id, input.id);
    }),

  create: roleProcedure([...creatorRoles])
    .input(createEmployeeSchema)
    .mutation(async ({ ctx, input }) => {
      return createEmployeeForUser(ctx.db, ctx.session.user.id, input);
    }),

  update: roleProcedure([...creatorRoles])
    .input(updateEmployeeSchema)
    .mutation(async ({ ctx, input }) => {
      return updateEmployeeForUser(ctx.db, ctx.session.user.id, input);
    }),
});
