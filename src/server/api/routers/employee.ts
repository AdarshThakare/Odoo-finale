import { z } from "zod";

<<<<<<< Updated upstream
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
=======
import { createTRPCRouter, roleProcedure } from "~/server/api/trpc";
import { fgaClient } from "~/lib/fga";
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
  update: roleProcedure([...creatorRoles])
    .input(updateEmployeeSchema)
    .mutation(async ({ ctx, input }) => {
      return updateEmployeeForUser(ctx.db, ctx.session.user.id, input);
=======
      const existing = await ctx.db.user.findFirst({
        where: {
          OR: [{ email: input.email }],
        },
        select: { id: true },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const company = await ctx.db.company.upsert({
        where: { code: "OI" },
        update: {},
        create: { name: "Odoo India", code: "OI" },
      });

      const joiningDate = new Date(input.dateOfJoining);
      const joiningYear = joiningDate.getUTCFullYear();
      const serial = await ctx.db.employee.count({
        where: {
          dateOfJoining: {
            gte: new Date(Date.UTC(joiningYear, 0, 1)),
            lt: new Date(Date.UTC(joiningYear + 1, 0, 1)),
          },
        },
      });

      const sequence = String(serial + 1).padStart(4, "0");
      const loginId = `${initials(input.firstName)}${initials(
        input.lastName,
      )}${joiningYear}${sequence}`;
      const employeeCode = `EMP-${joiningYear}-${sequence}`;
      const temporaryPassword = makeTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      const employee = await ctx.db.$transaction(async (tx) => {
        const department = await tx.department.upsert({
          where: { name: input.departmentName },
          update: { companyId: company.id },
          create: {
            name: input.departmentName,
            companyId: company.id,
          },
        });

        const designation = await tx.designation.upsert({
          where: {
            name_departmentId: {
              name: input.designationName,
              departmentId: department.id,
            },
          },
          update: {},
          create: {
            name: input.designationName,
            departmentId: department.id,
          },
        });

        return tx.employee.create({
          data: {
            employeeCode,
            company: { connect: { id: company.id } },
            firstName: input.firstName,
            lastName: input.lastName,
            dateOfJoining: joiningDate,
            gender: input.gender,
            phone: input.phone,
            department: { connect: { id: department.id } },
            designation: { connect: { id: designation.id } },
            user: {
              create: {
                email: input.email,
                loginId,
                passwordHash,
                name: `${input.firstName} ${input.lastName}`,
                role: input.role,
                company: { connect: { id: company.id } },
                mustChangePassword: true,
                temporaryPasswordIssuedAt: new Date(),
              },
            },
          },
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                id: true,
                email: true,
                loginId: true,
                role: true,
              },
            },
          },
        });
      });

      // Optional: Add an FGA check before this operation instead of roleProcedure
      // const isAuthorized = await fgaClient.check({ ... });

      // Sync FGA relationships
      const roleRelationMap: Record<string, string> = {
        'ADMIN': 'admin',
        'HR_OFFICER': 'hr_officer',
        'PAYROLL_OFFICER': 'payroll_officer',
        'EMPLOYEE': 'employee',
      };
      
      const relation = roleRelationMap[input.role];
      if (relation && employee.user) {
        try {
           await fgaClient.write({
            writes: [
              // Assign user their role in the company
              {
                user: `user:${employee.user.id}`,
                relation,
                object: `company:${company.id}`
              },
              // Assign user as owner of their profile
              {
                user: `user:${employee.user.id}`,
                relation: 'owner',
                object: `employee_profile:${employee.id}`
              },
              // Tie the profile to the company
              {
                user: `company:${company.id}`,
                relation: 'company',
                object: `employee_profile:${employee.id}`
              }
            ]
          });
        } catch (e) {
          console.error("OpenFGA write failed:", e);
        }
      }

      return {
        employee,
        credentials: {
          loginId,
          temporaryPassword,
        },
      };
>>>>>>> Stashed changes
    }),
});
