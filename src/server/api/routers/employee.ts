import { z } from "zod";

import {
  createTRPCRouter,
  companyPermissionProcedure,
  protectedProcedure,
  requirePermission,
} from "~/server/api/trpc";
import {
  createEmployeeForUser,
  getEmployeeForUser,
  getMyProfileForUser,
  listEmployeesForUser,
  updateMyProfileForUser,
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

const updateMyProfileSchema = z.object({
  name: z.string().min(2, "Name is required").optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
  resumeUrl: z.string().url("Invalid resume URL").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  personalEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  nationality: z.string().optional(),
  maritalStatus: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  managerName: z.string().optional(),
  workLocation: z.string().optional(),
  about: z.string().optional(),
  jobInterests: z.string().optional(),
  skills: z.string().optional(),
  certifications: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  panNumber: z.string().optional(),
  uanNumber: z.string().optional(),
});

export const employeeRouter = createTRPCRouter({
  /**
   * List all employees in the company.
   * RBAC: can_view_employee_directory on company:{companyId}
   */
  list: companyPermissionProcedure("can_view_employee_directory")
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

  /**
   * Get a single employee profile by ID.
   * RBAC: can_view on employee_profile:{employeeId}
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1, "Employee is required") }))
    .query(async ({ ctx, input }) => {
      requirePermission(ctx.session.user.role, "can_view_employee_profile");
      return getEmployeeForUser(ctx.db, ctx.session.user.id, input.id);
    }),

  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    return getMyProfileForUser(ctx.db, ctx.session.user.id);
  }),

  /**
   * Create a new employee.
   * RBAC: can_manage_employees on company:{companyId}
   */
  create: companyPermissionProcedure("can_manage_employees")
    .input(createEmployeeSchema)
    .mutation(async ({ ctx, input }) => {
      return createEmployeeForUser(ctx.db, ctx.session.user.id, input);
    }),

  /**
   * Update an existing employee's details.
   * RBAC: can_edit_details on employee_profile:{employeeId}
   */
  update: protectedProcedure
    .input(updateEmployeeSchema)
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.session.user.role, "can_edit_employee_details");
      return updateEmployeeForUser(ctx.db, ctx.session.user.id, input);
    }),

  updateMyProfile: protectedProcedure
    .input(updateMyProfileSchema)
    .mutation(async ({ ctx, input }) => {
      return updateMyProfileForUser(ctx.db, ctx.session.user.id, input);
    }),
});
